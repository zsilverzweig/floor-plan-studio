import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = [
  'M2 8h7V5h7v6H9v3H2V8z',
  'M4 8V6M6 8V6M8 8V6',
]

export function renderSectionalSofa({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <path d={pathData[0]} stroke={stroke} {...STROKE_PROPS} />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
