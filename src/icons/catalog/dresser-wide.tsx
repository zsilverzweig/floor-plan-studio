import { STROKE_PROPS } from '../tokens'
import type { IconRenderProps } from '../types'

export const pathData = ['M2 7.5h12v5H2V7.5z', 'M2 9h12M2 10.5h12M2 12h12']

export function renderDresserWide({ stroke = 'currentColor' }: IconRenderProps) {
  return (
    <>
      <rect
        x="2"
        y="7.5"
        width="12"
        height="5"
        rx="0.5"
        stroke={stroke}
       
        {...STROKE_PROPS}
      />
      <path d={pathData[1]} stroke={stroke} {...STROKE_PROPS} />
    </>
  )
}
