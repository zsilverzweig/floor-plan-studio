import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M3 6h10v5H3V6z', 'M3 5h10v1H3V5z']

export function renderBedroom({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <rect
        x="3"
        y="6"
        width="10"
        height="5"
        rx="0.5"
        stroke={stroke}
       
        {...STROKE_PROPS}
      />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} fill={stroke} />
    </>
  )
}
