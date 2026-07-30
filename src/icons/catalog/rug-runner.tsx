import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M4.5 2.5h7v11h-7V2.5z']

export function renderRugRunner({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <rect
      x="4.5"
      y="2.5"
      width="7"
      height="11"
      rx="0.5"
      stroke={stroke}
     
      strokeDasharray="2 1.5"
      {...STROKE_PROPS}
    />
  )
}
