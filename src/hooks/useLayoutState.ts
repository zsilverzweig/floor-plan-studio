import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  FloorPlan,
  FurnitureItem,
  LayoutSnapshot,
  LengthUnit,
  Point,
  ScaleCalibration,
  ScaleDetectionStatus,
  SavedFloorPlanRecord,
  SavedFloorPlanSummary,
  ToolMode,
} from '../types'
import { deleteFloorPlan, getFloorPlan, getFloorPlanDocument, listFloorPlanSummaries, putFloorPlan } from '../db/floorPlanFirestore'
import { seedDefaultFloorPlanIfEmpty } from '../db/seedFloorPlans'
import { isFirebaseConfigured } from '../firebase/config'
import { detectScaleBarFromUrl } from '../utils/detectScaleBar'
import { debugError, debugLog, debugWarn } from '../utils/debugLog'
import type { FurnitureCatalogEntry } from '../data/furnitureCatalog'
import { FURNITURE_CATALOG } from '../data/furnitureCatalog'
import { useHistory } from './useHistory'
import {
  clearGroupFields,
  getGroupMemberIds,
  normalizeGroups,
  resolveMoveIds,
} from '../utils/furnitureGroups'
import { moveItemsBackward, moveItemsForward, moveItemsToBack, moveItemsToFront } from '../utils/furnitureLayers'
import { promptDimension } from '../utils/promptDimension'
import { resolveFootprintShape } from '../utils/furnitureShapes'
import {
  cloneLayout,
  describeCalibration,
  describeFurniturePatch,
  describeUnitChange,
  EMPTY_LAYOUT,
} from '../utils/layoutHistory'

import { applyFurniturePatch, FURNITURE_COLOR_SWATCHES } from '../utils/furnitureAppearance'

const LAST_OPENED_KEY = 'floor-plan-studio:lastOpenedPlanId'

function getLastOpenedPlanId(): string | null {
  return localStorage.getItem(LAST_OPENED_KEY)
}

function setLastOpenedPlanId(id: string): void {
  localStorage.setItem(LAST_OPENED_KEY, id)
}

function randomColor() {
  return FURNITURE_COLOR_SWATCHES[Math.floor(Math.random() * FURNITURE_COLOR_SWATCHES.length)]
}

function loadImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

function deriveScaleStatus(layout: LayoutSnapshot): ScaleDetectionStatus {
  return layout.calibration ? 'found' : 'failed'
}

type PlanSaveContext = Pick<
  SavedFloorPlanRecord,
  'id' | 'width' | 'height' | 'imageBlob' | 'imageStoragePath' | 'imageContentType' | 'createdAt'
>

function toPlanSaveContext(record: SavedFloorPlanRecord): PlanSaveContext {
  return {
    id: record.id,
    width: record.width,
    height: record.height,
    imageBlob: record.imageBlob,
    imageStoragePath: record.imageStoragePath,
    imageContentType: record.imageContentType,
    createdAt: record.createdAt,
  }
}

export function useLayoutState() {
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedIdsRef = useRef<string[]>([])
  selectedIdsRef.current = selectedIds
  const [toolMode, setToolMode] = useState<ToolMode>('select')
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([])
  const [scaleDetectionStatus, setScaleDetectionStatus] = useState<ScaleDetectionStatus>('idle')
  const [scaleDetectionMessage, setScaleDetectionMessage] = useState<string | null>(null)
  const [savedPlans, setSavedPlans] = useState<SavedFloorPlanSummary[]>([])
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [activePlanName, setActivePlanName] = useState('')
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [openingPlanId, setOpeningPlanId] = useState<string | null>(null)
  const [planLoadError, setPlanLoadError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const imageUrlRef = useRef<string | null>(null)
  const skipSaveRef = useRef(true)
  const saveInFlightRef = useRef(false)
  const pendingSaveRef = useRef(false)
  const planSaveContextRef = useRef<PlanSaveContext | null>(null)
  const activePlanIdRef = useRef<string | null>(null)
  const activePlanNameRef = useRef('')
  const scaleDetectionMessageRef = useRef<string | null>(null)
  const floorPlanRef = useRef<FloorPlan | null>(null)

  activePlanIdRef.current = activePlanId
  activePlanNameRef.current = activePlanName
  scaleDetectionMessageRef.current = scaleDetectionMessage
  floorPlanRef.current = floorPlan

  const {
    present,
    entries: historyEntries,
    index: historyIndex,
    push,
    pushCoalesced,
    undo,
    redo,
    jumpTo,
    reset,
    canUndo,
    canRedo,
  } = useHistory<LayoutSnapshot>(EMPTY_LAYOUT)

  const layoutRef = useRef(present)
  layoutRef.current = present

  const furniture = present.furniture
  const calibration = present.calibration
  const unit = present.unit

  const revokeImageUrl = useCallback(() => {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current)
      imageUrlRef.current = null
    }
  }, [])

  const refreshSavedPlans = useCallback(async () => {
    debugLog('refreshSavedPlans', 'listing floor plan summaries…')
    const plans = await listFloorPlanSummaries()
    debugLog('refreshSavedPlans', 'loaded summaries', {
      count: plans.length,
      names: plans.map((p) => p.name),
    })
    setSavedPlans(plans)
    return plans
  }, [])

  const persistCurrentPlan = useCallback(async () => {
    const planId = activePlanIdRef.current
    if (!planId || !floorPlanRef.current || skipSaveRef.current) return

    if (saveInFlightRef.current) {
      pendingSaveRef.current = true
      return
    }

    let ctx = planSaveContextRef.current
    if (!ctx || ctx.id !== planId) {
      const doc = await getFloorPlanDocument(planId)
      if (!doc) {
        debugWarn('persistCurrentPlan', 'plan document missing in Firestore', { planId })
        return
      }
      ctx = {
        id: doc.id,
        width: doc.width,
        height: doc.height,
        imageBlob: planSaveContextRef.current?.imageBlob ?? new Blob(),
        imageStoragePath: doc.imageStoragePath,
        imageContentType: doc.imageContentType,
        createdAt: doc.createdAt,
      }
      planSaveContextRef.current = ctx
    }

    saveInFlightRef.current = true
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const updated: SavedFloorPlanRecord = {
        ...ctx,
        name: activePlanNameRef.current,
        layout: cloneLayout(layoutRef.current),
        scaleDetectionMessage: scaleDetectionMessageRef.current,
        updatedAt: Date.now(),
      }
      await putFloorPlan(updated)
      await refreshSavedPlans()
      setSaveStatus('saved')
    } catch (error) {
      debugError('persistCurrentPlan', 'failed', error)
      setSaveStatus('error')
      setSaveError(error instanceof Error ? error.message : 'Save failed')
    } finally {
      saveInFlightRef.current = false
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false
        void persistCurrentPlan()
      }
    }
  }, [refreshSavedPlans])

  const openSavedPlanRecord = useCallback(
    async (record: SavedFloorPlanRecord) => {
      debugLog('openSavedPlanRecord', 'applying record to canvas', {
        id: record.id,
        name: record.name,
        width: record.width,
        height: record.height,
        imageBlobBytes: record.imageBlob.size,
        furnitureCount: record.layout.furniture.length,
      })
      skipSaveRef.current = true
      if (activePlanIdRef.current && activePlanIdRef.current !== record.id) {
        debugLog('openSavedPlanRecord', 'persisting previous plan before switch', {
          fromId: activePlanIdRef.current,
          toId: record.id,
        })
        await persistCurrentPlan()
      }

      revokeImageUrl()
      const imageUrl = URL.createObjectURL(record.imageBlob)
      imageUrlRef.current = imageUrl

      setFloorPlan({ imageUrl, width: record.width, height: record.height })
      reset(cloneLayout(record.layout), `Opened ${record.name}`)
      setActivePlanId(record.id)
      setActivePlanName(record.name)
      setCalibrationPoints([])
      setSelectedIds([])
      setToolMode('select')
      setScaleDetectionMessage(record.scaleDetectionMessage)
      setScaleDetectionStatus(deriveScaleStatus(record.layout))
      setLastOpenedPlanId(record.id)

      planSaveContextRef.current = toPlanSaveContext(record)
      skipSaveRef.current = false
      setSaveStatus('saved')
      debugLog('openSavedPlanRecord', 'plan open complete', { id: record.id, name: record.name })
    },
    [persistCurrentPlan, reset, revokeImageUrl],
  )

  const openSavedPlan = useCallback(
    async (id: string, source: 'init' | 'sidebar' | 'delete-fallback' = 'sidebar') => {
      debugLog('openSavedPlan', 'start', { id, source, activePlanId: activePlanIdRef.current })
      setPlanLoading(true)
      setOpeningPlanId(id)
      setPlanLoadError(null)
      try {
        const started = performance.now()
        const record = await getFloorPlan(id)
        debugLog('openSavedPlan', 'getFloorPlan returned', {
          id,
          found: !!record,
          elapsedMs: Math.round(performance.now() - started),
        })
        if (!record) {
          debugWarn('openSavedPlan', 'plan document missing in Firestore', { id })
          const message = 'That floor plan no longer exists in Firestore.'
          setPlanLoadError(message)
          setDbError(message)
          return
        }
        await openSavedPlanRecord(record)
        setDbError(null)
        setPlanLoadError(null)
        debugLog('openSavedPlan', 'success', { id, name: record.name, source })
      } catch (error) {
        debugError('openSavedPlan', 'failed', error)
        const message =
          error instanceof Error
            ? error.message
            : 'Could not load the floor plan image from Storage.'
        setPlanLoadError(message)
        setDbError(message)
      } finally {
        setPlanLoading(false)
        setOpeningPlanId(null)
      }
    },
    [openSavedPlanRecord],
  )

  const createSavedPlan = useCallback(
    async (file: File, name: string) => {
      skipSaveRef.current = true
      if (activePlanIdRef.current) {
        await persistCurrentPlan()
      }

      const imageBlob = file.slice(0, file.size, file.type)
      const { width, height } = await loadImageDimensions(imageBlob)

      revokeImageUrl()
      const imageUrl = URL.createObjectURL(imageBlob)
      imageUrlRef.current = imageUrl

      setFloorPlan({ imageUrl, width, height })
      reset(EMPTY_LAYOUT, `Created ${name}`)
      setCalibrationPoints([])
      setSelectedIds([])
      setToolMode('select')
      setScaleDetectionStatus('detecting')
      setScaleDetectionMessage('Scanning for graphic scale bar…')

      let layout = EMPTY_LAYOUT
      let detectionMessage: string | null = null
      let detectionStatus: ScaleDetectionStatus = 'failed'

      const result = await detectScaleBarFromUrl(imageUrl)
      if (result) {
        layout = {
          furniture: [],
          calibration: result.calibration,
          unit: 'ft',
        }
        detectionStatus = 'found'
        const barWidth = result.calibration.pointB.x - result.calibration.pointA.x
        const pxPerUnit = barWidth / result.calibration.realDistance
        detectionMessage = `Detected ${result.calibration.realDistance}' scale bar (${pxPerUnit.toFixed(1)} px/ft, ${Math.round(result.confidence * 100)}% confidence${result.labelText ? `, read "${result.labelText}"` : ''})`
        reset(layout, describeCalibration(result.calibration, 'auto'))
      } else {
        detectionMessage =
          'No scale bar found — set scale manually by clicking two known points.'
      }

      setScaleDetectionMessage(detectionMessage)
      setScaleDetectionStatus(detectionStatus)

      const now = Date.now()
      const record: SavedFloorPlanRecord = {
        id: crypto.randomUUID(),
        name,
        width,
        height,
        imageBlob,
        imageContentType: file.type || 'image/jpeg',
        layout: cloneLayout(layout),
        scaleDetectionMessage: detectionMessage,
        createdAt: now,
        updatedAt: now,
      }

      try {
        await putFloorPlan(record)
        setLastOpenedPlanId(record.id)
        planSaveContextRef.current = toPlanSaveContext(record)
        await refreshSavedPlans()

        setActivePlanId(record.id)
        setActivePlanName(name)
        skipSaveRef.current = false
        setSaveStatus('saved')
      } catch (error) {
        debugError('createSavedPlan', 'failed', error)
        skipSaveRef.current = false
        setSaveStatus('error')
        setSaveError(error instanceof Error ? error.message : 'Save failed')
      }
    },
    [persistCurrentPlan, refreshSavedPlans, reset, revokeImageUrl],
  )

  const openSavedPlanRef = useRef(openSavedPlan)
  openSavedPlanRef.current = openSavedPlan
  const refreshSavedPlansRef = useRef(refreshSavedPlans)
  refreshSavedPlansRef.current = refreshSavedPlans

  useEffect(() => {
    let cancelled = false

    async function initDb() {
      debugLog('initDb', 'starting')
      try {
        if (!isFirebaseConfigured()) {
          throw new Error(
            'Firebase is not configured. Copy .env.example to .env and add your Firebase project credentials.',
          )
        }

        // Unblock the workspace immediately — plan list/image load separately.
        setDbReady(true)
        setDbError(null)

        debugLog('initDb', 'Firebase configured, seeding if empty…')
        await seedDefaultFloorPlanIfEmpty()
        const plans = await refreshSavedPlansRef.current()
        if (cancelled) {
          debugWarn('initDb', 'cancelled after refreshSavedPlans')
          return
        }

        debugLog('initDb', 'plans loaded', { planCount: plans.length })

        const lastOpenedId = getLastOpenedPlanId()
        const planToOpen =
          (lastOpenedId ? plans.find((p) => p.id === lastOpenedId) : null) ?? plans[0]

        debugLog('initDb', 'plan to open on startup', {
          lastOpenedId,
          planToOpen: planToOpen ? { id: planToOpen.id, name: planToOpen.name } : null,
        })

        if (planToOpen && !cancelled) {
          await openSavedPlanRef.current(planToOpen.id, 'init')
        }
        debugLog('initDb', 'complete')
      } catch (error) {
        debugError('initDb', 'failed', error)
        if (!cancelled) {
          setDbError(error instanceof Error ? error.message : 'Failed to initialize local storage')
          setDbReady(true)
        }
      }
    }

    void initDb()

    return () => {
      debugLog('initDb', 'effect cleanup (cancelled=true)')
      cancelled = true
    }
    // Run once on mount — openSavedPlan must not be a dep (it changes when a plan loads).
  }, [revokeImageUrl])

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = prev.filter((id) => furniture.some((f) => f.id === id))
      return next.length === prev.length ? prev : next
    })
  }, [furniture])

  const selectFurniture = useCallback((id: string | null, additive = false) => {
    if (id === null) {
      selectedIdsRef.current = []
      setSelectedIds([])
      return
    }
    if (additive) {
      setSelectedIds((prev) => {
        const next = prev.includes(id)
          ? prev.filter((itemId) => itemId !== id)
          : [...prev, id]
        selectedIdsRef.current = next
        return next
      })
    } else {
      const next = getGroupMemberIds(layoutRef.current.furniture, id)
      selectedIdsRef.current = next
      setSelectedIds(next)
    }
  }, [])

  const clearSelection = useCallback(() => {
    selectedIdsRef.current = []
    setSelectedIds([])
  }, [])

  useEffect(() => {
    if (!dbReady || !activePlanId || skipSaveRef.current) return

    setSaveStatus('idle')
    const timer = window.setTimeout(() => {
      void persistCurrentPlan()
    }, 900)

    return () => window.clearTimeout(timer)
  }, [present, activePlanId, dbReady, activePlanName, scaleDetectionMessage, persistCurrentPlan])

  useEffect(() => {
    return () => {
      if (activePlanIdRef.current) {
        void persistCurrentPlan()
      }
    }
  }, [persistCurrentPlan])

  const applyLayout = useCallback(
    (next: LayoutSnapshot, label: string, coalesce = false) => {
      const snapshot = cloneLayout(next)
      if (coalesce) {
        pushCoalesced(snapshot, label)
      } else {
        push(snapshot, label)
      }
    },
    [push, pushCoalesced],
  )

  const moveFurnitureGroup = useCallback(
    (draggedId: string, x: number, y: number) => {
      const items = layoutRef.current.furniture
      const dragged = items.find((f) => f.id === draggedId)
      if (!dragged) return

      const idsToMove = resolveMoveIds(items, draggedId, selectedIdsRef.current)
      const dx = x - dragged.x
      const dy = y - dragged.y
      if (dx === 0 && dy === 0) return

      applyLayout(
        {
          ...layoutRef.current,
          furniture: items.map((f) =>
            idsToMove.includes(f.id) ? { ...f, x: f.x + dx, y: f.y + dy } : f,
          ),
        },
        idsToMove.length > 1
          ? `Moved ${idsToMove.length} items`
          : describeFurniturePatch({ x, y }, dragged),
      )
    },
    [applyLayout],
  )

  const groupSelectedFurniture = useCallback(
    (label?: string) => {
      const ids = selectedIdsRef.current
      if (ids.length < 2) return

      const groupId = crypto.randomUUID()
      const groupLabel = label?.trim() || `Group (${ids.length})`

      applyLayout(
        {
          ...layoutRef.current,
          furniture: layoutRef.current.furniture.map((item) =>
            ids.includes(item.id) ? { ...item, groupId, groupLabel } : item,
          ),
        },
        `Grouped as ${groupLabel}`,
      )
    },
    [applyLayout],
  )

  const ungroupSelectedFurniture = useCallback(() => {
    const ids = new Set(selectedIdsRef.current)
    if (ids.size === 0) return

    let changed = false
    const furniture = layoutRef.current.furniture.map((item) => {
      if (item.groupId && ids.has(item.id)) {
        changed = true
        return clearGroupFields(item)
      }
      return item
    })
    if (!changed) return

    applyLayout(
      { ...layoutRef.current, furniture: normalizeGroups(furniture) },
      'Ungrouped items',
    )
  }, [applyLayout])

  const renameGroup = useCallback(
    (groupId: string, label: string) => {
      const groupLabel = label.trim()
      if (!groupLabel) return

      applyLayout(
        {
          ...layoutRef.current,
          furniture: layoutRef.current.furniture.map((item) =>
            item.groupId === groupId ? { ...item, groupLabel } : item,
          ),
        },
        `Renamed group to ${groupLabel}`,
      )
    },
    [applyLayout],
  )

  const runScaleDetection = useCallback(
    async (url: string, source: 'initial' | 'retry' = 'initial') => {
      setScaleDetectionStatus('detecting')
      setScaleDetectionMessage('Scanning for graphic scale bar…')

      const result = await detectScaleBarFromUrl(url)

      if (result) {
        const next: LayoutSnapshot = {
          ...layoutRef.current,
          calibration: result.calibration,
          unit: 'ft',
        }
        applyLayout(
          next,
          describeCalibration(result.calibration, source === 'retry' ? 'retry' : 'auto'),
        )
        setScaleDetectionStatus('found')
        const barWidth = result.calibration.pointB.x - result.calibration.pointA.x
        const pxPerUnit = barWidth / result.calibration.realDistance
        setScaleDetectionMessage(
          `Detected ${result.calibration.realDistance}' scale bar (${pxPerUnit.toFixed(1)} px/ft, ${Math.round(result.confidence * 100)}% confidence${result.labelText ? `, read "${result.labelText}"` : ''})`,
        )
      } else {
        setScaleDetectionStatus('failed')
        setScaleDetectionMessage('No scale bar found — set scale manually by clicking two known points.')
      }
    },
    [applyLayout],
  )

  const loadFloorPlan = useCallback(
    (file: File) => {
      const baseName = file.name.replace(/\.[^.]+$/, '').trim() || 'Untitled floor plan'
      void createSavedPlan(file, baseName)
    },
    [createSavedPlan],
  )

  const renameActivePlan = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed || !activePlanId) return
      setActivePlanName(trimmed)
    },
    [activePlanId],
  )

  const deleteSavedPlan = useCallback(
    async (id: string) => {
      await deleteFloorPlan(id)
      const plans = await refreshSavedPlans()

      if (activePlanIdRef.current !== id) return

      revokeImageUrl()
      setFloorPlan(null)
      setActivePlanId(null)
      setActivePlanName('')
      planSaveContextRef.current = null
      reset(EMPTY_LAYOUT, 'Closed floor plan')

      if (plans[0]) {
        await openSavedPlan(plans[0].id)
      }
    },
    [openSavedPlan, refreshSavedPlans, reset, revokeImageUrl],
  )

  const startCalibration = useCallback(() => {
    setToolMode('calibrate')
    setCalibrationPoints([])
    setSelectedIds([])
  }, [])

  const cancelCalibration = useCallback(() => {
    setToolMode('select')
    setCalibrationPoints([])
  }, [])

  const addCalibrationPoint = useCallback((point: Point) => {
    setCalibrationPoints((prev) => {
      if (prev.length >= 2) return prev
      return [...prev, point]
    })
  }, [])

  const finishCalibration = useCallback(
    (realDistance: number) => {
      if (calibrationPoints.length !== 2 || realDistance <= 0) return
      const newCalibration: ScaleCalibration = {
        pointA: calibrationPoints[0],
        pointB: calibrationPoints[1],
        realDistance,
        unit,
        source: 'manual',
      }
      applyLayout(
        { ...layoutRef.current, calibration: newCalibration },
        describeCalibration(newCalibration, 'manual'),
      )
      setToolMode('select')
      setCalibrationPoints([])
      setScaleDetectionStatus('found')
      setScaleDetectionMessage(`Manual scale: ${realDistance} ${unit}`)
    },
    [applyLayout, calibrationPoints, unit],
  )

  const retryScaleDetection = useCallback(() => {
    if (floorPlan) void runScaleDetection(floorPlan.imageUrl, 'retry')
  }, [floorPlan, runScaleDetection])

  const setUnit = useCallback(
    (nextUnit: LengthUnit) => {
      if (nextUnit === layoutRef.current.unit) return
      applyLayout({ ...layoutRef.current, unit: nextUnit }, describeUnitChange(nextUnit))
    },
    [applyLayout],
  )

  const addFurniture = useCallback(
    (item: Omit<FurnitureItem, 'id' | 'x' | 'y' | 'rotation' | 'color'> & { color?: string }) => {
      if (!floorPlan) return
      const id = crypto.randomUUID()
      const newItem: FurnitureItem = {
        ...item,
        id,
        x: floorPlan.width / 2 + (layoutRef.current.furniture.length % 5) * 24,
        y: floorPlan.height / 2 + Math.floor(layoutRef.current.furniture.length / 5) * 24,
        rotation: 0,
        color: item.color ?? randomColor(),
      }
      applyLayout(
        { ...layoutRef.current, furniture: [...layoutRef.current.furniture, newItem] },
        `Added ${item.label ?? item.name}`,
      )
      setSelectedIds([id])
    },
    [applyLayout, floorPlan],
  )

  const addFromCatalog = useCallback(
    (entry: FurnitureCatalogEntry) => {
      addFurniture({
        name: entry.name,
        label: entry.label,
        catalogId: entry.id,
        width: entry.width,
        depth: entry.depth,
        textureUrl: entry.textureUrl,
        color: entry.color,
        kind: entry.kind,
        shape: entry.shape,
        type: entry.type,
        room: entry.room,
        status: entry.status,
      })
    },
    [addFurniture],
  )

  const addAllCatalog = useCallback(() => {
    if (!floorPlan) return
    const items: FurnitureItem[] = FURNITURE_CATALOG.map((entry, i) => ({
      id: crypto.randomUUID(),
      name: entry.name,
      label: entry.label,
      catalogId: entry.id,
      width: entry.width,
      depth: entry.depth,
      textureUrl: entry.textureUrl,
      color: entry.color,
      kind: entry.kind,
      shape: entry.shape,
      type: entry.type,
      room: entry.room,
      status: entry.status,
      x: floorPlan.width * 0.15 + (i % 6) * 40,
      y: floorPlan.height * 0.15 + Math.floor(i / 6) * 40,
      rotation: 0,
    }))
    applyLayout(
      { ...layoutRef.current, furniture: items },
      `Added all catalog items (${items.length})`,
    )
    setSelectedIds(items[0] ? [items[0].id] : [])
  }, [applyLayout, floorPlan])

  const updateFurniture = useCallback(
    (id: string, patch: Partial<FurnitureItem>, coalesce = false) => {
      const item = layoutRef.current.furniture.find((f) => f.id === id)
      const next: LayoutSnapshot = {
        ...layoutRef.current,
        furniture: layoutRef.current.furniture.map((f) =>
          f.id === id ? (applyFurniturePatch(f, patch) as FurnitureItem) : f,
        ),
      }
      applyLayout(next, describeFurniturePatch(patch, item), coalesce)
    },
    [applyLayout],
  )

  const deleteFurniture = useCallback(
    (id: string) => {
      const item = layoutRef.current.furniture.find((f) => f.id === id)
      applyLayout(
        {
          ...layoutRef.current,
          furniture: normalizeGroups(
            layoutRef.current.furniture.filter((f) => f.id !== id),
          ),
        },
        `Deleted ${item?.label ?? item?.name ?? 'item'}`,
      )
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id))
    },
    [applyLayout],
  )

  const deleteSelectedFurniture = useCallback(() => {
    const ids = selectedIdsRef.current
    if (ids.length === 0) return
    applyLayout(
      {
        ...layoutRef.current,
        furniture: normalizeGroups(
          layoutRef.current.furniture.filter((f) => !ids.includes(f.id)),
        ),
      },
      `Deleted ${ids.length} item${ids.length !== 1 ? 's' : ''}`,
    )
    setSelectedIds([])
  }, [applyLayout])

  const moveSelectedLayer = useCallback(
    (direction: 'back' | 'forward' | 'backmost' | 'frontmost') => {
      const ids = new Set(selectedIdsRef.current)
      if (ids.size === 0) return

      const items = layoutRef.current.furniture
      let next = items
      let label = 'Moved layer'

      switch (direction) {
        case 'forward':
          next = moveItemsForward(items, ids)
          label = 'Brought forward'
          break
        case 'back':
          next = moveItemsBackward(items, ids)
          label = 'Sent backward'
          break
        case 'frontmost':
          next = moveItemsToFront(items, ids)
          label = 'Brought to front'
          break
        case 'backmost':
          next = moveItemsToBack(items, ids)
          label = 'Sent to back'
          break
      }

      if (next === items) return

      applyLayout({ ...layoutRef.current, furniture: next }, label)
    },
    [applyLayout],
  )

  const resizeSelectedDimensions = useCallback(
    (mode: 'width' | 'depth' | 'all') => {
      const ids = selectedIdsRef.current
      if (ids.length === 0) return

      const unit = layoutRef.current.unit
      const items = layoutRef.current.furniture
      const reference = items.find((f) => ids.includes(f.id))
      if (!reference) return

      const allCircle = ids.every((id) => {
        const item = items.find((f) => f.id === id)
        return item && resolveFootprintShape(item) === 'circle'
      })

      let width: number | undefined
      let depth: number | undefined

      if (mode === 'width' || mode === 'all') {
        const nextWidth = promptDimension('Width', reference.width, unit)
        if (nextWidth === null) return
        width = nextWidth
        if (allCircle) depth = nextWidth
      }

      if ((mode === 'depth' || mode === 'all') && !allCircle) {
        const nextDepth = promptDimension('Depth', reference.depth, unit)
        if (nextDepth === null) {
          if (mode === 'depth') return
        } else {
          depth = nextDepth
        }
      }

      if (width === undefined && depth === undefined) return

      applyLayout(
        {
          ...layoutRef.current,
          furniture: items.map((f) => {
            if (!ids.includes(f.id)) return f
            return {
              ...f,
              ...(width !== undefined ? { width } : {}),
              ...(depth !== undefined ? { depth } : {}),
            }
          }),
        },
        mode === 'all'
          ? 'Changed size'
          : mode === 'width'
            ? 'Changed width'
            : 'Changed depth',
      )
    },
    [applyLayout],
  )

  const deleteSelectedOrItem = useCallback(
    (id: string) => {
      if (selectedIdsRef.current.length > 1 && selectedIdsRef.current.includes(id)) {
        deleteSelectedFurniture()
      } else {
        deleteFurniture(id)
      }
    },
    [deleteFurniture, deleteSelectedFurniture],
  )

  const selectedFurniture =
    selectedIds.length === 1
      ? (furniture.find((f) => f.id === selectedIds[0]) ?? null)
      : null

  return {
    floorPlan,
    calibration,
    unit,
    setUnit,
    furniture,
    selectedIds,
    selectedFurniture,
    toolMode,
    calibrationPoints,
    scaleDetectionStatus,
    scaleDetectionMessage,
    historyEntries,
    historyIndex,
    canUndo,
    canRedo,
    undo,
    redo,
    jumpToHistory: jumpTo,
    savedPlans,
    activePlanId,
    activePlanName,
    dbReady,
    dbError,
    planLoading,
    openingPlanId,
    planLoadError,
    saveStatus,
    saveError,
    loadFloorPlan,
    openSavedPlan,
    renameActivePlan,
    deleteSavedPlan,
    startCalibration,
    cancelCalibration,
    addCalibrationPoint,
    finishCalibration,
    retryScaleDetection,
    addFurniture,
    addFromCatalog,
    addAllCatalog,
    updateFurniture,
    deleteFurniture,
    deleteSelectedFurniture,
    deleteSelectedOrItem,
    moveSelectedLayer,
    resizeSelectedDimensions,
    groupSelectedFurniture,
    ungroupSelectedFurniture,
    renameGroup,
    selectFurniture,
    clearSelection,
    moveFurnitureGroup,
    setToolMode,
  }
}
