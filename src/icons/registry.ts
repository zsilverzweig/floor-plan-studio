import { FURNITURE_CATALOG } from '../data/furnitureCatalog'
import type { CatalogIconSlug, RoomIconSlug } from './types'

/**
 * Maps every catalog entry id to its icon slug.
 * Duplicate products share slugs intentionally — see comments.
 */
export const CATALOG_ID_TO_SLUG: Record<string, CatalogIconSlug> = {
  'harmony-sofa': 'sectional-sofa',
  'harmony-ottoman': 'sectional-sofa',
  'l-couch': 'sectional-sofa',
  'coffee-table': 'coffee-table',
  'tv-console': 'dresser-wide',
  desk: 'desk',
  'bar-cart': 'bar-cart',
  'accent-bookshelf': 'bookshelf',
  'round-table': 'round-table',
  // Same side chair product, two instances
  'side-chair-1': 'side-chair',
  'side-chair-2': 'side-chair',
  // Same dining chair product, four instances
  'dining-chair-1': 'dining-chair',
  'dining-chair-2': 'dining-chair',
  'dining-chair-3': 'dining-chair',
  'dining-chair-4': 'dining-chair',
  'rug-living-accent': 'rug-rect',
  'rug-cowhide': 'rug-cowhide',
  bed: 'bed-queen',
  dresser: 'dresser-wide',
  // Same nightstand product, two instances
  'nightstand-1': 'nightstand',
  'nightstand-2': 'nightstand',
  'rug-bedroom': 'rug-rect',
  'accent-chair-bedroom': 'armchair',
  // Same bar stool product, two instances
  'bar-stool-1': 'bar-stool',
  'bar-stool-2': 'bar-stool',
  'coat-rack': 'coat-rack',
  runner: 'rug-runner',
}

export const ROOM_NAME_TO_SLUG: Record<string, RoomIconSlug> = {
  'Living Room': 'living',
  Bedroom: 'bedroom',
  Kitchen: 'kitchen',
  Hallway: 'hallway',
}

export function catalogIconSlug(catalogId: string): CatalogIconSlug | undefined {
  return CATALOG_ID_TO_SLUG[catalogId]
}

export function roomIconSlug(roomName: string): RoomIconSlug {
  return ROOM_NAME_TO_SLUG[roomName] ?? 'living'
}

/** Resolve catalog id for a canvas item (direct id, or match by label/name). */
export function resolveCatalogIconId(item: {
  catalogId?: string
  label?: string
  name: string
}): string | undefined {
  if (item.catalogId && CATALOG_ID_TO_SLUG[item.catalogId]) {
    return item.catalogId
  }
  const byLabel = FURNITURE_CATALOG.find(
    (entry) => entry.label === item.label || entry.name === item.name,
  )
  return byLabel?.id
}

