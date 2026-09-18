import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type { QueuedMutation } from '@/types';

// ==================== INDEXEDDB DATABASE ====================
export class FermeDB extends Dexie {
  mutations!: Table<QueuedMutation, string>;
  cachedData!: Table<{ key: string; data: any; timestamp: number }, string>;

  constructor() {
    super('FermeManagement');
    this.version(1).stores({
      mutations: 'id, table, status, timestamp',
      cachedData: 'key, timestamp',
    });
  }
}

export const db = new FermeDB();

// ==================== MUTATION QUEUE ====================

/** Queue a mutation for offline sync */
export async function queueMutation(
  table: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  data: any
): Promise<string> {
  const id = uuidv4();
  const mutation: QueuedMutation = {
    id,
    table,
    action,
    data,
    timestamp: new Date().toISOString(),
    retries: 0,
    status: 'pending',
  };
  await db.mutations.put(mutation);
  return id;
}

/** Get all pending mutations */
export async function getPendingMutations(): Promise<QueuedMutation[]> {
  return db.mutations
    .where('status')
    .equals('pending')
    .sortBy('timestamp');
}

/** Mark mutation as synced */
export async function markMutationSynced(id: string): Promise<void> {
  await db.mutations.update(id, { status: 'synced' });
}

/** Mark mutation as error */
export async function markMutationError(id: string, error: string): Promise<void> {
  await db.mutations.update(id, {
    status: 'error',
    error,
    retries: (await db.mutations.get(id))?.retries ?? 0 + 1,
  });
}

/** Get pending mutation count */
export async function getPendingCount(): Promise<number> {
  return db.mutations.where('status').equals('pending').count();
}

/** Clear synced mutations older than 24 hours */
export async function cleanSyncedMutations(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await db.mutations
    .where('status')
    .equals('synced')
    .filter((m) => m.timestamp < cutoff)
    .delete();
}

// ==================== DATA CACHE ====================

/** Cache data locally */
export async function cacheData(key: string, data: any): Promise<void> {
  await db.cachedData.put({
    key,
    data,
    timestamp: Date.now(),
  });
}

/** Get cached data */
export async function getCachedData<T>(key: string): Promise<T | null> {
  const record = await db.cachedData.get(key);
  return record?.data ?? null;
}

/** Check if cache is still fresh */
export async function isCacheFresh(key: string, maxAgeMs: number = 5 * 60 * 1000): Promise<boolean> {
  const record = await db.cachedData.get(key);
  if (!record) return false;
  return Date.now() - record.timestamp < maxAgeMs;
}
