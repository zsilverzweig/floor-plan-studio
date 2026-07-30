import type { FurnitureType, RoomIcon } from '../utils/furnitureTypes'

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
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function FurnitureIcon({
  type,
  size = 14,
  className = '',
}: IconProps & { type: FurnitureType }) {
  const stroke = 'currentColor'
  const sw = 1.25

  switch (type) {
    case 'sofa':
      return (
        <Svg size={size} className={className}>
          <path
            d="M2 9V7a1 1 0 011-1h10a1 1 0 011 1v2M2 9v2a1 1 0 001 1h1v1h8v-1h1a1 1 0 001-1V9M4 6V5a1 1 0 011-1h6a1 1 0 011 1v1"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )
    case 'bed':
      return (
        <Svg size={size} className={className}>
          <path
            d="M2 11V8a1 1 0 011-1h2.5a1 1 0 011 .7l.5 1.5h2l.5-1.5a1 1 0 011-.7H13a1 1 0 011 1v3M2 11h12M3 8V6M13 8V6"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )
    case 'chair':
      return (
        <Svg size={size} className={className}>
          <path
            d="M5 7V5a1 1 0 011-1h4a1 1 0 011 1v2M4 7h8v3a1 1 0 01-1 1H9v2M7 11v2"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )
    case 'stool':
      return (
        <Svg size={size} className={className}>
          <ellipse cx="8" cy="5" rx="4" ry="1.5" stroke={stroke} strokeWidth={sw} />
          <path d="M6 6.5V12M10 6.5V12" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      )
    case 'table':
      return (
        <Svg size={size} className={className}>
          <rect x="2" y="4" width="12" height="2" rx="0.5" stroke={stroke} strokeWidth={sw} />
          <path d="M4 6V12M12 6V12" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      )
    case 'desk':
      return (
        <Svg size={size} className={className}>
          <rect x="2" y="4" width="12" height="2" rx="0.5" stroke={stroke} strokeWidth={sw} />
          <path d="M3 6V12M13 6V12M6 6V9M10 6V9" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      )
    case 'rug':
      return (
        <Svg size={size} className={className}>
          <rect
            x="2.5"
            y="4"
            width="11"
            height="8"
            rx="1"
            stroke={stroke}
            strokeWidth={sw}
            strokeDasharray="2 1.5"
          />
        </Svg>
      )
    case 'storage':
    default:
      return (
        <Svg size={size} className={className}>
          <rect x="3" y="2" width="10" height="12" rx="1" stroke={stroke} strokeWidth={sw} />
          <path d="M3 6h10M3 9h10M3 12h10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      )
  }
}

export function RoomIcon({ room, size = 14, className = '' }: IconProps & { room: RoomIcon }) {
  const stroke = 'currentColor'
  const sw = 1.25

  switch (room) {
    case 'bedroom':
      return <FurnitureIcon type="bed" size={size} className={className} />
    case 'kitchen':
      return (
        <Svg size={size} className={className}>
          <path d="M4 3v5M8 3v10M12 3v7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <circle cx="4" cy="10" r="1" fill={stroke} />
          <circle cx="12" cy="12" r="1" fill={stroke} />
        </Svg>
      )
    case 'hallway':
      return (
        <Svg size={size} className={className}>
          <path
            d="M3 4h10v8H3zM6 8h4M8 6v4"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )
    case 'living':
    default:
      return <FurnitureIcon type="sofa" size={size} className={className} />
  }
}
