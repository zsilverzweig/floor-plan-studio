interface SaveStatusIndicatorProps {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  saveError: string | null
}

function saveStatusLabel(
  saveStatus: SaveStatusIndicatorProps['saveStatus'],
  saveError: string | null,
): string {
  switch (saveStatus) {
    case 'saving':
      return 'Saving…'
    case 'saved':
      return 'Saved to Firestore'
    case 'error':
      return saveError ? `Save failed: ${saveError}` : 'Save failed'
    default:
      return 'Unsaved changes'
  }
}

export function SaveStatusIndicator({ saveStatus, saveError }: SaveStatusIndicatorProps) {
  if (saveStatus === 'idle') return null

  return (
    <div className={`canvas-save-status canvas-save-status-${saveStatus}`} role="status">
      {saveStatusLabel(saveStatus, saveError)}
    </div>
  )
}
