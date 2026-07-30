import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M2 4h8v8H2V4zM10 6h4v6h-4V6z', 'M4 6h2v2H4V6zM6 10h2v2H6V10z']

export function renderKitchen({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <path d={pathData[0]} stroke={stroke} {...STROKE_PROPS} />
      <circle cx="5" cy="7" r="0.75" fill={stroke} />
      <circle cx="7" cy="11" r="0.75" fill={stroke} />
    </>
  )
}
