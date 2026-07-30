import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Circle,
  Rect,
  Stage,
  Text,
  Transformer,
} from 'react-konva'
import type Konva from 'konva'
import type { FurnitureItem, Point, ScaleCalibration, ToolMode } from '../types'
import { formatDimension, fromPixels, pixelDistance, toPixels } from '../utils/scale'
import { resolveMoveIds } from '../utils/furnitureGroups'
import { computeFurnitureLabelLayout } from '../utils/furnitureLabels'
import { resolveFootprintShape } from '../utils/furnitureShapes'

const ROTATION_SNAPS = [0, 45, 90, 135, 180, 225, 270, 315]
const MIN_ZOOM = 0.05
const MAX_ZOOM = 8
const ZOOM_STEP = 1.2
const FIT_PADDING = 32
const MEASURE_DRAG_THRESHOLD = 4
const MEASURE_VISIBLE_MS = 15_000
const MEASURE_FADE_MS = 800

interface CanvasView {
  scale: number
  x: number
  y: number
}

function snapRotation45(degrees: number): number {
  return Math.round(degrees / 45) * 45
}

function computeFitView(
  viewportW: number,
  viewportH: number,
  planW: number,
  planH: number,
): CanvasView {
  if (viewportW <= 0 || viewportH <= 0 || planW <= 0 || planH <= 0) {
    return { scale: 1, x: 0, y: 0 }
  }
  const scale = Math.min(
    (viewportW - FIT_PADDING) / planW,
    (viewportH - FIT_PADDING) / planH,
  )
  return {
    scale,
    x: (viewportW - planW * scale) / 2,
    y: (viewportH - planH * scale) / 2,
  }
}

function zoomViewAroundPoint(
  view: CanvasView,
  factor: number,
  point: { x: number; y: number },
): CanvasView {
  const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.scale * factor))
  const ratio = newScale / view.scale
  return {
    scale: newScale,
    x: point.x - (point.x - view.x) * ratio,
    y: point.y - (point.y - view.y) * ratio,
  }
}

interface FloorPlanCanvasProps {
  floorPlanUrl: string
  floorPlanWidth: number
  floorPlanHeight: number
  calibration: ScaleCalibration | null
  furniture: FurnitureItem[]
  selectedIds: string[]
  toolMode: ToolMode
  calibrationPoints: Point[]
  unit: ScaleCalibration['unit']
  onSelectItem: (id: string, additive: boolean) => void
  onClearSelection: () => void
  onFurnitureMoveGroup: (id: string, x: number, y: number) => void
  onFurnitureTransform: (
    id: string,
    patch: { x: number; y: number; rotation: number; width: number; depth: number },
  ) => void
  onItemContextMenu: (id: string, position: { x: number; y: number }) => void
  onCanvasClick: (point: Point) => void
}

interface GroupDragState {
  draggedId: string
  startPositions: Map<string, { x: number; y: number }>
}

interface MeasureLine {
  start: Point
  end: Point
}

function isEmptyCanvasTarget(target: Konva.Node): boolean {
  let node: Konva.Node | null = target
  while (node) {
    if (node.getClassName() === 'Group' && node.draggable()) return false
    if (node.getClassName() === 'Transformer') return false
    node = node.getParent()
  }
  return true
}

function clientToPlanPoint(stage: Konva.Stage, clientX: number, clientY: number): Point | null {
  const rect = stage.container().getBoundingClientRect()
  const transform = stage.getAbsoluteTransform().copy().invert()
  return transform.point({ x: clientX - rect.left, y: clientY - rect.top })
}

function isTransformerHit(stage: Konva.Stage, clientX: number, clientY: number): boolean {
  const rect = stage.container().getBoundingClientRect()
  let node: Konva.Node | null = stage.getIntersection({
    x: clientX - rect.left,
    y: clientY - rect.top,
  })
  while (node) {
    if (node.getClassName() === 'Transformer') return true
    node = node.getParent()
  }
  return false
}

function useImage(url: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setImage(img)
    img.src = url
    return () => {
      img.onload = null
    }
  }, [url])
  return image
}

function FurnitureShape({
  item,
  calibration,
  unit,
  selected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransform,
  snapRotation,
  onGroupRef,
  onContextMenu,
  shouldBlockDrag,
  consumeSuppressedClick,
}: {
  item: FurnitureItem
  calibration: ScaleCalibration
  unit: ScaleCalibration['unit']
  selected: boolean
  onSelect: (additive: boolean) => void
  onDragStart: () => void
  onDragMove: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
  onTransform: (patch: {
    x: number
    y: number
    rotation: number
    width: number
    depth: number
  }) => void
  snapRotation: boolean
  onGroupRef: (node: Konva.Group | null) => void
  onContextMenu: (position: { x: number; y: number }) => void
  shouldBlockDrag: () => boolean
  consumeSuppressedClick: () => boolean
}) {
  const texture = useImage(item.textureUrl ?? '')
  const widthPx = toPixels(item.width, calibration)
  const depthPx = toPixels(item.depth, calibration)
  const groupRef = useRef<Konva.Group>(null)
  const didDragRef = useRef(false)
  const displayName = item.label ?? item.name
  const isRug = item.kind === 'rug'
  const footprint = resolveFootprintShape(item)
  const isCircle = footprint === 'circle'
  const radiusPx = Math.min(widthPx, depthPx) / 2
  const dimLabel = isCircle
    ? `${formatDimension(item.width, unit)} Ø`
    : `${formatDimension(item.width, unit)} × ${formatDimension(item.depth, unit)}`
  const labelLayout = computeFurnitureLabelLayout({
    widthPx,
    depthPx,
    isCircle,
    radiusPx,
  })

  return (
    <Group
      ref={(node) => {
        groupRef.current = node
        onGroupRef(node)
      }}
      x={item.x}
      y={item.y}
      rotation={item.rotation}
      draggable={true}
      onClick={(e) => {
        e.cancelBubble = true
        if (consumeSuppressedClick()) return
        if (didDragRef.current) {
          didDragRef.current = false
          return
        }
        onSelect(e.evt.shiftKey)
      }}
      onTap={(e) => {
        e.cancelBubble = true
        if (consumeSuppressedClick()) return
        if (didDragRef.current) {
          didDragRef.current = false
          return
        }
        const evt = e.evt
        const additive = 'shiftKey' in evt ? evt.shiftKey : false
        onSelect(additive)
      }}
      onDragStart={(e) => {
        e.cancelBubble = true
        if (shouldBlockDrag()) {
          e.target.stopDrag()
          return
        }
        didDragRef.current = false
        onDragStart()
      }}
      onDragMove={(e) => {
        didDragRef.current = true
        onDragMove(e.target.x(), e.target.y())
      }}
      onDragEnd={(e) => {
        onDragEnd(e.target.x(), e.target.y())
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault()
        e.cancelBubble = true
        onContextMenu({ x: e.evt.clientX, y: e.evt.clientY })
      }}
      onTransformEnd={() => {
        const node = groupRef.current
        if (!node) return

        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        node.scaleX(1)
        node.scaleY(1)

        let rotation = node.rotation()
        if (snapRotation) {
          rotation = snapRotation45(rotation)
          node.rotation(rotation)
        }

        let nextWidth = Math.max(item.width * scaleX, 0.1)
        let nextDepth = Math.max(item.depth * scaleY, 0.1)
        if (isCircle) {
          const uniform = Math.max(nextWidth, nextDepth)
          nextWidth = uniform
          nextDepth = uniform
        }

        onTransform({
          x: node.x(),
          y: node.y(),
          rotation,
          width: nextWidth,
          depth: nextDepth,
        })
        node.getLayer()?.batchDraw()
      }}
    >
      {isCircle ? (
        <Circle
          x={0}
          y={0}
          radius={radiusPx}
          fill={texture ? undefined : item.color}
          fillPatternImage={texture ?? undefined}
          fillPatternRepeat="no-repeat"
          fillPatternScale={
            texture
              ? {
                  x: (radiusPx * 2) / texture.width,
                  y: (radiusPx * 2) / texture.height,
                }
              : undefined
          }
          opacity={texture ? 0.92 : 0.75}
          stroke={selected ? '#6366f1' : '#1e293b'}
          strokeWidth={selected ? 2.5 : 1}
          shadowColor="rgba(0,0,0,0.2)"
          shadowBlur={selected ? 8 : 4}
          shadowOffset={{ x: 1, y: 2 }}
        />
      ) : (
        <Rect
          x={-widthPx / 2}
          y={-depthPx / 2}
          width={widthPx}
          height={depthPx}
          fill={texture ? undefined : item.color}
          fillPatternImage={texture ?? undefined}
          fillPatternRepeat="no-repeat"
          fillPatternScale={
            texture
              ? { x: widthPx / texture.width, y: depthPx / texture.height }
              : undefined
          }
          opacity={isRug ? 0.45 : texture ? 0.92 : 0.75}
          stroke={selected ? '#6366f1' : isRug ? '#78716c' : '#1e293b'}
          strokeWidth={selected ? 2.5 : 1}
          dash={isRug ? [6, 4] : undefined}
          shadowColor="rgba(0,0,0,0.2)"
          shadowBlur={selected ? 8 : 4}
          shadowOffset={{ x: 1, y: 2 }}
        />
      )}
      {labelLayout.visible && (
        <>
          <Rect
            x={labelLayout.boxX}
            y={labelLayout.boxY}
            width={labelLayout.boxWidth}
            height={labelLayout.boxHeight}
            fill="rgba(255,255,255,0.82)"
            cornerRadius={2}
            listening={false}
          />
          <Text
            text={displayName}
            x={labelLayout.nameX}
            y={labelLayout.nameY}
            width={labelLayout.nameWidth}
            align="center"
            fontSize={labelLayout.nameFontSize}
            fill="#0f172a"
            fontStyle="bold"
            ellipsis={true}
            wrap="none"
            listening={false}
          />
          {labelLayout.showDim && (
            <Text
              text={dimLabel}
              x={labelLayout.dimX}
              y={labelLayout.dimY}
              width={labelLayout.dimWidth}
              align="center"
              fontSize={labelLayout.dimFontSize}
              fill="#475569"
              ellipsis={true}
              wrap="none"
              listening={false}
            />
          )}
        </>
      )}
    </Group>
  )
}

export function FloorPlanCanvas({
  floorPlanUrl,
  floorPlanWidth,
  floorPlanHeight,
  calibration,
  furniture,
  selectedIds,
  toolMode,
  calibrationPoints,
  unit,
  onSelectItem,
  onClearSelection,
  onFurnitureMoveGroup,
  onFurnitureTransform,
  onItemContextMenu,
  onCanvasClick,
}: FloorPlanCanvasProps) {
  const floorImage = useImage(floorPlanUrl)
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const shapeRefs = useRef(new Map<string, Konva.Group>())
  const groupDragRef = useRef<GroupDragState | null>(null)
  const selectedIdsRef = useRef(selectedIds)
  selectedIdsRef.current = selectedIds
  const furnitureRef = useRef(furniture)
  furnitureRef.current = furniture
  const hasManualZoomRef = useRef(false)
  const suppressClearSelectionRef = useRef(false)
  const suppressClickRef = useRef(false)
  const measurePendingRef = useRef(false)
  const [freeRotate, setFreeRotate] = useState(false)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState<CanvasView>({ scale: 1, x: 0, y: 0 })
  const [measureLine, setMeasureLine] = useState<MeasureLine | null>(null)
  const [measureOpacity, setMeasureOpacity] = useState(1)
  const measureFadeTimerRef = useRef<number | null>(null)
  const measureFadeRafRef = useRef<number | null>(null)

  const clearMeasureFadeTimers = useCallback(() => {
    if (measureFadeTimerRef.current !== null) {
      window.clearTimeout(measureFadeTimerRef.current)
      measureFadeTimerRef.current = null
    }
    if (measureFadeRafRef.current !== null) {
      window.cancelAnimationFrame(measureFadeRafRef.current)
      measureFadeRafRef.current = null
    }
  }, [])

  const dismissMeasureLine = useCallback(() => {
    clearMeasureFadeTimers()
    setMeasureLine(null)
    setMeasureOpacity(1)
  }, [clearMeasureFadeTimers])

  const scheduleMeasureFade = useCallback(() => {
    clearMeasureFadeTimers()
    setMeasureOpacity(1)
    measureFadeTimerRef.current = window.setTimeout(() => {
      measureFadeTimerRef.current = null
      const fadeStart = performance.now()
      const tick = (now: number) => {
        const progress = Math.min(1, (now - fadeStart) / MEASURE_FADE_MS)
        setMeasureOpacity(1 - progress)
        if (progress < 1) {
          measureFadeRafRef.current = window.requestAnimationFrame(tick)
        } else {
          measureFadeRafRef.current = null
          setMeasureLine(null)
          setMeasureOpacity(1)
        }
      }
      measureFadeRafRef.current = window.requestAnimationFrame(tick)
    }, MEASURE_VISIBLE_MS)
  }, [clearMeasureFadeTimers])

  useEffect(() => () => clearMeasureFadeTimers(), [clearMeasureFadeTimers])

  const fitToScreen = useCallback(() => {
    hasManualZoomRef.current = false
    setView(
      computeFitView(viewportSize.width, viewportSize.height, floorPlanWidth, floorPlanHeight),
    )
  }, [viewportSize.width, viewportSize.height, floorPlanWidth, floorPlanHeight])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateSize = () => {
      setViewportSize({ width: el.clientWidth, height: el.clientHeight })
    }
    updateSize()

    const ro = new ResizeObserver(updateSize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    hasManualZoomRef.current = false
  }, [floorPlanUrl, floorPlanWidth, floorPlanHeight])

  useEffect(() => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return
    if (hasManualZoomRef.current) return
    setView(
      computeFitView(viewportSize.width, viewportSize.height, floorPlanWidth, floorPlanHeight),
    )
  }, [floorPlanUrl, floorPlanWidth, floorPlanHeight, viewportSize.width, viewportSize.height])

  const zoomBy = useCallback(
    (factor: number, point?: { x: number; y: number }) => {
      hasManualZoomRef.current = true
      const anchor = point ?? {
        x: viewportSize.width / 2,
        y: viewportSize.height / 2,
      }
      setView((current) => zoomViewAroundPoint(current, factor, anchor))
    },
    [viewportSize.width, viewportSize.height],
  )

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      const pointer = stage?.getPointerPosition()
      if (!pointer) return
      const factor = e.evt.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP
      zoomBy(factor, pointer)
    },
    [zoomBy],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setFreeRotate(true)
      if (e.key === 'Escape') dismissMeasureLine()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setFreeRotate(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [dismissMeasureLine])

  const primarySelectedId = selectedIds.length === 1 ? selectedIds[0] : null

  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return

    if (primarySelectedId && toolMode === 'select') {
      const node = shapeRefs.current.get(primarySelectedId)
      if (node) {
        transformer.nodes([node])
        transformer.getLayer()?.batchDraw()
        return
      }
    }
    transformer.nodes([])
  }, [primarySelectedId, toolMode, furniture])

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return

    if (suppressClearSelectionRef.current) {
      suppressClearSelectionRef.current = false
      return
    }

    if (isEmptyCanvasTarget(e.target)) {
      if (toolMode === 'calibrate') {
        const pos = stage.getPointerPosition()
        if (pos) onCanvasClick(pos)
      } else {
        onClearSelection()
      }
    }
  }

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (toolMode !== 'select' || !calibration || e.button !== 0 || !e.shiftKey) return
    if ((e.target as HTMLElement).closest('.canvas-zoom-controls')) return

    const stage = stageRef.current
    if (!stage) return
    if (isTransformerHit(stage, e.clientX, e.clientY)) return

    const start = clientToPlanPoint(stage, e.clientX, e.clientY)
    if (!start) return

    measurePendingRef.current = true
    clearMeasureFadeTimers()
    setMeasureOpacity(1)

    const onPointerMove = (ev: PointerEvent) => {
      const end = clientToPlanPoint(stage, ev.clientX, ev.clientY)
      if (!end) return
      const dragged =
        Math.hypot(end.x - start.x, end.y - start.y) >= MEASURE_DRAG_THRESHOLD
      if (dragged) {
        setMeasureLine({ start, end })
      } else {
        setMeasureLine(null)
      }
    }

    const onPointerUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      measurePendingRef.current = false

      const end = clientToPlanPoint(stage, ev.clientX, ev.clientY)
      if (!end) return
      const dragged =
        Math.hypot(end.x - start.x, end.y - start.y) >= MEASURE_DRAG_THRESHOLD

      if (dragged) {
        setMeasureLine({ start, end })
        suppressClearSelectionRef.current = true
        suppressClickRef.current = true
        scheduleMeasureFade()
      } else {
        dismissMeasureLine()
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const beginGroupDrag = (draggedId: string) => {
    const idsToMove = resolveMoveIds(
      furnitureRef.current,
      draggedId,
      selectedIdsRef.current,
    )
    if (idsToMove.length < 2) {
      groupDragRef.current = null
      return
    }

    const startPositions = new Map<string, { x: number; y: number }>()
    for (const id of idsToMove) {
      const node = shapeRefs.current.get(id)
      if (node) {
        startPositions.set(id, { x: node.x(), y: node.y() })
      }
    }
    groupDragRef.current = { draggedId, startPositions }
  }

  const moveGroupDrag = (draggedId: string, x: number, y: number) => {
    const drag = groupDragRef.current
    if (!drag || drag.draggedId !== draggedId) return

    const origin = drag.startPositions.get(draggedId)
    if (!origin) return

    const dx = x - origin.x
    const dy = y - origin.y

    for (const [id, start] of drag.startPositions) {
      if (id === draggedId) continue
      const node = shapeRefs.current.get(id)
      if (node) {
        node.x(start.x + dx)
        node.y(start.y + dy)
      }
    }
    shapeRefs.current.get(draggedId)?.getLayer()?.batchDraw()
  }

  const finishGroupDrag = (draggedId: string, x: number, y: number) => {
    groupDragRef.current = null
    onFurnitureMoveGroup(draggedId, x, y)
  }

  const measureDistanceLabel =
    measureLine && calibration
      ? formatDimension(
          fromPixels(pixelDistance(measureLine.start, measureLine.end), calibration),
          unit,
        )
      : null

  const showMeasureLine =
    measureLine !== null &&
    pixelDistance(measureLine.start, measureLine.end) >= MEASURE_DRAG_THRESHOLD

  const consumeSuppressedClick = useCallback(() => {
    if (!suppressClickRef.current) return false
    suppressClickRef.current = false
    return true
  }, [])

  return (
    <div
      ref={containerRef}
      className="canvas-viewport"
      onPointerDown={handleViewportPointerDown}
    >
      <div className="canvas-zoom-controls">
        <button type="button" className="canvas-zoom-btn" onClick={() => zoomBy(ZOOM_STEP)} title="Zoom in">
          +
        </button>
        <button
          type="button"
          className="canvas-zoom-btn"
          onClick={() => zoomBy(1 / ZOOM_STEP)}
          title="Zoom out"
        >
          −
        </button>
        <button type="button" className="canvas-zoom-btn canvas-zoom-fit" onClick={fitToScreen} title="Fit to screen">
          Fit
        </button>
        <span className="canvas-zoom-label">{Math.round(view.scale * 100)}%</span>
      </div>
      <Stage
        ref={stageRef}
        width={Math.max(viewportSize.width, 1)}
        height={Math.max(viewportSize.height, 1)}
        scaleX={view.scale}
        scaleY={view.scale}
        x={view.x}
        y={view.y}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        style={{ cursor: toolMode === 'calibrate' ? 'crosshair' : 'default' }}
      >
        <Layer>
          {floorImage && (
            <KonvaImage
              image={floorImage}
              width={floorPlanWidth}
              height={floorPlanHeight}
              listening={toolMode === 'calibrate'}
            />
          )}

          {calibration && (
            <>
              <Line
                points={[
                  calibration.pointA.x,
                  calibration.pointA.y,
                  calibration.pointB.x,
                  calibration.pointB.y,
                ]}
                stroke={calibration.source === 'auto' ? '#059669' : '#6366f1'}
                strokeWidth={calibration.source === 'auto' ? 3 : 2}
                dash={calibration.source === 'auto' ? undefined : [6, 4]}
              />
              <Rect
                x={calibration.pointA.x - 4}
                y={calibration.pointA.y - 4}
                width={8}
                height={8}
                fill={calibration.source === 'auto' ? '#059669' : '#6366f1'}
                cornerRadius={4}
              />
              <Rect
                x={calibration.pointB.x - 4}
                y={calibration.pointB.y - 4}
                width={8}
                height={8}
                fill={calibration.source === 'auto' ? '#059669' : '#6366f1'}
                cornerRadius={4}
              />
              <Text
                x={(calibration.pointA.x + calibration.pointB.x) / 2 + 8}
                y={calibration.pointA.y - 18}
                text={`${calibration.realDistance}${calibration.unit}${calibration.source === 'auto' ? ' (auto)' : ''}`}
                fontSize={12}
                fill={calibration.source === 'auto' ? '#059669' : '#6366f1'}
                fontStyle="bold"
              />
            </>
          )}

          {calibrationPoints.map((pt, i) => (
            <Rect
              key={`cal-${i}`}
              x={pt.x - 5}
              y={pt.y - 5}
              width={10}
              height={10}
              fill="#6366f1"
              cornerRadius={5}
            />
          ))}

          {calibrationPoints.length === 2 && toolMode === 'calibrate' && (
            <Line
              points={[
                calibrationPoints[0].x,
                calibrationPoints[0].y,
                calibrationPoints[1].x,
                calibrationPoints[1].y,
              ]}
              stroke="#6366f1"
              strokeWidth={2}
              dash={[6, 4]}
            />
          )}

          {calibration &&
            furniture.map((item) => (
              <FurnitureShape
                key={item.id}
                item={item}
                calibration={calibration}
                unit={unit}
                selected={selectedIds.includes(item.id)}
                onSelect={(additive) => onSelectItem(item.id, additive)}
                onDragStart={() => beginGroupDrag(item.id)}
                onDragMove={(x, y) => moveGroupDrag(item.id, x, y)}
                onDragEnd={(x, y) => finishGroupDrag(item.id, x, y)}
                onTransform={(patch) => onFurnitureTransform(item.id, patch)}
                snapRotation={!freeRotate}
                onContextMenu={(position) => onItemContextMenu(item.id, position)}
                shouldBlockDrag={() => measurePendingRef.current}
                consumeSuppressedClick={consumeSuppressedClick}
                onGroupRef={(node) => {
                  if (node) shapeRefs.current.set(item.id, node)
                  else shapeRefs.current.delete(item.id)
                }}
              />
            ))}

          {toolMode === 'select' && primarySelectedId && (
            <Transformer
              ref={transformerRef}
              rotateEnabled={true}
              rotationSnaps={freeRotate ? [] : ROTATION_SNAPS}
              rotationSnapTolerance={freeRotate ? 0 : 22.5}
              enabledAnchors={[
                'top-left',
                'top-right',
                'bottom-left',
                'bottom-right',
              ]}
              boundBoxFunc={(oldBox, newBox) => {
                if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
                  return oldBox
                }
                return newBox
              }}
              anchorSize={8}
              borderStroke="#6366f1"
              anchorStroke="#6366f1"
              anchorFill="#ffffff"
            />
          )}

          {showMeasureLine && measureDistanceLabel && (
            <Group opacity={measureOpacity} listening={false}>
              <Line
                points={[
                  measureLine.start.x,
                  measureLine.start.y,
                  measureLine.end.x,
                  measureLine.end.y,
                ]}
                stroke="#f59e0b"
                strokeWidth={2}
              />
              <Circle
                x={measureLine.start.x}
                y={measureLine.start.y}
                radius={5}
                fill="#f59e0b"
              />
              <Circle
                x={measureLine.end.x}
                y={measureLine.end.y}
                radius={5}
                fill="#f59e0b"
              />
              <Rect
                x={(measureLine.start.x + measureLine.end.x) / 2 - 40}
                y={(measureLine.start.y + measureLine.end.y) / 2 - 22}
                width={80}
                height={18}
                fill="rgba(255,255,255,0.92)"
                cornerRadius={3}
              />
              <Text
                x={(measureLine.start.x + measureLine.end.x) / 2 - 40}
                y={(measureLine.start.y + measureLine.end.y) / 2 - 19}
                width={80}
                align="center"
                text={measureDistanceLabel}
                fontSize={11}
                fill="#b45309"
                fontStyle="bold"
              />
            </Group>
          )}
        </Layer>
      </Stage>
    </div>
  )
}
