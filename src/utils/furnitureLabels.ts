export interface FurnitureLabelLayout {
  visible: boolean
  boxX: number
  boxY: number
  boxWidth: number
  boxHeight: number
  nameX: number
  nameY: number
  nameWidth: number
  nameFontSize: number
  dimX: number
  dimY: number
  dimWidth: number
  dimFontSize: number
  showDim: boolean
}

const MIN_FONT = 5
const MAX_NAME_FONT = 11
const MAX_DIM_FONT = 9
const LINE_GAP = 1
const PADDING_Y = 2
const H_PADDING = 2

export function computeFurnitureLabelLayout(params: {
  widthPx: number
  depthPx: number
  isCircle: boolean
  radiusPx: number
}): Omit<FurnitureLabelLayout, 'visible'> & { visible: boolean } {
  const { widthPx, depthPx, isCircle, radiusPx } = params

  const boxWidth = isCircle
    ? Math.max(radiusPx * 2 - H_PADDING * 2, 0)
    : Math.max(widthPx - H_PADDING * 2, 0)
  const maxBoxHeight = isCircle
    ? Math.max(Math.min(radiusPx * 2 - H_PADDING * 2, 28), 0)
    : Math.max(Math.min(depthPx - H_PADDING * 2, 28), 0)

  const minFootprint = isCircle ? radiusPx * 2 : Math.min(widthPx, depthPx)
  if (minFootprint < 14 || boxWidth < 12 || maxBoxHeight < 10) {
    return {
      visible: false,
      boxX: 0,
      boxY: 0,
      boxWidth: 0,
      boxHeight: 0,
      nameX: 0,
      nameY: 0,
      nameWidth: 0,
      nameFontSize: 0,
      dimX: 0,
      dimY: 0,
      dimWidth: 0,
      dimFontSize: 0,
      showDim: false,
    }
  }

  let nameFontSize = MAX_NAME_FONT
  let dimFontSize = MAX_DIM_FONT

  const fits = (name: number, dim: number) =>
    name + (dim > 0 ? LINE_GAP + dim : 0) + PADDING_Y * 2 <= maxBoxHeight

  if (!fits(nameFontSize, dimFontSize)) {
    dimFontSize = 8
    nameFontSize = 9
  }
  if (!fits(nameFontSize, dimFontSize)) {
    dimFontSize = 7
    nameFontSize = 8
  }
  if (!fits(nameFontSize, dimFontSize)) {
    dimFontSize = 0
    nameFontSize = Math.min(9, maxBoxHeight - PADDING_Y * 2)
  }
  while (!fits(nameFontSize, dimFontSize) && nameFontSize > MIN_FONT) {
    nameFontSize--
  }
  if (!fits(nameFontSize, dimFontSize)) {
    dimFontSize = 0
  }
  while (!fits(nameFontSize, 0) && nameFontSize > MIN_FONT) {
    nameFontSize--
  }

  const showDim = dimFontSize > 0 && fits(nameFontSize, dimFontSize)
  const boxHeight = Math.min(
    maxBoxHeight,
    nameFontSize + (showDim ? LINE_GAP + dimFontSize : 0) + PADDING_Y * 2,
  )

  const boxX = isCircle ? -radiusPx + H_PADDING : -widthPx / 2 + H_PADDING
  const boxY = -boxHeight / 2
  const textWidth = isCircle ? radiusPx * 2 : widthPx

  const nameY = boxY + PADDING_Y
  const dimY = showDim ? nameY + nameFontSize + LINE_GAP : nameY

  return {
    visible: true,
    boxX,
    boxY,
    boxWidth,
    boxHeight,
    nameX: isCircle ? -radiusPx : -widthPx / 2,
    nameY,
    nameWidth: textWidth,
    nameFontSize,
    dimX: isCircle ? -radiusPx : -widthPx / 2,
    dimY,
    dimWidth: textWidth,
    dimFontSize: showDim ? dimFontSize : 0,
    showDim,
  }
}
