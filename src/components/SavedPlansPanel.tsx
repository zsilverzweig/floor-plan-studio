import type { SavedFloorPlanSummary } from '../types'
import { debugLog } from '../utils/debugLog'

interface SavedPlansPanelProps {
  plans: SavedFloorPlanSummary[]
  activePlanId: string | null
  activePlanName: string
  planLoading: boolean
  openingPlanId: string | null
  onOpenPlan: (id: string) => void
  onRenamePlan: (name: string) => void
  onDeletePlan: (id: string) => void
}

function confirmDeletePlan(plan: SavedFloorPlanSummary): boolean {
  return window.confirm(
    `Delete "${plan.name}"?\n\nThis removes only this saved plan (image + layout) from Firestore. Other plans are not affected.`,
  )
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
  planLoading,
  openingPlanId,
  onOpenPlan,
  onRenamePlan,
  onDeletePlan,
}: SavedPlansPanelProps) {
  if (plans.length === 0) return null

  const activePlan = activePlanId ? plans.find((p) => p.id === activePlanId) : null
  const switchablePlans = activePlan ? plans.filter((p) => p.id !== activePlanId) : plans

  const handleDelete = (plan: SavedFloorPlanSummary) => {
    if (!confirmDeletePlan(plan)) return
    onDeletePlan(plan.id)
  }

  return (
    <div className="saved-plans">
      {activePlan && (
        <div className="saved-plan-open">
          <p className="saved-plan-section-label">Open plan</p>
          <label className="field compact">
            <span>Name</span>
            <input
              value={activePlanName}
              onChange={(e) => onRenamePlan(e.target.value)}
              placeholder="Floor plan name"
            />
          </label>
          <p className="saved-plan-open-meta">
            {activePlan.furnitureCount} item{activePlan.furnitureCount !== 1 ? 's' : ''} ·{' '}
            {formatUpdatedAt(activePlan.updatedAt)}
            {planLoading && activePlan.id === openingPlanId ? ' · opening…' : ''}
          </p>
        </div>
      )}

      {switchablePlans.length > 0 && (
        <>
          <p className="saved-plan-section-label">
            {activePlan ? 'Switch plan' : 'Saved plans'} ({switchablePlans.length})
          </p>
          <ul className="saved-plans-list">
            {switchablePlans.map((plan) => (
              <li key={plan.id}>
                <button
                  type="button"
                  className="saved-plan-item"
                  onClick={() => {
                    debugLog('SavedPlansPanel', 'plan clicked', {
                      id: plan.id,
                      name: plan.name,
                      activePlanId,
                    })
                    onOpenPlan(plan.id)
                  }}
                >
                  <span className="saved-plan-name">
                    {plan.name}
                    {planLoading && plan.id === openingPlanId ? ' …' : ''}
                  </span>
                  <span className="saved-plan-meta">
                    {plan.furnitureCount} item{plan.furnitureCount !== 1 ? 's' : ''} ·{' '}
                    {formatUpdatedAt(plan.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  className="saved-plan-delete"
                  onClick={() => handleDelete(plan)}
                  title={`Delete this saved plan (${plan.name})`}
                  aria-label={`Delete saved plan ${plan.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <p className="saved-plan-hint">
            × removes only that plan from Firestore, not your furniture catalog.
          </p>
        </>
      )}
    </div>
  )
}
