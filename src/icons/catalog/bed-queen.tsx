import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = [
  'M3 5.5h10v6H3V5.5z',
  'M3 4.5h10v1H3V4.5z',
  'M4.5 6.5h2v2h-2V6.5zM9.5 6.5h2v2h-2V6.5z',
]

export function renderBedQueen({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <rect
        x="3"
        y="5.5"
        width="10"
        height="6"
        rx="0.5"
        stroke={stroke}
       
        {...STROKE_PROPS}
      />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} fill={stroke} />
      <rect x="4.5" y="6.5" width="2" height="2" rx="0.25" fill={stroke} />
      <rect x="9.5" y="6.5" width="2" height="2" rx="0.25" fill={stroke} />
    </>
  )
}
