import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M2.5 4.5h11v7H2.5V4.5z', 'M4 6.5h8M4 9.5h8']

export function renderRugRect({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <rect
        x="2.5"
        y="4.5"
        width="11"
        height="7"
        rx="0.75"
        stroke={stroke}
       
        strokeDasharray="2 1.5"
        {...STROKE_PROPS}
      />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
