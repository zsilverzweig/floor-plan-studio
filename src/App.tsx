import { useEffect } from 'react'
import { FloorPlanCanvas } from './components/FloorPlanCanvas'
import { Sidebar } from './components/Sidebar'
import { useLayoutState } from './hooks/useLayoutState'
import { IconsPreview } from './icons/IconsPreview'
import './App.css'

function App() {
  const {
    floorPlan,
    calibration,
    unit,
    setUnit,
    furniture,
    selectedId,
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
    saveStatus,
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
    setSelectedId,
  } = useLayoutState()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

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
        onUpdateFurniture={(id, patch) => updateFurniture(id, patch, true)}
        onDeleteFurniture={deleteFurniture}
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
        saveStatus={saveStatus}
        onOpenSavedPlan={(id) => void openSavedPlan(id)}
        onRenameActivePlan={renameActivePlan}
        onDeleteSavedPlan={(id) => void deleteSavedPlan(id)}
      />

      <main className="workspace">
        {!dbReady ? (
          <div className="empty-state">
            <div className="empty-icon">📐</div>
            <h2>Loading floor plans from Firestore…</h2>
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
            <FloorPlanCanvas
              floorPlanUrl={floorPlan.imageUrl}
              floorPlanWidth={floorPlan.width}
              floorPlanHeight={floorPlan.height}
              calibration={calibration}
              furniture={calibration ? furniture : []}
              selectedId={selectedId}
              toolMode={toolMode}
              calibrationPoints={calibrationPoints}
              unit={unit}
              onSelect={setSelectedId}
              onFurnitureMove={(id, x, y) => updateFurniture(id, { x, y })}
              onFurnitureTransform={(id, patch) => updateFurniture(id, patch)}
              onCanvasClick={addCalibrationPoint}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
