import type { SavedFloorPlanRecord } from '../types'
import { detectScaleBarFromUrl } from '../utils/detectScaleBar'
import { EMPTY_LAYOUT } from '../utils/layoutHistory'
import { countFloorPlans, putFloorPlan } from './floorPlanFirestore'

const DEFAULT_PLAN_PATH = '/samples/unit-14a-floorplan.jpg'
const DEFAULT_PLAN_NAME = 'Unit 14A'

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
      reject(new Error('Failed to load image dimensions'))
    }
    img.src = url
  })
}

export async function seedDefaultFloorPlanIfEmpty(): Promise<SavedFloorPlanRecord | null> {
  const count = await countFloorPlans()
  if (count > 0) return null

  const response = await fetch(DEFAULT_PLAN_PATH)
  if (!response.ok) {
    throw new Error(`Could not load default floor plan from ${DEFAULT_PLAN_PATH}`)
  }

  const imageBlob = await response.blob()
  const { width, height } = await loadImageDimensions(imageBlob)
  const imageUrl = URL.createObjectURL(imageBlob)

  let layout = EMPTY_LAYOUT
  let scaleDetectionMessage: string | null = null

  try {
    const result = await detectScaleBarFromUrl(imageUrl)
    if (result) {
      layout = {
        furniture: [],
        calibration: result.calibration,
        unit: 'ft',
      }
      const barWidth = result.calibration.pointB.x - result.calibration.pointA.x
      const pxPerUnit = barWidth / result.calibration.realDistance
      scaleDetectionMessage = `Detected ${result.calibration.realDistance}' scale bar (${pxPerUnit.toFixed(1)} px/ft, ${Math.round(result.confidence * 100)}% confidence${result.labelText ? `, read "${result.labelText}"` : ''})`
    } else {
      scaleDetectionMessage =
        'No scale bar found — set scale manually by clicking two known points.'
    }
  } finally {
    URL.revokeObjectURL(imageUrl)
  }

  const now = Date.now()
  const record: SavedFloorPlanRecord = {
    id: crypto.randomUUID(),
    name: DEFAULT_PLAN_NAME,
    width,
    height,
    imageBlob,
    imageContentType: imageBlob.type || 'image/jpeg',
    layout,
    scaleDetectionMessage,
    createdAt: now,
    updatedAt: now,
  }

  await putFloorPlan(record)
  return record
}
