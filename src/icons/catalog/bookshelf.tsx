import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M5 2h6v12H5V2z', 'M5 5h6M5 8h6M5 11h6']

export function renderBookshelf({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <rect
        x="5"
        y="2"
        width="6"
        height="12"
        rx="0.5"
        stroke={stroke}
       
        {...STROKE_PROPS}
      />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
