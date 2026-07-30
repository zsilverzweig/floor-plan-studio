import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M5.5 7h5v6h-5V7z', 'M5.5 9h5', 'M8 4.5v2.5']

export function renderNightstand({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <rect
        x="5.5"
        y="7"
        width="5"
        height="6"
        rx="0.5"
        stroke={stroke}
       
        {...STROKE_PROPS}
      />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
      <path d={pathData[2]} stroke={stroke} {...STROKE_PROPS} />
      <circle cx="8" cy="4" r="1" fill={stroke} />
    </>
  )
}
