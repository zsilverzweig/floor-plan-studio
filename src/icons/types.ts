import type { ReactNode } from 'react'

export type CatalogIconSlug =
  | 'sectional-sofa'
  | 'coffee-table'
  | 'desk'
  | 'bar-cart'
  | 'bookshelf'
  | 'round-table'
  | 'side-chair'
  | 'dining-chair'
  | 'rug-rect'
  | 'rug-cowhide'
  | 'bed-queen'
  | 'dresser-wide'
  | 'nightstand'
  | 'armchair'
  | 'bar-stool'
  | 'coat-rack'
  | 'rug-runner'

export type RoomIconSlug = 'living' | 'bedroom' | 'kitchen' | 'hallway'

export interface IconRenderProps {
  stroke?: string
}

export type IconRenderer = (props: IconRenderProps) => ReactNode

export interface CatalogIconDefinition {
  slug: CatalogIconSlug
  render: IconRenderer
  /** Normalized path `d` values for duplicate detection in validate-icons */
  pathData: string[]
}

export interface RoomIconDefinition {
  slug: RoomIconSlug
  render: IconRenderer
  pathData: string[]
}
