import type { FurnitureItem, LayoutSnapshot, LengthUnit, ScaleCalibration } from '../types'
import { UNIT_LABELS } from './scale'

export const EMPTY_LAYOUT: LayoutSnapshot = {
  furniture: [],
  calibration: null,
  unit: 'ft',
}

export function cloneLayout(snapshot: LayoutSnapshot): LayoutSnapshot {
  return structuredClone(snapshot)
}

export function describeFurniturePatch(
  patch: Partial<FurnitureItem>,
  item: FurnitureItem | undefined,
): string {
  const name = item?.label ?? item?.name ?? 'item'
  const keys = Object.keys(patch)

  const moved =
    (patch.x !== undefined || patch.y !== undefined) &&
    keys.every((k) => k === 'x' || k === 'y')
  if (moved) return `Moved ${name}`

  const rotated = patch.rotation !== undefined && keys.length === 1
  if (rotated) return `Rotated ${name}`

  const resized =
    (patch.width !== undefined || patch.depth !== undefined) &&
    keys.every((k) => k === 'width' || k === 'depth')
  if (resized) return `Resized ${name}`

  if (patch.rotation !== undefined && (patch.width !== undefined || patch.depth !== undefined)) {
    return `Transformed ${name}`
  }

  return `Edited ${name}`
}

export function describeUnitChange(unit: LengthUnit): string {
  return `Changed unit to ${UNIT_LABELS[unit]}`
}

export function describeCalibration(
  calibration: ScaleCalibration,
  source: 'manual' | 'auto' | 'retry',
): string {
  if (source === 'manual') {
    return `Set scale manually (${calibration.realDistance} ${calibration.unit})`
  }
  if (source === 'retry') {
    return `Re-detected scale (${calibration.realDistance} ${calibration.unit})`
  }
  return `Auto-detected scale (${calibration.realDistance} ${calibration.unit})`
}
