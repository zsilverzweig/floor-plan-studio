import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M3 4h10v2H3V4zM3 9h10v2H3V9z', 'M4 11v1M12 11v1']

export function renderBarCart({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <path d={pathData[0]} stroke={stroke} {...STROKE_PROPS} />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
      <circle cx="4" cy="12.5" r="0.75" fill={stroke} />
      <circle cx="12" cy="12.5" r="0.75" fill={stroke} />
    </>
  )
}
