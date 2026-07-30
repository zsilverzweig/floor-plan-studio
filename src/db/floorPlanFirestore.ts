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
import { deleteObject, getBlob, ref, uploadBytes } from 'firebase/storage'
import { getDb, getStorageBucket } from '../firebase/config'
import type { LayoutSnapshot, SavedFloorPlanRecord, SavedFloorPlanSummary } from '../types'

const PLANS_COLLECTION = 'floorPlans'

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

export async function listFloorPlanSummaries(): Promise<SavedFloorPlanSummary[]> {
  const db = getDb()
  const plansQuery = query(collection(db, PLANS_COLLECTION), orderBy('updatedAt', 'desc'))
  const snapshot = await getDocs(plansQuery)
  return snapshot.docs.map((planDoc) =>
    toSummary(planDoc.id, planDoc.data() as FloorPlanDocument),
  )
}

export async function getFloorPlan(id: string): Promise<SavedFloorPlanRecord | null> {
  const db = getDb()
  const planDoc = await getDoc(doc(db, PLANS_COLLECTION, id))
  if (!planDoc.exists()) return null

  const data = planDoc.data() as FloorPlanDocument
  const imageBlob = await getBlob(ref(getStorageBucket(), data.imageStoragePath))
  return toRecord(planDoc.id, data, imageBlob)
}

export async function putFloorPlan(record: SavedFloorPlanRecord): Promise<void> {
  const db = getDb()
  const storage = getStorageBucket()
  const docRef = doc(db, PLANS_COLLECTION, record.id)
  const existing = await getDoc(docRef)

  const imageStoragePath = record.imageStoragePath ?? defaultImagePath(record.id)
  const imageContentType = record.imageContentType ?? (record.imageBlob.type || 'image/jpeg')

  if (!existing.exists()) {
    await uploadBytes(ref(storage, imageStoragePath), record.imageBlob, {
      contentType: imageContentType,
    })
  }

  const payload: FloorPlanDocument = {
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
  }

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
