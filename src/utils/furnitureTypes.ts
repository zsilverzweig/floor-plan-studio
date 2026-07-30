export type FurnitureType =
  | 'sofa'
  | 'bed'
  | 'chair'
  | 'stool'
  | 'table'
  | 'desk'
  | 'storage'
  | 'rug'

export const FURNITURE_TYPE_LABELS: Record<FurnitureType, string> = {
  sofa: 'Sofa',
  bed: 'Bed',
  chair: 'Chair',
  stool: 'Stool',
  table: 'Table',
  desk: 'Desk',
  storage: 'Storage',
  rug: 'Rug',
}

export function inferFurnitureType(id: string, kind: 'furniture' | 'rug'): FurnitureType {
  if (kind === 'rug') return 'rug'
  if (id.includes('sofa') || id.includes('couch') || id.includes('ottoman')) return 'sofa'
  if (id.includes('bed')) return 'bed'
  if (id.includes('stool')) return 'stool'
  if (id.includes('chair')) return 'chair'
  if (id.includes('desk')) return 'desk'
  if (id.includes('table') || id.includes('coffee')) return 'table'
  if (
    id.includes('dresser') ||
    id.includes('nightstand') ||
    id.includes('bookshelf') ||
    id.includes('bar-cart') ||
    id.includes('coat-rack') ||
    id.includes('tv-console')
  ) {
    return 'storage'
  }
  return 'storage'
}

export type RoomIcon = 'living' | 'bedroom' | 'kitchen' | 'hallway'

export function roomIcon(room: string): RoomIcon {
  if (room === 'Bedroom') return 'bedroom'
  if (room === 'Kitchen') return 'kitchen'
  if (room === 'Hallway') return 'hallway'
  return 'living'
}
