interface FurnitureContextMenuProps {
  x: number
  y: number
  itemCount: number
  onSendBackward: () => void
  onBringForward: () => void
  onSendToBack: () => void
  onBringToFront: () => void
  onChangeWidth: () => void
  onChangeDepth: () => void
  onChangeAllSizes: () => void
  onDelete: () => void
  onClose: () => void
}

export function FurnitureContextMenu({
  x,
  y,
  itemCount,
  onSendBackward,
  onBringForward,
  onSendToBack,
  onBringToFront,
  onChangeWidth,
  onChangeDepth,
  onChangeAllSizes,
  onDelete,
  onClose,
}: FurnitureContextMenuProps) {
  const label = itemCount > 1 ? `${itemCount} items` : 'Item'

  return (
    <>
      <div className="context-menu-backdrop" onClick={onClose} onContextMenu={(e) => e.preventDefault()} />
      <menu
        className="furniture-context-menu"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        <li className="context-menu-heading">{label}</li>
        <li>
          <button type="button" onClick={() => { onSendBackward(); onClose() }}>
            Send backward
          </button>
        </li>
        <li>
          <button type="button" onClick={() => { onBringForward(); onClose() }}>
            Bring forward
          </button>
        </li>
        <li>
          <button type="button" onClick={() => { onSendToBack(); onClose() }}>
            Send to back
          </button>
        </li>
        <li>
          <button type="button" onClick={() => { onBringToFront(); onClose() }}>
            Bring to front
          </button>
        </li>
        <li className="context-menu-divider" role="separator" />
        <li>
          <button type="button" onClick={() => { onChangeWidth(); onClose() }}>
            Change width…
          </button>
        </li>
        <li>
          <button type="button" onClick={() => { onChangeDepth(); onClose() }}>
            Change depth…
          </button>
        </li>
        <li>
          <button type="button" onClick={() => { onChangeAllSizes(); onClose() }}>
            Change all sizes…
          </button>
        </li>
        <li className="context-menu-divider" role="separator" />
        <li>
          <button type="button" className="danger" onClick={() => { onDelete(); onClose() }}>
            Delete
          </button>
        </li>
      </menu>
    </>
  )
}
