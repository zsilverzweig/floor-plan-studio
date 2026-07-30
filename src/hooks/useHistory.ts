import { useCallback, useRef, useState } from 'react'

export interface HistoryEntry<T> {
  snapshot: T
  label: string
  timestamp: number
}

const COALESCE_MS = 500

export function useHistory<T>(initialSnapshot: T, maxEntries = 100) {
  const [entries, setEntries] = useState<HistoryEntry<T>[]>([
    { snapshot: initialSnapshot, label: 'Initial state', timestamp: Date.now() },
  ])
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  const entriesLengthRef = useRef(1)
  const coalesceActiveRef = useRef(false)
  const coalesceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  indexRef.current = index
  entriesLengthRef.current = entries.length
  const present = entries[index]?.snapshot ?? initialSnapshot

  const push = useCallback(
    (snapshot: T, label: string) => {
      coalesceActiveRef.current = false
      if (coalesceTimerRef.current) {
        clearTimeout(coalesceTimerRef.current)
        coalesceTimerRef.current = null
      }

      setEntries((prev) => {
        const currentIndex = indexRef.current
        const truncated = prev.slice(0, currentIndex + 1)
        const newEntry: HistoryEntry<T> = { snapshot, label, timestamp: Date.now() }
        let next = [...truncated, newEntry]
        let newIndex = next.length - 1

        if (next.length > maxEntries) {
          next = next.slice(next.length - maxEntries)
          newIndex = next.length - 1
        }

        indexRef.current = newIndex
        setIndex(newIndex)
        return next
      })
    },
    [maxEntries],
  )

  const replacePresent = useCallback((snapshot: T) => {
    setEntries((prev) => {
      const currentIndex = indexRef.current
      return prev.map((entry, i) => (i === currentIndex ? { ...entry, snapshot } : entry))
    })
  }, [])

  const pushCoalesced = useCallback(
    (snapshot: T, label: string) => {
      if (coalesceActiveRef.current) {
        replacePresent(snapshot)
      } else {
        push(snapshot, label)
        coalesceActiveRef.current = true
      }

      if (coalesceTimerRef.current) clearTimeout(coalesceTimerRef.current)
      coalesceTimerRef.current = setTimeout(() => {
        coalesceActiveRef.current = false
        coalesceTimerRef.current = null
      }, COALESCE_MS)
    },
    [push, replacePresent],
  )

  const undo = useCallback(() => {
    coalesceActiveRef.current = false
    if (coalesceTimerRef.current) {
      clearTimeout(coalesceTimerRef.current)
      coalesceTimerRef.current = null
    }

    setIndex((current) => {
      if (current <= 0) return current
      const newIndex = current - 1
      indexRef.current = newIndex
      return newIndex
    })
  }, [])

  const redo = useCallback(() => {
    coalesceActiveRef.current = false
    if (coalesceTimerRef.current) {
      clearTimeout(coalesceTimerRef.current)
      coalesceTimerRef.current = null
    }

    setIndex((current) => {
      if (current >= entriesLengthRef.current - 1) return current
      const newIndex = current + 1
      indexRef.current = newIndex
      return newIndex
    })
  }, [])

  const jumpTo = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= entriesLengthRef.current) return
    coalesceActiveRef.current = false
    if (coalesceTimerRef.current) {
      clearTimeout(coalesceTimerRef.current)
      coalesceTimerRef.current = null
    }
    indexRef.current = targetIndex
    setIndex(targetIndex)
  }, [])

  const reset = useCallback((snapshot: T, label = 'Initial state') => {
    coalesceActiveRef.current = false
    if (coalesceTimerRef.current) {
      clearTimeout(coalesceTimerRef.current)
      coalesceTimerRef.current = null
    }
    const entry: HistoryEntry<T> = { snapshot, label, timestamp: Date.now() }
    setEntries([entry])
    indexRef.current = 0
    setIndex(0)
  }, [])

  return {
    present,
    entries,
    index,
    push,
    pushCoalesced,
    replacePresent,
    undo,
    redo,
    jumpTo,
    reset,
    canUndo: index > 0,
    canRedo: index < entries.length - 1,
  }
}
