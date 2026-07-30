#!/usr/bin/env node
/**
 * Admin seed via Firestore REST API (uses gcloud credentials).
 * Usage: node scripts/seed-firestore-admin.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const PROJECT = 'zs-floor-plan-studio'

function accessToken() {
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim()
}

function loadImageDimensions(buffer) {
  const view = new Uint8Array(buffer)
  if (view[0] === 0xff && view[1] === 0xd8) {
    let i = 2
    while (i < view.length - 8) {
      if (view[i] !== 0xff) break
      const marker = view[i + 1]
      const len = (view[i + 2] << 8) + view[i + 3]
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
        return { height: (view[i + 5] << 8) + view[i + 6], width: (view[i + 7] << 8) + view[i + 8] }
      }
      i += 2 + len
    }
  }
  throw new Error('Could not parse JPEG dimensions')
}

async function countPlans(token) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/floorPlans?pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const json = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(json))
  return json.documents?.length ?? 0
}

async function uploadImage(token, planId, buffer) {
  const path = `floor-plans/${planId}/image`
  const bucket = `${PROJECT}.firebasestorage.app`
  const res = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'image/jpeg',
      },
      body: buffer,
    },
  )
  const json = await res.json()
  if (!res.ok) throw new Error(`Storage upload failed: ${JSON.stringify(json)}`)
  return path
}

async function writePlan(token, planId, data) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/floorPlans/${planId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: toFirestoreFields(data) }),
    },
  )
  const json = await res.json()
  if (!res.ok) throw new Error(`Firestore write failed: ${JSON.stringify(json)}`)
  return json
}

function toFirestoreFields(obj) {
  const fields = {}
  for (const [key, value] of Object.entries(obj)) {
    fields[key] = toFirestoreValue(value)
  }
  return fields
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'number') return { integerValue: String(value) }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } }
  }
  if (typeof value === 'object') {
    const fields = {}
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v)
    }
    return { mapValue: { fields } }
  }
  throw new Error(`Unsupported value type: ${value}`)
}

async function main() {
  const token = accessToken()
  const count = await countPlans(token)
  if (count > 0) {
    console.log('Floor plans already exist — skipping seed.')
    return
  }

  const imagePath = resolve(root, 'public/samples/unit-14a-floorplan.jpg')
  const buffer = readFileSync(imagePath)
  const { width, height } = loadImageDimensions(buffer)
  const planId = crypto.randomUUID()
  const now = Date.now()

  console.log('Uploading Unit 14A to Storage…')
  const storagePath = await uploadImage(token, planId, buffer)

  console.log('Writing Unit 14A to Firestore…')
  await writePlan(token, planId, {
    name: 'Unit 14A',
    width,
    height,
    imageStoragePath: storagePath,
    imageContentType: 'image/jpeg',
    layout: {
      furniture: [],
      calibration: null,
      unit: 'ft',
    },
    scaleDetectionMessage:
      'Scale will be auto-detected when the plan is opened in the app.',
    createdAt: now,
    updatedAt: now,
  })

  console.log(`Seeded Unit 14A (${planId})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
