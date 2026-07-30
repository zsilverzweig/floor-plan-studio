import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = [
  'M4 5.5c1.5-1 3.5-.5 4.5 1s2.5 2 4 1.5 2.5-2 1.5-3.5-3-2-5.5-.5-4.5 1.5-1.5 3-1 4.5-.5z',
]

export function renderRugCowhide({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <path d={pathData[0]} stroke={stroke} {...STROKE_PROPS} />
  )
}
