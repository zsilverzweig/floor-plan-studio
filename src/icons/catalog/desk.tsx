import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M2 4h12v2H2V4z', 'M3 6v6M13 6v6M6 6v3M10 6v3']

export function renderDesk({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <rect
        x="2"
        y="4"
        width="12"
        height="2"
        rx="0.5"
        stroke={stroke}
       
        {...STROKE_PROPS}
      />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
