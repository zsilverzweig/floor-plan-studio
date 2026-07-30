import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M4 3h8v10H4V3z', 'M8 3v3M6.5 3h3']

export function renderHallway({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <rect
        x="4"
        y="3"
        width="8"
        height="10"
        rx="0.5"
        stroke={stroke}
       
        {...STROKE_PROPS}
      />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
