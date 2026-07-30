import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = [
  'M5 8h6v2.5H5V8z',
  'M4 8V6.5h1.5V8M10.5 8V6.5H12V8M6 10.5v1.5M10 10.5v1.5',
]

export function renderArmchair({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <rect
        x="5"
        y="8"
        width="6"
        height="2.5"
        rx="0.5"
        stroke={stroke}
       
        {...STROKE_PROPS}
      />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
