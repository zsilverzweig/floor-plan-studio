export type FurnitureFootprintShape = 'rect' | 'circle'

const CIRCLE_CATALOG_IDS = new Set([
  'round-table',
  'nightstand-1',
  'nightstand-2',
  'bar-stool-1',
  'bar-stool-2',
  'coat-rack',
])

export function inferCatalogShape(catalogId: string): FurnitureFootprintShape {
  return CIRCLE_CATALOG_IDS.has(catalogId) ? 'circle' : 'rect'
}

export function resolveFootprintShape(item: {
  shape?: FurnitureFootprintShape
  catalogId?: string
}): FurnitureFootprintShape {
  return item.shape ?? (item.catalogId ? inferCatalogShape(item.catalogId) : 'rect')
}
