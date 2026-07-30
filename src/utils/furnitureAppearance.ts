export const FURNITURE_COLOR_SWATCHES = [
  '#c084fc',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#fb923c',
  '#2a2a2e',
  '#44403c',
  '#57534e',
  '#78716c',
  '#94a3b8',
  '#D6C4A8',
  '#6366f1',
  '#ffffff',
  '#0f172a',
] as const

export function applyFurniturePatch(
  item: { textureUrl?: string },
  patch: Partial<{ textureUrl?: string }>,
): typeof item {
  const next = { ...item, ...patch }
  if ('textureUrl' in patch && patch.textureUrl === undefined) {
    delete next.textureUrl
  }
  return next
}
