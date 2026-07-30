import { useEffect, useRef, useState } from 'react'
import {
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
  Transformer,
} from 'react-konva'
import type Konva from 'konva'
import type { FurnitureItem, Point, ScaleCalibration, ToolMode } from '../types'
import { formatDimension, toPixels } from '../utils/scale'

interface FloorPlanCanvasProps {
  floorPlanUrl: string
  floorPlanWidth: number
  floorPlanHeight: number
  calibration: ScaleCalibration | null
  furniture: FurnitureItem[]
  selectedId: string | null
  toolMode: ToolMode
  calibrationPoints: Point[]
  unit: ScaleCalibration['unit']
  onSelect: (id: string | null) => void
  onFurnitureMove: (id: string, x: number, y: number) => void
  onFurnitureTransform: (
    id: string,
    patch: { x: number; y: number; rotation: number; width: number; depth: number },
  ) => void
  onCanvasClick: (point: Point) => void
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
  onMove,
  onTransform,
  onGroupRef,
}: {
  item: FurnitureItem
  calibration: ScaleCalibration
  unit: ScaleCalibration['unit']
  selected: boolean
  onSelect: () => void
  onMove: (x: number, y: number) => void
  onTransform: (patch: {
    x: number
    y: number
    rotation: number
    width: number
    depth: number
  }) => void
  onGroupRef: (node: Konva.Group | null) => void
}) {
  const texture = useImage(item.textureUrl ?? '')
  const widthPx = toPixels(item.width, calibration)
  const depthPx = toPixels(item.depth, calibration)
  const groupRef = useRef<Konva.Group>(null)
  const labelHeight = Math.min(28, depthPx - 4)
  const nameFontSize = labelHeight >= 24 ? 11 : 9
  const dimFontSize = labelHeight >= 24 ? 9 : 8
  const displayName = item.label ?? item.name
  const isRug = item.kind === 'rug'

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
        onSelect()
      }}
      onTap={(e) => {
        e.cancelBubble = true
        onSelect()
      }}
      onDragEnd={(e) => {
        onMove(e.target.x(), e.target.y())
      }}
      onTransformEnd={() => {
        const node = groupRef.current
        if (!node) return

        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        node.scaleX(1)
        node.scaleY(1)

        onTransform({
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(item.width * scaleX, 0.1),
          depth: Math.max(item.depth * scaleY, 0.1),
        })
      }}
    >
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
      {labelHeight >= 14 && (
        <>
          <Rect
            x={-widthPx / 2 + 2}
            y={-labelHeight / 2}
            width={Math.max(widthPx - 4, 0)}
            height={labelHeight}
            fill="rgba(255,255,255,0.82)"
            cornerRadius={2}
            listening={false}
          />
          <Text
            text={displayName}
            x={-widthPx / 2}
            y={-labelHeight / 2 + 2}
            width={widthPx}
            align="center"
            fontSize={nameFontSize}
            fill="#0f172a"
            fontStyle="bold"
            listening={false}
          />
          <Text
            text={`${formatDimension(item.width, unit)} × ${formatDimension(item.depth, unit)}`}
            x={-widthPx / 2}
            y={-labelHeight / 2 + 2 + nameFontSize + 1}
            width={widthPx}
            align="center"
            fontSize={dimFontSize}
            fill="#475569"
            listening={false}
          />
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
  selectedId,
  toolMode,
  calibrationPoints,
  unit,
  onSelect,
  onFurnitureMove,
  onFurnitureTransform,
  onCanvasClick,
}: FloorPlanCanvasProps) {
  const floorImage = useImage(floorPlanUrl)
  const containerRef = useRef<HTMLDivElement>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const shapeRefs = useRef(new Map<string, Konva.Group>())

  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return

    if (selectedId && toolMode === 'select') {
      const node = shapeRefs.current.get(selectedId)
      if (node) {
        transformer.nodes([node])
        transformer.getLayer()?.batchDraw()
        return
      }
    }
    transformer.nodes([])
  }, [selectedId, toolMode, furniture])

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return

    if (e.target === stage || e.target.getClassName() === 'Image') {
      if (toolMode === 'calibrate') {
        const pos = stage.getPointerPosition()
        if (pos) onCanvasClick(pos)
      } else {
        onSelect(null)
      }
    }
  }

  return (
    <div ref={containerRef} className="canvas-scroll">
      <Stage
        width={floorPlanWidth}
        height={floorPlanHeight}
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
                selected={item.id === selectedId}
                onSelect={() => onSelect(item.id)}
                onMove={(x, y) => onFurnitureMove(item.id, x, y)}
                onTransform={(patch) => onFurnitureTransform(item.id, patch)}
                onGroupRef={(node) => {
                  if (node) shapeRefs.current.set(item.id, node)
                  else shapeRefs.current.delete(item.id)
                }}
              />
            ))}

          {toolMode === 'select' && (
            <Transformer
              ref={transformerRef}
              rotateEnabled={true}
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
        </Layer>
      </Stage>
    </div>
  )
}
