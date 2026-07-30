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
import {
  deleteFloorPlan,
  getFloorPlan,
  listFloorPlanSummaries,
  putFloorPlan,
} from '../db/floorPlanFirestore'
import { seedDefaultFloorPlanIfEmpty } from '../db/seedFloorPlans'
import { isFirebaseConfigured } from '../firebase/config'
import { detectScaleBarFromUrl } from '../utils/detectScaleBar'
import type { FurnitureCatalogEntry } from '../data/furnitureCatalog'
import { FURNITURE_CATALOG } from '../data/furnitureCatalog'
import { useHistory } from './useHistory'
import {
  cloneLayout,
  describeCalibration,
  describeFurniturePatch,
  describeUnitChange,
  EMPTY_LAYOUT,
} from '../utils/layoutHistory'

const FURNITURE_COLORS = [
  '#c084fc',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#fb923c',
]

const LAST_OPENED_KEY = 'floor-plan-studio:lastOpenedPlanId'

function getLastOpenedPlanId(): string | null {
  return localStorage.getItem(LAST_OPENED_KEY)
}

function setLastOpenedPlanId(id: string): void {
  localStorage.setItem(LAST_OPENED_KEY, id)
}

function randomColor() {
  return FURNITURE_COLORS[Math.floor(Math.random() * FURNITURE_COLORS.length)]
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

export function useLayoutState() {
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toolMode, setToolMode] = useState<ToolMode>('select')
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([])
  const [scaleDetectionStatus, setScaleDetectionStatus] = useState<ScaleDetectionStatus>('idle')
  const [scaleDetectionMessage, setScaleDetectionMessage] = useState<string | null>(null)
  const [savedPlans, setSavedPlans] = useState<SavedFloorPlanSummary[]>([])
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [activePlanName, setActivePlanName] = useState('')
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const imageUrlRef = useRef<string | null>(null)
  const skipSaveRef = useRef(true)
  const activePlanIdRef = useRef<string | null>(null)
  const activePlanNameRef = useRef('')
  const scaleDetectionMessageRef = useRef<string | null>(null)

  activePlanIdRef.current = activePlanId
  activePlanNameRef.current = activePlanName
  scaleDetectionMessageRef.current = scaleDetectionMessage

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
    const plans = await listFloorPlanSummaries()
    setSavedPlans(plans)
    return plans
  }, [])

  const persistCurrentPlan = useCallback(async () => {
    const planId = activePlanIdRef.current
    if (!planId || !floorPlan || skipSaveRef.current) return

    const existing = await getFloorPlan(planId)
    if (!existing) return

    setSaveStatus('saving')
    try {
      const updated: SavedFloorPlanRecord = {
        ...existing,
        name: activePlanNameRef.current,
        layout: cloneLayout(layoutRef.current),
        scaleDetectionMessage: scaleDetectionMessageRef.current,
        updatedAt: Date.now(),
      }
      await putFloorPlan(updated)
      await refreshSavedPlans()
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [floorPlan, refreshSavedPlans])

  const openSavedPlanRecord = useCallback(
    async (record: SavedFloorPlanRecord) => {
      skipSaveRef.current = true
      if (activePlanIdRef.current && activePlanIdRef.current !== record.id) {
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
      setSelectedId(null)
      setToolMode('select')
      setScaleDetectionMessage(record.scaleDetectionMessage)
      setScaleDetectionStatus(deriveScaleStatus(record.layout))
      setLastOpenedPlanId(record.id)

      skipSaveRef.current = false
      setSaveStatus('saved')
    },
    [persistCurrentPlan, reset, revokeImageUrl],
  )

  const openSavedPlan = useCallback(
    async (id: string) => {
      const record = await getFloorPlan(id)
      if (!record) return
      await openSavedPlanRecord(record)
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
      setSelectedId(null)
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

      await putFloorPlan(record)
      setLastOpenedPlanId(record.id)
      await refreshSavedPlans()

      setActivePlanId(record.id)
      setActivePlanName(name)
      skipSaveRef.current = false
      setSaveStatus('saved')
    },
    [persistCurrentPlan, refreshSavedPlans, reset, revokeImageUrl],
  )

  useEffect(() => {
    let cancelled = false

    async function initDb() {
      try {
        if (!isFirebaseConfigured()) {
          throw new Error(
            'Firebase is not configured. Copy .env.example to .env and add your Firebase project credentials.',
          )
        }

        await seedDefaultFloorPlanIfEmpty()
        const plans = await refreshSavedPlans()
        if (cancelled) return

        const lastOpenedId = getLastOpenedPlanId()
        const planToOpen =
          (lastOpenedId ? plans.find((p) => p.id === lastOpenedId) : null) ?? plans[0]

        if (planToOpen) {
          await openSavedPlan(planToOpen.id)
        }

        if (!cancelled) {
          setDbReady(true)
          setDbError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setDbError(error instanceof Error ? error.message : 'Failed to initialize local storage')
          setDbReady(true)
        }
      }
    }

    void initDb()

    return () => {
      cancelled = true
      revokeImageUrl()
    }
  }, [openSavedPlan, refreshSavedPlans, revokeImageUrl])

  useEffect(() => {
    if (selectedId && !furniture.some((f) => f.id === selectedId)) {
      setSelectedId(null)
    }
  }, [furniture, selectedId])

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
    setSelectedId(null)
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
      setSelectedId(id)
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
    setSelectedId(items[0]?.id ?? null)
  }, [applyLayout, floorPlan])

  const updateFurniture = useCallback(
    (id: string, patch: Partial<FurnitureItem>, coalesce = false) => {
      const item = layoutRef.current.furniture.find((f) => f.id === id)
      const next: LayoutSnapshot = {
        ...layoutRef.current,
        furniture: layoutRef.current.furniture.map((f) =>
          f.id === id ? { ...f, ...patch } : f,
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
          furniture: layoutRef.current.furniture.filter((f) => f.id !== id),
        },
        `Deleted ${item?.label ?? item?.name ?? 'item'}`,
      )
      if (selectedId === id) setSelectedId(null)
    },
    [applyLayout, selectedId],
  )

  const selectedFurniture = furniture.find((f) => f.id === selectedId) ?? null

  return {
    floorPlan,
    calibration,
    unit,
    setUnit,
    furniture,
    selectedId,
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
    saveStatus,
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
    setSelectedId,
    setToolMode,
  }
}
