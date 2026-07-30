import { useEffect, useState } from 'react'
import { FloorPlanCanvas } from './components/FloorPlanCanvas'
import { FurnitureContextMenu } from './components/FurnitureContextMenu'
import { SaveStatusIndicator } from './components/SaveStatusIndicator'
import { Sidebar } from './components/Sidebar'
import { useLayoutState } from './hooks/useLayoutState'
import { IconsPreview } from './icons/IconsPreview'
import { debugLog } from './utils/debugLog'
import { getGroupMemberIds } from './utils/furnitureGroups'
import './App.css'

function App() {
  const {
    floorPlan,
    calibration,
    unit,
    setUnit,
    furniture,
    selectedIds,
    selectedFurniture,
    toolMode,
    calibrationPoints,
    scaleDetectionStatus,
    scaleDetectionMessage,
    historyEntries,
    historyIndex,
    canUndo,
    canRedo,
    undo,
    redo,
    jumpToHistory,
    savedPlans,
    activePlanId,
    activePlanName,
    dbReady,
    dbError,
    planLoading,
    openingPlanId,
    planLoadError,
    saveStatus,
    saveError,
    loadFloorPlan,
    openSavedPlan,
    renameActivePlan,
    deleteSavedPlan,
    startCalibration,
    cancelCalibration,
    addCalibrationPoint,
    finishCalibration,
    retryScaleDetection,
    addFurniture,
    addFromCatalog,
    addAllCatalog,
    updateFurniture,
    deleteFurniture,
    deleteSelectedFurniture,
    deleteSelectedOrItem,
    moveSelectedLayer,
    resizeSelectedDimensions,
    groupSelectedFurniture,
    ungroupSelectedFurniture,
    renameGroup,
    selectFurniture,
    clearSelection,
    moveFurnitureGroup,
  } = useLayoutState()

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    itemId: string
    itemCount: number
  } | null>(null)

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [contextMenu])

  useEffect(() => {
    const isEditingField = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      )
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingField(e.target)) return

      const mod = e.metaKey || e.ctrlKey

      if (mod) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault()
          redo()
        }
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length === 0) return
        e.preventDefault()
        if (selectedIds.length > 1) {
          deleteSelectedFurniture()
        } else {
          deleteFurniture(selectedIds[0])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, selectedIds, deleteFurniture, deleteSelectedFurniture])

  if (import.meta.env.DEV && window.location.pathname === '/icons') {
    return <IconsPreview />
  }

  return (
    <div className="app">
      <Sidebar
        floorPlanLoaded={!!floorPlan}
        calibration={calibration}
        unit={unit}
        toolMode={toolMode}
        calibrationPointsCount={calibrationPoints.length}
        selectedFurniture={selectedFurniture}
        selectedIds={selectedIds}
        furniture={furniture}
        furnitureCount={furniture.length}
        scaleDetectionStatus={scaleDetectionStatus}
        scaleDetectionMessage={scaleDetectionMessage}
        onUpload={loadFloorPlan}
        onUnitChange={setUnit}
        onStartCalibration={startCalibration}
        onCancelCalibration={cancelCalibration}
        onFinishCalibration={finishCalibration}
        onRetryScaleDetection={retryScaleDetection}
        onAddFurniture={addFurniture}
        onAddFromCatalog={addFromCatalog}
        onAddAllCatalog={addAllCatalog}
        onUpdateFurniture={(id, patch, coalesce) => updateFurniture(id, patch, coalesce ?? true)}
        onDeleteFurniture={deleteFurniture}
        onDeleteSelectedFurniture={deleteSelectedFurniture}
        onGroupSelectedFurniture={groupSelectedFurniture}
        onUngroupSelectedFurniture={ungroupSelectedFurniture}
        onRenameGroup={renameGroup}
        historyEntries={historyEntries}
        historyIndex={historyIndex}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onJumpToHistory={jumpToHistory}
        savedPlans={savedPlans}
        activePlanId={activePlanId}
        activePlanName={activePlanName}
        planLoading={planLoading}
        openingPlanId={openingPlanId}
        onOpenSavedPlan={(id) => {
          debugLog('App', 'onOpenSavedPlan invoked', { id })
          void openSavedPlan(id)
        }}
        onRenameActivePlan={renameActivePlan}
        onDeleteSavedPlan={(id) => void deleteSavedPlan(id)}
      />

      <main className="workspace">
        {!dbReady ? (
          <div className="empty-state">
            <div className="empty-icon">📐</div>
            <h2>Loading floor plans from Firestore…</h2>
          </div>
        ) : planLoading ? (
          <div className="empty-state">
            <div className="empty-icon">📐</div>
            <h2>Opening floor plan…</h2>
            <p>Downloading image from Firebase Storage.</p>
          </div>
        ) : planLoadError ? (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h2>Could not open floor plan</h2>
            <p>{planLoadError}</p>
            <p className="hint">Click Unit 14A in the sidebar to retry, or upload a new plan.</p>
          </div>
        ) : dbError ? (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h2>Could not connect to Firestore</h2>
            <p>{dbError}</p>
          </div>
        ) : !floorPlan ? (
          <div className="empty-state">
            <div className="empty-icon">📐</div>
            <h2>No floor plan open</h2>
            <p>Upload a floor plan or pick one from your saved plans in the sidebar.</p>
          </div>
        ) : (
          <div className="canvas-area">
            {scaleDetectionStatus === 'detecting' && (
              <div className="canvas-banner">Detecting scale bar from floor plan…</div>
            )}
            {toolMode === 'calibrate' && scaleDetectionStatus !== 'detecting' && (
              <div className="canvas-banner">Click two points on a known distance to set scale</div>
            )}
            <SaveStatusIndicator saveStatus={saveStatus} saveError={saveError} />
            {contextMenu && (
              <FurnitureContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                itemCount={contextMenu.itemCount}
                onSendBackward={() => moveSelectedLayer('back')}
                onBringForward={() => moveSelectedLayer('forward')}
                onSendToBack={() => moveSelectedLayer('backmost')}
                onBringToFront={() => moveSelectedLayer('frontmost')}
                onChangeWidth={() => resizeSelectedDimensions('width')}
                onChangeDepth={() => resizeSelectedDimensions('depth')}
                onChangeAllSizes={() => resizeSelectedDimensions('all')}
                onDelete={() => deleteSelectedOrItem(contextMenu.itemId)}
                onClose={() => setContextMenu(null)}
              />
            )}
            <FloorPlanCanvas
              floorPlanUrl={floorPlan.imageUrl}
              floorPlanWidth={floorPlan.width}
              floorPlanHeight={floorPlan.height}
              calibration={calibration}
              furniture={calibration ? furniture : []}
              selectedIds={selectedIds}
              toolMode={toolMode}
              calibrationPoints={calibrationPoints}
              unit={unit}
              onSelectItem={selectFurniture}
              onClearSelection={clearSelection}
              onFurnitureMoveGroup={moveFurnitureGroup}
              onFurnitureTransform={(id, patch) => updateFurniture(id, patch)}
              onItemContextMenu={(id, position) => {
                selectFurniture(id, false)
                setContextMenu({
                  ...position,
                  itemId: id,
                  itemCount: getGroupMemberIds(furniture, id).length,
                })
              }}
              onCanvasClick={addCalibrationPoint}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
