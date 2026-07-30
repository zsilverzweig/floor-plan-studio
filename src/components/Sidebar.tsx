import { useEffect, useState } from 'react'
import type { FurnitureItem, LayoutSnapshot, LengthUnit, ScaleCalibration, SavedFloorPlanSummary } from '../types'
import type { HistoryEntry } from '../hooks/useHistory'
import {
  CATALOG_BY_ROOM,
  FURNITURE_CATALOG,
  ROOM_ORDER,
  type FurnitureCatalogEntry,
} from '../data/furnitureCatalog'
import { formatDimensionInput, roundDimension, UNIT_LABELS } from '../utils/scale'
import {
  dimensionInputHint,
  dimensionPlaceholder,
  parseDimensionExpression,
} from '../utils/parseDimension'
import { sharedGroupInfo } from '../utils/furnitureGroups'
import { FURNITURE_COLOR_SWATCHES } from '../utils/furnitureAppearance'
import { resolveFootprintShape, type FurnitureFootprintShape } from '../utils/furnitureShapes'
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
  selectedIds: string[]
  furniture: FurnitureItem[]
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
    shape?: FurnitureFootprintShape
    textureUrl?: string
    color?: string
  }) => void
  onAddFromCatalog: (entry: FurnitureCatalogEntry) => void
  onAddAllCatalog: () => void
  onUpdateFurniture: (id: string, patch: Partial<FurnitureItem>, coalesce?: boolean) => void
  onDeleteFurniture: (id: string) => void
  onDeleteSelectedFurniture: () => void
  onGroupSelectedFurniture: (label?: string) => void
  onUngroupSelectedFurniture: () => void
  onRenameGroup: (groupId: string, label: string) => void
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
  planLoading: boolean
  openingPlanId: string | null
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

function DimensionField({
  label,
  unit,
  value,
  onChange,
  onCommit,
}: {
  label: string
  unit: LengthUnit
  value: string
  onChange: (value: string) => void
  onCommit: () => void
}) {
  return (
    <label className="field compact dimension-field">
      <span>
        {label} ({unit})
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder={dimensionPlaceholder(unit)}
        spellCheck={false}
      />
    </label>
  )
}

function SelectedGroupPanel({
  furniture,
  selectedIds,
  onGroup,
  onUngroup,
  onRenameGroup,
  onDelete,
}: {
  furniture: FurnitureItem[]
  selectedIds: string[]
  onGroup: (label?: string) => void
  onUngroup: () => void
  onRenameGroup: (groupId: string, label: string) => void
  onDelete: () => void
}) {
  const groupInfo = sharedGroupInfo(furniture, selectedIds)
  const [groupLabelText, setGroupLabelText] = useState(groupInfo?.groupLabel ?? '')

  useEffect(() => {
    setGroupLabelText(groupInfo?.groupLabel ?? '')
  }, [groupInfo?.groupId, groupInfo?.groupLabel])

  const selectedItems = selectedIds
    .map((id) => furniture.find((item) => item.id === id))
    .filter((item): item is FurnitureItem => !!item)

  const commitRename = () => {
    if (!groupInfo) return
    const trimmed = groupLabelText.trim()
    if (trimmed && trimmed !== groupInfo.groupLabel) {
      onRenameGroup(groupInfo.groupId, trimmed)
    }
  }

  return (
    <CollapsibleSection
      title="Selected"
      badge={selectedIds.length}
      icon={<CatalogIcon catalogId="harmony-sofa" />}
      defaultOpen
      compact
    >
      {groupInfo ? (
        <>
          <p className="selected-name">{groupInfo.groupLabel}</p>
          <p className="hint tight">
            {groupInfo.memberCount}-piece group · click any member to select all · drag to move
            together
          </p>
          <label className="field compact">
            <span>Group name</span>
            <input
              value={groupLabelText}
              onChange={(e) => setGroupLabelText(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder="e.g. L Couch"
            />
          </label>
          <button type="button" className="btn ghost compact-btn" onClick={onUngroup}>
            Ungroup
          </button>
        </>
      ) : (
        <>
          <p className="selected-name">{selectedIds.length} items selected</p>
          <p className="hint tight">
            Shift-click to add or remove items. Drag any selected item to move them together.
          </p>
          <label className="field compact">
            <span>Group name</span>
            <input
              value={groupLabelText}
              onChange={(e) => setGroupLabelText(e.target.value)}
              placeholder="e.g. L Couch"
            />
          </label>
          <button
            type="button"
            className="btn primary compact-btn"
            disabled={selectedIds.length < 2}
            onClick={() => onGroup(groupLabelText)}
          >
            Group {selectedIds.length} items
          </button>
        </>
      )}

      <ul className="group-member-list">
        {selectedItems.map((item) => (
          <li key={item.id}>{item.label ?? item.name}</li>
        ))}
      </ul>

      <button type="button" className="btn danger compact-btn" onClick={onDelete}>
        Delete {selectedIds.length} items
      </button>
    </CollapsibleSection>
  )
}

function SelectedFurnitureEditor({
  item,
  unit,
  onUpdate,
  onDelete,
}: {
  item: FurnitureItem
  unit: LengthUnit
  onUpdate: (patch: Partial<FurnitureItem>, coalesce?: boolean) => void
  onDelete: () => void
}) {
  const isCircle = resolveFootprintShape(item) === 'circle'
  const [widthText, setWidthText] = useState(formatDimensionInput(item.width, unit))
  const [depthText, setDepthText] = useState(formatDimensionInput(item.depth, unit))
  const [rotationText, setRotationText] = useState(String(Math.round(item.rotation)))

  useEffect(() => {
    setWidthText(formatDimensionInput(item.width, unit))
    setDepthText(formatDimensionInput(item.depth, unit))
    setRotationText(String(Math.round(item.rotation)))
  }, [item.id, item.width, item.depth, item.rotation, unit])

  const commitWidth = () => {
    const parsed = parseDimensionExpression(widthText)
    if (parsed !== null && parsed > 0) {
      const width = roundDimension(parsed, unit)
      onUpdate(isCircle ? { width, depth: width } : { width }, false)
      setWidthText(formatDimensionInput(width, unit))
    } else {
      setWidthText(formatDimensionInput(item.width, unit))
    }
  }

  const commitDepth = () => {
    const parsed = parseDimensionExpression(depthText)
    if (parsed !== null && parsed > 0) {
      const depth = roundDimension(parsed, unit)
      onUpdate({ depth }, false)
      setDepthText(formatDimensionInput(depth, unit))
    } else {
      setDepthText(formatDimensionInput(item.depth, unit))
    }
  }

  const commitRotation = () => {
    const rotation = parseFloat(rotationText)
    if (Number.isFinite(rotation)) {
      const rounded = Math.round(rotation)
      onUpdate({ rotation: rounded }, false)
      setRotationText(String(rounded))
    } else {
      setRotationText(String(Math.round(item.rotation)))
    }
  }

  const catalogId = resolveCatalogIconId(item)

  const handleTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (item.textureUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(item.textureUrl)
    }
    onUpdate({ textureUrl: URL.createObjectURL(file) }, false)
    e.target.value = ''
  }

  const clearTexture = () => {
    if (item.textureUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(item.textureUrl)
    }
    onUpdate({ textureUrl: undefined }, false)
  }

  return (
    <CollapsibleSection
      title="Selected"
      icon={catalogId ? <CatalogIcon catalogId={catalogId} /> : <CatalogIcon catalogId="desk" />}
      defaultOpen
      compact
    >
      <p className="selected-name">{item.label ?? item.name}</p>

      <p className="saved-plan-section-label">Size</p>
      <p className="hint tight">{dimensionInputHint(unit)}</p>
      {isCircle ? (
        <DimensionField
          label="Diameter"
          unit={unit}
          value={widthText}
          onChange={setWidthText}
          onCommit={commitWidth}
        />
      ) : (
        <div className="field-row tight">
          <DimensionField
            label="Width"
            unit={unit}
            value={widthText}
            onChange={setWidthText}
            onCommit={commitWidth}
          />
          <DimensionField
            label="Depth"
            unit={unit}
            value={depthText}
            onChange={setDepthText}
            onCommit={commitDepth}
          />
        </div>
      )}

      <p className="hint tight">Or drag the corner handles on the canvas.</p>

      <p className="saved-plan-section-label">Shape & rotation</p>
      <label className="field compact">
        <span>Shape</span>
        <select
          value={resolveFootprintShape(item)}
          onChange={(e) => {
            const shape = e.target.value as FurnitureFootprintShape
            if (shape === 'circle') {
              const diameter = Math.max(item.width, item.depth)
              onUpdate({ shape, width: diameter, depth: diameter }, false)
            } else {
              onUpdate({ shape }, false)
            }
          }}
        >
          <option value="rect">Rectangle</option>
          <option value="circle">Round</option>
        </select>
      </label>
      <label className="field compact">
        <span>Rotation (°)</span>
        <input
          type="number"
          step="15"
          value={rotationText}
          onChange={(e) => setRotationText(e.target.value)}
          onBlur={commitRotation}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </label>

      <p className="saved-plan-section-label">Appearance</p>
      <div className="color-swatches" role="listbox" aria-label="Fill color">
        {FURNITURE_COLOR_SWATCHES.map((color) => (
          <button
            key={color}
            type="button"
            role="option"
            aria-selected={item.color === color}
            className={`color-swatch${item.color === color ? ' selected' : ''}`}
            style={{ backgroundColor: color }}
            title={color}
            onClick={() => onUpdate({ color }, false)}
          />
        ))}
      </div>
      <label className="file-button secondary compact-btn">
        {item.textureUrl ? 'Change texture' : 'Add texture'}
        <input type="file" accept="image/*" onChange={handleTextureUpload} hidden />
      </label>
      {item.textureUrl && (
        <button type="button" className="btn ghost compact-btn" onClick={clearTexture}>
          Remove texture
        </button>
      )}

      <button type="button" className="btn danger compact-btn" onClick={onDelete}>
        Delete
      </button>
    </CollapsibleSection>
  )
}

export function Sidebar({
  floorPlanLoaded,
  calibration,
  unit,
  toolMode,
  calibrationPointsCount,
  selectedFurniture,
  selectedIds,
  furniture,
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
  onDeleteSelectedFurniture,
  onGroupSelectedFurniture,
  onUngroupSelectedFurniture,
  onRenameGroup,
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
  planLoading,
  openingPlanId,
  onOpenSavedPlan,
  onRenameActivePlan,
  onDeleteSavedPlan,
}: SidebarProps) {
  const [calibrationDistance, setCalibrationDistance] = useState('10')
  const [furnitureName, setFurnitureName] = useState('')
  const [furnitureWidth, setFurnitureWidth] = useState('')
  const [furnitureDepth, setFurnitureDepth] = useState('')
  const [furnitureShape, setFurnitureShape] = useState<FurnitureFootprintShape>('rect')
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
    const width = parseDimensionExpression(furnitureWidth)
    const depth =
      furnitureShape === 'circle' ? width : parseDimensionExpression(furnitureDepth)
    if (!furnitureName.trim() || width === null || width <= 0 || depth === null || depth <= 0) {
      return
    }
    onAddFurniture({
      name: furnitureName.trim(),
      width,
      depth,
      shape: furnitureShape,
      textureUrl: furnitureTexture,
      color: '#6366f1',
    })
    setFurnitureName('')
    setFurnitureWidth('')
    setFurnitureDepth('')
  }

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h1>Floor Plan Studio</h1>
      </header>

      <div className="sidebar-main">
      {selectedFurniture && selectedIds.length === 1 && (
        <SelectedFurnitureEditor
          item={selectedFurniture}
          unit={unit}
          onUpdate={(patch, coalesce) => onUpdateFurniture(selectedFurniture.id, patch, coalesce)}
          onDelete={() => onDeleteFurniture(selectedFurniture.id)}
        />
      )}

      {selectedIds.length > 1 && (
        <SelectedGroupPanel
          furniture={furniture}
          selectedIds={selectedIds}
          onGroup={onGroupSelectedFurniture}
          onUngroup={onUngroupSelectedFurniture}
          onRenameGroup={onRenameGroup}
          onDelete={onDeleteSelectedFurniture}
        />
      )}

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

        <CollapsibleGroup title="Add custom piece" icon={<CatalogIcon catalogId="desk" />} defaultOpen>
          <form onSubmit={handleAddFurniture} className="furniture-form compact">
            <label className="field compact">
              <span>Name</span>
              <input
                value={furnitureName}
                onChange={(e) => setFurnitureName(e.target.value)}
                placeholder="e.g. TV Console"
              />
            </label>
            <label className="field compact">
              <span>Shape</span>
              <select
                value={furnitureShape}
                onChange={(e) => setFurnitureShape(e.target.value as FurnitureFootprintShape)}
              >
                <option value="rect">Rectangle</option>
                <option value="circle">Round</option>
              </select>
            </label>
            {furnitureShape === 'circle' ? (
              <DimensionField
                label="Diameter"
                unit={unit}
                value={furnitureWidth}
                onChange={setFurnitureWidth}
                onCommit={() => {}}
              />
            ) : (
              <>
                <p className="hint tight">{dimensionInputHint(unit)}</p>
                <div className="field-row tight">
                  <DimensionField
                    label="Width"
                    unit={unit}
                    value={furnitureWidth}
                    onChange={setFurnitureWidth}
                    onCommit={() => {}}
                  />
                  <DimensionField
                    label="Depth"
                    unit={unit}
                    value={furnitureDepth}
                    onChange={setFurnitureDepth}
                    onCommit={() => {}}
                  />
                </div>
              </>
            )}
            <label className="file-button secondary compact-btn">
              {furnitureTexture ? 'Change texture' : 'Texture (optional)'}
              <input type="file" accept="image/*" onChange={handleTextureUpload} hidden />
            </label>
            <button type="submit" className="btn primary compact-btn" disabled={!calibration}>
              Add to canvas
            </button>
          </form>
        </CollapsibleGroup>

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
            planLoading={planLoading}
            openingPlanId={openingPlanId}
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
                <label className="field compact dimension-field">
                  <span>Distance ({unit})</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={calibrationDistance}
                    onChange={(e) => setCalibrationDistance(e.target.value)}
                    placeholder={dimensionPlaceholder(unit)}
                    spellCheck={false}
                  />
                  <span className="field-hint">{dimensionInputHint(unit)}</span>
                </label>
              )}
              <div className="btn-row tight">
                {calibrationPointsCount === 2 && (
                  <button
                    type="button"
                    className="btn primary compact-btn"
                    onClick={() => {
                      const distance = parseDimensionExpression(calibrationDistance)
                      if (distance !== null && distance > 0) {
                        onFinishCalibration(distance)
                      }
                    }}
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
