import type { HistoryEntry } from '../hooks/useHistory'
import type { LayoutSnapshot } from '../types'

interface HistoryPanelProps {
  embedded?: boolean
  entries: HistoryEntry<LayoutSnapshot>[]
  currentIndex: number
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onJumpTo: (index: number) => void
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function HistoryPanel({
  embedded = false,
  entries,
  currentIndex,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onJumpTo,
}: HistoryPanelProps) {
  const content =
    entries.length <= 1 ? (
      <>
        <div className="history-toolbar">
          <button type="button" className="btn ghost history-btn" disabled>
            Undo
          </button>
          <button type="button" className="btn ghost history-btn" disabled>
            Redo
          </button>
        </div>
        <p className="hint tight">Edits appear here.</p>
      </>
    ) : (
      <>
        <div className="history-toolbar">
          <button
            type="button"
            className="btn ghost history-btn"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo (⌘Z)"
          >
            Undo
          </button>
          <button
            type="button"
            className="btn ghost history-btn"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo (⌘⇧Z)"
          >
            Redo
          </button>
        </div>
        <ol className="history-list compact">
          {entries.map((entry, i) => {
            const isCurrent = i === currentIndex
            const isFuture = i > currentIndex
            return (
              <li key={`${entry.timestamp}-${i}`}>
                <button
                  type="button"
                  className={`history-item${isCurrent ? ' current' : ''}${isFuture ? ' future' : ''}`}
                  onClick={() => onJumpTo(i)}
                  title={formatTime(entry.timestamp)}
                >
                  <span className="history-item-label">{entry.label}</span>
                  <span className="history-item-time">{formatTime(entry.timestamp)}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="hint tight">
          {currentIndex + 1}/{entries.length} · ⌘Z · ⌘⇧Z
        </p>
      </>
    )

  if (embedded) return <div className="history-embedded">{content}</div>

  return (
    <section className="panel history-panel">
      <h2>History</h2>
      {content}
    </section>
  )
}
