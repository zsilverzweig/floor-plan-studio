import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.storageBucket &&
      firebaseConfig.appId,
  )
}

let app: FirebaseApp | null = null

function getApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env and add your Firebase project credentials.',
    )
  }
  app ??= initializeApp(firebaseConfig)
  return app
}

export function getDb() {
  return getFirestore(getApp())
}

let storage: FirebaseStorage | null = null

export function getStorageBucket(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getApp())
    // Defaults are minutes long, which turns a CORS or network failure into a
    // silent hang while the SDK retries. Fail fast so the UI can show an error.
    storage.maxOperationRetryTime = 15_000
    storage.maxUploadRetryTime = 30_000
  }
  return storage
}
