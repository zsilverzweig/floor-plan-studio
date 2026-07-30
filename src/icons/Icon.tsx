import { CATALOG_ICON_DEFINITIONS } from './catalog'
import { catalogIconSlug } from './registry'
import { ROOM_ICON_DEFINITIONS } from './rooms'
import { roomIconSlug } from './registry'
import { DEFAULT_ICON_SIZE, VIEW_BOX } from './tokens'

interface IconProps {
  size?: number
  className?: string
}

function Svg({
  size,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function CatalogIcon({
  catalogId,
  size = DEFAULT_ICON_SIZE,
  className = '',
}: IconProps & { catalogId: string }) {
  const slug = catalogIconSlug(catalogId)
  const definition = slug ? CATALOG_ICON_DEFINITIONS[slug] : undefined

  if (!definition) {
    return (
      <Svg size={size} className={className}>
        <rect x="3" y="3" width="10" height="10" rx="1" stroke="currentColor" strokeWidth={1.25} />
      </Svg>
    )
  }

  return (
    <Svg size={size} className={className}>
      {definition.render({ stroke: 'currentColor' })}
    </Svg>
  )
}

export function RoomIcon({
  room,
  size = DEFAULT_ICON_SIZE,
  className = '',
}: IconProps & { room: string }) {
  const slug = roomIconSlug(room)
  const definition = ROOM_ICON_DEFINITIONS[slug]

  return (
    <Svg size={size} className={className}>
      {definition.render({ stroke: 'currentColor' })}
    </Svg>
  )
}

export function CatalogIconBySlug({
  slug,
  size = DEFAULT_ICON_SIZE,
  className = '',
}: IconProps & { slug: keyof typeof CATALOG_ICON_DEFINITIONS }) {
  const definition = CATALOG_ICON_DEFINITIONS[slug]
  return (
    <Svg size={size} className={className}>
      {definition.render({ stroke: 'currentColor' })}
    </Svg>
  )
}

export function RoomIconBySlug({
  slug,
  size = DEFAULT_ICON_SIZE,
  className = '',
}: IconProps & { slug: keyof typeof ROOM_ICON_DEFINITIONS }) {
  const definition = ROOM_ICON_DEFINITIONS[slug]
  return (
    <Svg size={size} className={className}>
      {definition.render({ stroke: 'currentColor' })}
    </Svg>
  )
}
