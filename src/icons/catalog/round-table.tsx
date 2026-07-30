import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M8 3a5 5 0 110 10 5 5 0 010-10z', 'M8 8v3M5.5 8h-1.5M10.5 8h1.5M8 5.5V4']

export function renderRoundTable({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <circle cx="8" cy="8" r="5" stroke={stroke} {...STROKE_PROPS} />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
