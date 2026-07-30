import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M2 9h8V6h6v6H2V9z', 'M5 9V7M7 9V7M9 9V7']

export function renderLiving({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <path d={pathData[0]} stroke={stroke} {...STROKE_PROPS} />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
