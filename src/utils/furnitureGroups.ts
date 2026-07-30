import type { FurnitureItem } from '../types'

export function getGroupMemberIds(furniture: FurnitureItem[], itemId: string): string[] {
  const item = furniture.find((f) => f.id === itemId)
  if (!item?.groupId) return [itemId]
  return furniture.filter((f) => f.groupId === item.groupId).map((f) => f.id)
}

export function resolveMoveIds(
  furniture: FurnitureItem[],
  draggedId: string,
  selectedIds: string[],
): string[] {
  const dragged = furniture.find((f) => f.id === draggedId)
  if (!dragged) return []

  if (selectedIds.includes(draggedId) && selectedIds.length > 1) {
    return selectedIds
  }

  if (dragged.groupId) {
    return furniture.filter((f) => f.groupId === dragged.groupId).map((f) => f.id)
  }

  return [draggedId]
}

export function clearGroupFields(item: FurnitureItem): FurnitureItem {
  const { groupId: _groupId, groupLabel: _groupLabel, ...rest } = item
  return rest
}

/** Drop group metadata when fewer than two members remain. */
export function normalizeGroups(furniture: FurnitureItem[]): FurnitureItem[] {
  const counts = new Map<string, number>()
  for (const item of furniture) {
    if (item.groupId) {
      counts.set(item.groupId, (counts.get(item.groupId) ?? 0) + 1)
    }
  }
  return furniture.map((item) => {
    if (item.groupId && (counts.get(item.groupId) ?? 0) < 2) {
      return clearGroupFields(item)
    }
    return item
  })
}

export function sharedGroupInfo(
  furniture: FurnitureItem[],
  selectedIds: string[],
): { groupId: string; groupLabel: string; memberCount: number } | null {
  if (selectedIds.length === 0) return null

  const selected = selectedIds
    .map((id) => furniture.find((f) => f.id === id))
    .filter((item): item is FurnitureItem => !!item)

  const firstGroupId = selected[0]?.groupId
  if (!firstGroupId) return null
  if (!selected.every((item) => item.groupId === firstGroupId)) return null

  const members = furniture.filter((f) => f.groupId === firstGroupId)
  return {
    groupId: firstGroupId,
    groupLabel: members[0]?.groupLabel ?? 'Group',
    memberCount: members.length,
  }
}
