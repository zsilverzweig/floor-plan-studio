import type { FurnitureItem } from '../types'

export function moveItemsForward(
  items: FurnitureItem[],
  ids: Set<string>,
): FurnitureItem[] {
  const result = [...items]
  let moved = false
  for (let i = result.length - 2; i >= 0; i--) {
    if (ids.has(result[i].id) && !ids.has(result[i + 1].id)) {
      ;[result[i], result[i + 1]] = [result[i + 1], result[i]]
      moved = true
    }
  }
  return moved ? result : items
}

export function moveItemsBackward(
  items: FurnitureItem[],
  ids: Set<string>,
): FurnitureItem[] {
  const result = [...items]
  let moved = false
  for (let i = 1; i < result.length; i++) {
    if (ids.has(result[i].id) && !ids.has(result[i - 1].id)) {
      ;[result[i], result[i - 1]] = [result[i - 1], result[i]]
      moved = true
    }
  }
  return moved ? result : items
}

export function moveItemsToBack(
  items: FurnitureItem[],
  ids: Set<string>,
): FurnitureItem[] {
  const selected = items.filter((item) => ids.has(item.id))
  if (selected.length === 0 || selected.length === items.length) return items
  const rest = items.filter((item) => !ids.has(item.id))
  return [...selected, ...rest]
}

export function moveItemsToFront(
  items: FurnitureItem[],
  ids: Set<string>,
): FurnitureItem[] {
  const selected = items.filter((item) => ids.has(item.id))
  if (selected.length === 0 || selected.length === items.length) return items
  const rest = items.filter((item) => !ids.has(item.id))
  return [...rest, ...selected]
}
