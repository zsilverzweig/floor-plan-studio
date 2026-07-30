import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = [
  'M8 3v10',
  'M8 4.5L5.5 6M8 4.5L10.5 6M8 7.5L6 9M8 7.5L10 9M8 10.5L5.5 12M8 10.5L10.5 12',
]

export function renderCoatRack({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <path d={pathData[0]} stroke={stroke} {...STROKE_PROPS} />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
