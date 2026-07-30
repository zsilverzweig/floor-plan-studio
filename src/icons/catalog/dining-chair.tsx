import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = [
  'M4.5 8h7v2.5H4.5V8z',
  'M5 8V4.5h6V8M6.5 4.5V3M9.5 4.5V3M6 10.5v1.5M10 10.5v1.5',
]

export function renderDiningChair({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <rect
        x="4.5"
        y="8"
        width="7"
        height="2.5"
        rx="0.5"
        stroke={stroke}
       
        {...STROKE_PROPS}
      />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
