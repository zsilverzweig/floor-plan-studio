import { useState } from 'react'

interface CollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  badge?: string | number
  defaultOpen?: boolean
  compact?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = true,
  compact = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={`panel collapsible${compact ? ' compact' : ''}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="collapsible-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="collapsible-trigger-left">
          {icon && <span className="collapsible-icon">{icon}</span>}
          <span className="collapsible-title">{title}</span>
          {badge !== undefined && <span className="collapsible-badge">{badge}</span>}
        </span>
        <span className={`collapsible-chevron${open ? ' open' : ''}`} aria-hidden="true">
          ›
        </span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </section>
  )
}

interface CollapsibleGroupProps {
  title: string
  icon?: React.ReactNode
  badge?: string | number
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleGroup({
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
}: CollapsibleGroupProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`collapsible-group${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="collapsible-group-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="collapsible-trigger-left">
          {icon && <span className="collapsible-icon">{icon}</span>}
          <span className="collapsible-group-title">{title}</span>
          {badge !== undefined && <span className="collapsible-badge">{badge}</span>}
        </span>
        <span className={`collapsible-chevron${open ? ' open' : ''}`} aria-hidden="true">
          ›
        </span>
      </button>
      {open && <div className="collapsible-group-body">{children}</div>}
    </div>
  )
}
