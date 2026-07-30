import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M8 4.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z', 'M6.5 9.5v3M9.5 9.5v3M5 12h6']

export function renderBarStool({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <circle cx="8" cy="7" r="2.5" stroke={stroke} {...STROKE_PROPS} />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
