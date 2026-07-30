import type { LengthUnit, Point, ScaleCalibration } from '../types'

export function pixelDistance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function pixelsPerUnit(calibration: ScaleCalibration): number {
  const px = pixelDistance(calibration.pointA, calibration.pointB)
  if (calibration.realDistance <= 0) return 0
  return px / calibration.realDistance
}

export function toPixels(realValue: number, calibration: ScaleCalibration): number {
  return realValue * pixelsPerUnit(calibration)
}

export function fromPixels(px: number, calibration: ScaleCalibration): number {
  const ppu = pixelsPerUnit(calibration)
  if (ppu <= 0) return 0
  return px / ppu
}

function dimensionDecimals(unit: LengthUnit): number {
  if (unit === 'in') return 1
  if (unit === 'cm') return 0
  return 2
}

/** Round stored dimensions to avoid float noise from fractional catalog values. */
export function roundDimension(value: number, unit: LengthUnit): number {
  const decimals = dimensionDecimals(unit)
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Compact numeric string for dimension inputs in the sidebar. */
export function formatDimensionInput(value: number, unit: LengthUnit): string {
  const rounded = roundDimension(value, unit)
  const decimals = dimensionDecimals(unit)
  const fixed = rounded.toFixed(decimals)
  if (decimals === 0) return fixed
  return fixed.replace(/\.?0+$/, '')
}

export function formatDimension(value: number, unit: LengthUnit): string {
  if (unit === 'ft') {
    const feet = Math.floor(value)
    const inches = Math.round((value - feet) * 12)
    if (inches === 0) return `${feet}'`
    if (feet === 0) return `${inches}"`
    return `${feet}' ${inches}"`
  }
  if (unit === 'in') return `${value.toFixed(1)}"`
  if (unit === 'm') return `${value.toFixed(2)} m`
  return `${value.toFixed(0)} cm`
}

export const UNIT_LABELS: Record<LengthUnit, string> = {
  ft: 'feet',
  in: 'inches',
  m: 'meters',
  cm: 'centimeters',
}
