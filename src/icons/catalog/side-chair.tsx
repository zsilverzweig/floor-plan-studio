import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M5 7h6v3H5V7z', 'M6 7V5.5M10 7V5.5M7 10v2M9 10v2']

export function renderSideChair({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <rect
        x="5"
        y="7"
        width="6"
        height="3"
        rx="0.5"
        stroke={stroke}
       
        {...STROKE_PROPS}
      />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
