import type { RoomIconDefinition, RoomIconSlug } from '../types'
import { renderLiving, pathData as livingPaths } from './living'
import { renderBedroom, pathData as bedroomPaths } from './bedroom'
import { renderKitchen, pathData as kitchenPaths } from './kitchen'
import { renderHallway, pathData as hallwayPaths } from './hallway'

export const ROOM_ICON_DEFINITIONS: Record<RoomIconSlug, RoomIconDefinition> = {
  living: { slug: 'living', render: renderLiving, pathData: livingPaths },
  bedroom: { slug: 'bedroom', render: renderBedroom, pathData: bedroomPaths },
  kitchen: { slug: 'kitchen', render: renderKitchen, pathData: kitchenPaths },
  hallway: { slug: 'hallway', render: renderHallway, pathData: hallwayPaths },
}

export const ROOM_ICON_SLUGS = Object.keys(ROOM_ICON_DEFINITIONS) as RoomIconSlug[]
