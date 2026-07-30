import type { FurnitureType } from './utils/furnitureTypes'

export type { FurnitureType } from './utils/furnitureTypes'
export type LengthUnit = 'ft' | 'in' | 'm' | 'cm'

export interface Point {
  x: number
  y: number
}

export interface ScaleCalibration {
  pointA: Point
  pointB: Point
  realDistance: number
  unit: LengthUnit
  source?: 'manual' | 'auto'
}

export interface ScaleBarBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ScaleDetectionResult {
  calibration: ScaleCalibration
  confidence: number
  barBounds: ScaleBarBounds
  labelText?: string
}

export type FurnitureKind = 'furniture' | 'rug'

export interface FurnitureItem {
  id: string
  name: string
  label?: string
  width: number
  depth: number
  x: number
  y: number
  rotation: number
  textureUrl?: string
  color: string
  kind?: FurnitureKind
  type?: FurnitureType
  room?: string
  status?: string
}

export interface FloorPlan {
  imageUrl: string
  width: number
  height: number
}

export type ToolMode = 'select' | 'calibrate'

export type ScaleDetectionStatus = 'idle' | 'detecting' | 'found' | 'failed'

export interface LayoutSnapshot {
  furniture: FurnitureItem[]
  calibration: ScaleCalibration | null
  unit: LengthUnit
}

export interface SavedFloorPlanRecord {
  id: string
  name: string
  width: number
  height: number
  imageBlob: Blob
  imageStoragePath?: string
  imageContentType?: string
  layout: LayoutSnapshot
  scaleDetectionMessage: string | null
  createdAt: number
  updatedAt: number
}

export interface SavedFloorPlanSummary {
  id: string
  name: string
  width: number
  height: number
  updatedAt: number
  furnitureCount: number
}
