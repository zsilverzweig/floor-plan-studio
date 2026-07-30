import type { SavedFloorPlanSummary } from '../types'

interface SavedPlansPanelProps {
  plans: SavedFloorPlanSummary[]
  activePlanId: string | null
  activePlanName: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onOpenPlan: (id: string) => void
  onRenamePlan: (name: string) => void
  onDeletePlan: (id: string) => void
}

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function SavedPlansPanel({
  plans,
  activePlanId,
  activePlanName,
  saveStatus,
  onOpenPlan,
  onRenamePlan,
  onDeletePlan,
}: SavedPlansPanelProps) {
  if (plans.length === 0) return null

  return (
    <div className="saved-plans">
      {activePlanId && (
        <label className="field compact">
          <span>Plan name</span>
          <input
            value={activePlanName}
            onChange={(e) => onRenamePlan(e.target.value)}
            placeholder="Floor plan name"
          />
        </label>
      )}

      <div className="save-status-row">
        <span className={`save-status save-status-${saveStatus}`}>
          {saveStatus === 'saving'
            ? 'Saving…'
            : saveStatus === 'saved'
              ? 'Saved to Firestore'
              : saveStatus === 'error'
                ? 'Save failed'
                : 'Unsaved changes'}
        </span>
      </div>

      <ul className="saved-plans-list">
        {plans.map((plan) => {
          const isActive = plan.id === activePlanId
          return (
            <li key={plan.id} className={isActive ? 'active' : undefined}>
              <button
                type="button"
                className="saved-plan-item"
                onClick={() => onOpenPlan(plan.id)}
                disabled={isActive}
              >
                <span className="saved-plan-name">{plan.name}</span>
                <span className="saved-plan-meta">
                  {plan.furnitureCount} item{plan.furnitureCount !== 1 ? 's' : ''} ·{' '}
                  {formatUpdatedAt(plan.updatedAt)}
                </span>
              </button>
              {!isActive && (
                <button
                  type="button"
                  className="saved-plan-delete"
                  onClick={() => onDeletePlan(plan.id)}
                  title={`Delete ${plan.name}`}
                  aria-label={`Delete ${plan.name}`}
                >
                  ×
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
