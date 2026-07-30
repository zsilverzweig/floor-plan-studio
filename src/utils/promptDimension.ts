import type { LengthUnit } from '../types'
import { dimensionInputHint, parseDimensionExpression } from './parseDimension'
import { formatDimensionInput, roundDimension } from './scale'

export function promptDimension(
  label: string,
  current: number,
  unit: LengthUnit,
): number | null {
  const raw = window.prompt(
    `${label} (${unit})\n${dimensionInputHint(unit)}`,
    formatDimensionInput(current, unit),
  )
  if (raw === null) return null

  const parsed = parseDimensionExpression(raw)
  if (parsed === null || parsed <= 0) {
    window.alert('Enter a valid number or formula (e.g. 44/12).')
    return null
  }
  return roundDimension(parsed, unit)
}
