import { useState } from 'react'
import type { FurnitureItem, LayoutSnapshot, LengthUnit, ScaleCalibration, SavedFloorPlanSummary } from '../types'
import type { HistoryEntry } from '../hooks/useHistory'
import {
  CATALOG_BY_ROOM,
  FURNITURE_CATALOG,
  ROOM_ORDER,
  type FurnitureCatalogEntry,
} from '../data/furnitureCatalog'
import { UNIT_LABELS } from '../utils/scale'
import { CatalogIcon, RoomIcon, resolveCatalogIconId } from '../icons'
import { CollapsibleGroup, CollapsibleSection } from './CollapsibleSection'
import { HistoryPanel } from './HistoryPanel'
import { SavedPlansPanel } from './SavedPlansPanel'

interface SidebarProps {
  floorPlanLoaded: boolean
  calibration: ScaleCalibration | null
  unit: LengthUnit
  toolMode: 'select' | 'calibrate'
  calibrationPointsCount: number
  selectedFurniture: FurnitureItem | null
  furnitureCount: number
  scaleDetectionStatus: 'idle' | 'detecting' | 'found' | 'failed'
  scaleDetectionMessage: string | null
  onUpload: (file: File) => void
  onUnitChange: (unit: LengthUnit) => void
  onStartCalibration: () => void
  onCancelCalibration: () => void
  onFinishCalibration: (distance: number) => void
  onRetryScaleDetection: () => void
  onAddFurniture: (item: {
    name: string
    width: number
    depth: number
    textureUrl?: string
    color?: string
  }) => void
  onAddFromCatalog: (entry: FurnitureCatalogEntry) => void
  onAddAllCatalog: () => void
  onUpdateFurniture: (id: string, patch: Partial<FurnitureItem>) => void
  onDeleteFurniture: (id: string) => void
  historyEntries: HistoryEntry<LayoutSnapshot>[]
  historyIndex: number
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onJumpToHistory: (index: number) => void
  savedPlans: SavedFloorPlanSummary[]
  activePlanId: string | null
  activePlanName: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onOpenSavedPlan: (id: string) => void
  onRenameActivePlan: (name: string) => void
  onDeleteSavedPlan: (id: string) => void
}

function statusGlyph(status: string): string {
  if (status === 'DELIVERED') return '✓'
  if (status === 'IN TRANSIT') return '→'
  if (status === 'ORDERED') return '○'
  return '?'
}

export function Sidebar({
  floorPlanLoaded,
  calibration,
  unit,
  toolMode,
  calibrationPointsCount,
  selectedFurniture,
  furnitureCount,
  scaleDetectionStatus,
  scaleDetectionMessage,
  onUpload,
  onUnitChange,
  onStartCalibration,
  onCancelCalibration,
  onFinishCalibration,
  onRetryScaleDetection,
  onAddFurniture,
  onAddFromCatalog,
  onAddAllCatalog,
  onUpdateFurniture,
  onDeleteFurniture,
  historyEntries,
  historyIndex,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onJumpToHistory,
  savedPlans,
  activePlanId,
  activePlanName,
  saveStatus,
  onOpenSavedPlan,
  onRenameActivePlan,
  onDeleteSavedPlan,
}: SidebarProps) {
  const [calibrationDistance, setCalibrationDistance] = useState('10')
  const [furnitureName, setFurnitureName] = useState('Sofa')
  const [furnitureWidth, setFurnitureWidth] = useState('7')
  const [furnitureDepth, setFurnitureDepth] = useState('3')
  const [furnitureTexture, setFurnitureTexture] = useState<string | undefined>()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = ''
  }

  const handleTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setFurnitureTexture(URL.createObjectURL(file))
    e.target.value = ''
  }

  const handleAddFurniture = (e: React.FormEvent) => {
    e.preventDefault()
    const width = parseFloat(furnitureWidth)
    const depth = parseFloat(furnitureDepth)
    if (!furnitureName.trim() || width <= 0 || depth <= 0) return
    onAddFurniture({
      name: furnitureName.trim(),
      width,
      depth,
      textureUrl: furnitureTexture,
      color: '#6366f1',
    })
  }

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h1>Floor Plan Studio</h1>
      </header>

      <div className="sidebar-main">
      <CollapsibleSection
        title="Inventory"
        badge={FURNITURE_CATALOG.length}
        icon={<CatalogIcon catalogId="harmony-sofa" />}
        defaultOpen
        compact
      >
        <button
          type="button"
          className="btn primary compact-btn"
          disabled={!calibration}
          onClick={onAddAllCatalog}
        >
          Add all ({FURNITURE_CATALOG.length})
        </button>
        {furnitureCount > 0 && (
          <p className="hint tight">{furnitureCount} on canvas</p>
        )}

        {ROOM_ORDER.map((room, i) => {
          const items = CATALOG_BY_ROOM[room]
          if (!items?.length) return null
          return (
            <CollapsibleGroup
              key={room}
              title={room}
              icon={<RoomIcon room={room} />}
              badge={items.length}
              defaultOpen={i === 0}
            >
              <ul className="catalog-list">
                {items.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="catalog-item"
                      disabled={!calibration}
                      title={`${entry.dimensionsNote}\n${entry.status}`}
                      onClick={() => onAddFromCatalog(entry)}
                    >
                      <span className="catalog-icon">
                        <CatalogIcon catalogId={entry.id} />
                      </span>
                      <span className="catalog-item-text">
                        <span className="catalog-label">{entry.label}</span>
                        <span className="catalog-dims">
                          {entry.width.toFixed(1)}×{entry.depth.toFixed(1)}′
                        </span>
                      </span>
                      <span
                        className={`catalog-status status-${entry.status.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        {statusGlyph(entry.status)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </CollapsibleGroup>
          )
        })}
      </CollapsibleSection>

      <CollapsibleSection
        title="Custom"
        icon={<CatalogIcon catalogId="desk" />}
        defaultOpen={false}
        compact
      >
        <form onSubmit={handleAddFurniture} className="furniture-form compact">
          <label className="field compact">
            <input
              value={furnitureName}
              onChange={(e) => setFurnitureName(e.target.value)}
              placeholder="Name"
            />
          </label>
          <div className="field-row tight">
            <label className="field compact">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={furnitureWidth}
                onChange={(e) => setFurnitureWidth(e.target.value)}
                placeholder={`W (${unit})`}
              />
            </label>
            <label className="field compact">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={furnitureDepth}
                onChange={(e) => setFurnitureDepth(e.target.value)}
                placeholder={`D (${unit})`}
              />
            </label>
          </div>
          <label className="file-button secondary compact-btn">
            {furnitureTexture ? 'Change texture' : 'Texture'}
            <input type="file" accept="image/*" onChange={handleTextureUpload} hidden />
          </label>
          <button type="submit" className="btn primary compact-btn" disabled={!calibration}>
            Add
          </button>
        </form>
      </CollapsibleSection>

      {selectedFurniture && (
        <CollapsibleSection
          title="Selected"
          icon={
            (() => {
              const catalogId = resolveCatalogIconId(selectedFurniture)
              return catalogId ? (
                <CatalogIcon catalogId={catalogId} />
              ) : (
                <CatalogIcon catalogId="desk" />
              )
            })()
          }
          defaultOpen
          compact
        >
          <p className="selected-name">{selectedFurniture.label ?? selectedFurniture.name}</p>
          <label className="field compact">
            <input
              type="number"
              step="15"
              value={selectedFurniture.rotation}
              onChange={(e) =>
                onUpdateFurniture(selectedFurniture.id, {
                  rotation: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="Rotation °"
            />
          </label>
          <div className="field-row tight">
            <label className="field compact">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={selectedFurniture.width}
                onChange={(e) =>
                  onUpdateFurniture(selectedFurniture.id, {
                    width: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder={`W (${unit})`}
              />
            </label>
            <label className="field compact">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={selectedFurniture.depth}
                onChange={(e) =>
                  onUpdateFurniture(selectedFurniture.id, {
                    depth: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder={`D (${unit})`}
              />
            </label>
          </div>
          <button
            type="button"
            className="btn danger compact-btn"
            onClick={() => onDeleteFurniture(selectedFurniture.id)}
          >
            Delete
          </button>
        </CollapsibleSection>
      )}

      {floorPlanLoaded && (
        <CollapsibleSection title="History" defaultOpen={false} compact>
          <HistoryPanel
            embedded
            entries={historyEntries}
            currentIndex={historyIndex}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
            onJumpTo={onJumpToHistory}
          />
        </CollapsibleSection>
      )}
      </div>

      <div className="sidebar-footer">
        <CollapsibleSection
          title="Plan"
          icon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.25" />
              <path d="M2 6h12M6 2v12" stroke="currentColor" strokeWidth="1.25" />
            </svg>
          }
          defaultOpen={!floorPlanLoaded}
          compact
        >
          <label className="file-button compact-btn">
            Upload new plan
            <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
          </label>
          <SavedPlansPanel
            plans={savedPlans}
            activePlanId={activePlanId}
            activePlanName={activePlanName}
            saveStatus={saveStatus}
            onOpenPlan={onOpenSavedPlan}
            onRenamePlan={onRenameActivePlan}
            onDeletePlan={onDeleteSavedPlan}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Scale"
          icon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 12h12M4 12V8M8 12V5M12 12V9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
          }
          defaultOpen={!calibration}
          compact
        >
          <label className="field compact">
            <select value={unit} onChange={(e) => onUnitChange(e.target.value as LengthUnit)}>
              {(Object.keys(UNIT_LABELS) as LengthUnit[]).map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </label>

          {scaleDetectionStatus === 'detecting' && (
            <div className="status detecting compact-status">Detecting…</div>
          )}

          {scaleDetectionMessage && scaleDetectionStatus !== 'detecting' && (
            <div
              className={`status compact-status ${scaleDetectionStatus === 'found' ? 'ok' : scaleDetectionStatus === 'failed' ? 'warn' : ''}`}
            >
              <span className="status-text">{scaleDetectionMessage}</span>
              {calibration?.source === 'auto' && <span className="badge">auto</span>}
            </div>
          )}

          {!calibration && toolMode !== 'calibrate' && (
            <button
              type="button"
              className="btn primary compact-btn"
              disabled={!floorPlanLoaded || scaleDetectionStatus === 'detecting'}
              onClick={onStartCalibration}
            >
              Set manually
            </button>
          )}

          {floorPlanLoaded && scaleDetectionStatus !== 'detecting' && (
            <button type="button" className="btn ghost compact-btn" onClick={onRetryScaleDetection}>
              Re-detect
            </button>
          )}

          {toolMode === 'calibrate' && (
            <div className="calibration-help compact">
              <p>Click 2 points ({calibrationPointsCount}/2)</p>
              {calibrationPointsCount === 2 && (
                <label className="field compact">
                  <input
                    type="number"
                    min="0.01"
                    step="0.1"
                    value={calibrationDistance}
                    onChange={(e) => setCalibrationDistance(e.target.value)}
                    placeholder={`Distance (${unit})`}
                  />
                </label>
              )}
              <div className="btn-row tight">
                {calibrationPointsCount === 2 && (
                  <button
                    type="button"
                    className="btn primary compact-btn"
                    onClick={() => onFinishCalibration(parseFloat(calibrationDistance))}
                  >
                    Apply
                  </button>
                )}
                <button type="button" className="btn ghost compact-btn" onClick={onCancelCalibration}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {calibration && toolMode !== 'calibrate' && (
            <button type="button" className="link-btn" onClick={onStartCalibration}>
              Recalibrate
            </button>
          )}
        </CollapsibleSection>
      </div>
    </aside>
  )
}
