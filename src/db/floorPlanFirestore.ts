import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore'
import { deleteObject, getBlob, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { getDb, getStorageBucket } from '../firebase/config'
import type { LayoutSnapshot, SavedFloorPlanRecord, SavedFloorPlanSummary } from '../types'
import { debugError, debugLog, debugWarn } from '../utils/debugLog'
import { withTimeout } from '../utils/withTimeout'

const PLANS_COLLECTION = 'floorPlans'
const IMAGE_DOWNLOAD_TIMEOUT_MS = 30_000

interface FloorPlanDocument {
  name: string
  width: number
  height: number
  imageStoragePath: string
  imageContentType: string
  layout: LayoutSnapshot
  scaleDetectionMessage: string | null
  createdAt: number
  updatedAt: number
}

function defaultImagePath(planId: string): string {
  return `floor-plans/${planId}/image`
}

function toSummary(id: string, data: FloorPlanDocument): SavedFloorPlanSummary {
  return {
    id,
    name: data.name,
    width: data.width,
    height: data.height,
    updatedAt: data.updatedAt,
    furnitureCount: data.layout.furniture.length,
  }
}

function toRecord(id: string, data: FloorPlanDocument, imageBlob: Blob): SavedFloorPlanRecord {
  return {
    id,
    name: data.name,
    width: data.width,
    height: data.height,
    imageBlob,
    imageStoragePath: data.imageStoragePath,
    imageContentType: data.imageContentType,
    layout: data.layout,
    scaleDetectionMessage: data.scaleDetectionMessage,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

/** Firebase storage errors carry `code`/`serverResponse` that plain logging drops. */
function storageErrorDetails(error: unknown): Record<string, unknown> {
  const candidate = error as { code?: string; message?: string; serverResponse?: string }
  return {
    code: candidate?.code,
    message: candidate?.message ?? String(error),
    serverResponse: candidate?.serverResponse,
  }
}

/** Remove undefined values — Firestore rejects them on write. */
function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined || value === null) return value
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as T
  }
  if (typeof value === 'object' && !(value instanceof Blob) && !(value instanceof Date)) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) {
        result[key] = sanitizeForFirestore(val)
      }
    }
    return result as T
  }
  return value
}

async function downloadPlanImage(storagePath: string): Promise<Blob> {
  const storageRef = ref(getStorageBucket(), storagePath)

  try {
    const url = await withTimeout(
      getDownloadURL(storageRef),
      IMAGE_DOWNLOAD_TIMEOUT_MS,
      'Storage getDownloadURL',
    )
    debugLog('floorPlanFirestore', 'fetching image via download URL')
    const response = await withTimeout(fetch(url), IMAGE_DOWNLOAD_TIMEOUT_MS, 'Image fetch')
    if (!response.ok) {
      throw new Error(`Image fetch failed (${response.status})`)
    }
    return await response.blob()
  } catch (urlError) {
    debugWarn('floorPlanFirestore', 'download URL path failed, trying getBlob', {
      ...storageErrorDetails(urlError),
      hint: 'A hang or opaque failure here usually means the bucket is missing a CORS config (npm run firebase:cors).',
    })
    return withTimeout(getBlob(storageRef), IMAGE_DOWNLOAD_TIMEOUT_MS, 'Storage getBlob')
  }
}

export async function listFloorPlanSummaries(): Promise<SavedFloorPlanSummary[]> {
  debugLog('floorPlanFirestore', 'listFloorPlanSummaries start')
  const db = getDb()
  const plansQuery = query(collection(db, PLANS_COLLECTION), orderBy('updatedAt', 'desc'))
  const snapshot = await getDocs(plansQuery)
  const summaries = snapshot.docs.map((planDoc) =>
    toSummary(planDoc.id, planDoc.data() as FloorPlanDocument),
  )
  debugLog('floorPlanFirestore', 'listFloorPlanSummaries done', { count: summaries.length })
  return summaries
}

export async function getFloorPlanDocument(id: string): Promise<FloorPlanDocument & { id: string } | null> {
  const db = getDb()
  const planDoc = await getDoc(doc(db, PLANS_COLLECTION, id))
  if (!planDoc.exists()) return null
  return { id: planDoc.id, ...(planDoc.data() as FloorPlanDocument) }
}

export async function getFloorPlan(id: string): Promise<SavedFloorPlanRecord | null> {
  debugLog('floorPlanFirestore', 'getFloorPlan start', { id })
  const db = getDb()
  const planDoc = await getDoc(doc(db, PLANS_COLLECTION, id))
  if (!planDoc.exists()) {
    debugLog('floorPlanFirestore', 'getFloorPlan — document not found', { id })
    return null
  }

  const data = planDoc.data() as FloorPlanDocument
  debugLog('floorPlanFirestore', 'getFloorPlan — fetching Storage blob', {
    id,
    imageStoragePath: data.imageStoragePath,
  })
  try {
    const started = performance.now()
    const imageBlob = await downloadPlanImage(data.imageStoragePath)
    debugLog('floorPlanFirestore', 'getFloorPlan — blob downloaded', {
      id,
      bytes: imageBlob.size,
      elapsedMs: Math.round(performance.now() - started),
    })
    return toRecord(planDoc.id, data, imageBlob)
  } catch (error) {
    debugError('floorPlanFirestore', 'getFloorPlan — image download failed', {
      id,
      imageStoragePath: data.imageStoragePath,
      ...storageErrorDetails(error),
    })
    throw error
  }
}

export async function putFloorPlan(record: SavedFloorPlanRecord): Promise<void> {
  const db = getDb()
  const storage = getStorageBucket()
  const docRef = doc(db, PLANS_COLLECTION, record.id)
  const existing = await getDoc(docRef)

  const imageStoragePath = record.imageStoragePath ?? defaultImagePath(record.id)
  const imageContentType = record.imageContentType ?? (record.imageBlob.type || 'image/jpeg')

  if (!existing.exists()) {
    if (!record.imageBlob?.size) {
      throw new Error('Cannot create a floor plan without an image')
    }
    await uploadBytes(ref(storage, imageStoragePath), record.imageBlob, {
      contentType: imageContentType,
    })
  }

  const payload: FloorPlanDocument = sanitizeForFirestore({
    name: record.name,
    width: record.width,
    height: record.height,
    imageStoragePath,
    imageContentType,
    layout: record.layout,
    scaleDetectionMessage: record.scaleDetectionMessage,
    createdAt: existing.exists()
      ? (existing.data() as FloorPlanDocument).createdAt
      : record.createdAt,
    updatedAt: record.updatedAt,
  })

  debugLog('floorPlanFirestore', 'putFloorPlan', {
    id: record.id,
    furnitureCount: record.layout.furniture.length,
    isNew: !existing.exists(),
  })
  await setDoc(docRef, payload)
}

export async function deleteFloorPlan(id: string): Promise<void> {
  const db = getDb()
  const storage = getStorageBucket()
  const docRef = doc(db, PLANS_COLLECTION, id)
  const existing = await getDoc(docRef)

  if (existing.exists()) {
    const data = existing.data() as FloorPlanDocument
    try {
      await deleteObject(ref(storage, data.imageStoragePath))
    } catch {
      // Image may already be gone; still delete the document.
    }
    await deleteDoc(docRef)
  }
}

export async function countFloorPlans(): Promise<number> {
  const db = getDb()
  const snapshot = await getDocs(collection(db, PLANS_COLLECTION))
  return snapshot.size
}
