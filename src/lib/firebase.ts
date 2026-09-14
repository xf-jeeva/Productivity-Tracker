// Firebase configuration for The Daily Bureau
// Users are stored in Firebase Realtime Database so ALL devices share the same user registry.
// Tasks, notes, etc. remain device-local in localStorage.
//
// Setup: Set these environment variables in your Cloudflare Pages build settings.
// Get them from Firebase Console → Project Settings → Your apps → Web app config.

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.databaseURL &&
  firebaseConfig.apiKey !== 'undefined';

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getDatabase> | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getDatabase(app);
  } catch (e) {
    console.warn('[Firebase] Init failed — using localStorage fallback', e);
  }
}

export { db };
