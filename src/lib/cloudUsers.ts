// Cloud User Sync Service
// When Firebase is configured, all user accounts are synced to Firebase Realtime Database.
// This allows users created by admin to be accessible from ANY device.
// When Firebase is not configured, falls back to localStorage only.

import { ref, get, set, remove, onValue } from 'firebase/database';
import { db, isFirebaseConfigured } from './firebase';
import { User } from '../types';

const CLOUD_USERS_PATH = 'bureau/users';

// ── Read all users from Firebase ──────────────────────────────────────────
export async function fetchCloudUsers(): Promise<User[] | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snapshot = await get(ref(db, CLOUD_USERS_PATH));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data) as User[];
  } catch (e) {
    console.warn('[CloudUsers] fetchCloudUsers failed', e);
    return null;
  }
}

// ── Write all users to Firebase ───────────────────────────────────────────
export async function pushCloudUsers(users: User[]): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const usersMap: Record<string, User> = {};
    users.forEach((u) => { usersMap[u.id] = u; });
    await set(ref(db, CLOUD_USERS_PATH), usersMap);
  } catch (e) {
    console.warn('[CloudUsers] pushCloudUsers failed', e);
  }
}

// ── Delete a single user from Firebase ───────────────────────────────────
export async function deleteCloudUser(userId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await remove(ref(db, `${CLOUD_USERS_PATH}/${userId}`));
  } catch (e) {
    console.warn('[CloudUsers] deleteCloudUser failed', e);
  }
}

// ── Subscribe to live user changes from Firebase ──────────────────────────
export function subscribeCloudUsers(callback: (users: User[]) => void): (() => void) | null {
  if (!isFirebaseConfigured || !db) return null;
  const unsubscribe = onValue(ref(db, CLOUD_USERS_PATH), (snapshot) => {
    if (!snapshot.exists()) { callback([]); return; }
    const data = snapshot.val();
    callback(Object.values(data) as User[]);
  });
  return unsubscribe;
}

export { isFirebaseConfigured };
