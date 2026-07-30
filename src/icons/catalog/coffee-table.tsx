import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M3 7h10v4H3V7z', 'M4 11v1.5M8 11v1.5M12 11v1.5']

export function renderCoffeeTable({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <rect
        x="3"
        y="7"
        width="10"
        height="4"
        rx="0.5"
        stroke={stroke}
       
        {...STROKE_PROPS}
      />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
