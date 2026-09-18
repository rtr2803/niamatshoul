import { supabase } from './supabase';
import {
  getPendingMutations,
  markMutationSynced,
  markMutationError,
  getPendingCount,
  cleanSyncedMutations,
} from './db';
import { useSyncStore } from '@/stores';
import type { QueuedMutation } from '@/types';

const MAX_RETRIES = 5;

/** Process a single queued mutation against Supabase */
async function processMutation(mutation: QueuedMutation): Promise<boolean> {
  try {
    const { table, action, data } = mutation;

    switch (action) {
      case 'INSERT': {
        const { error } = await supabase.from(table).insert(data);
        if (error) {
          // Check for duplicate (idempotency)
          if (error.code === '23505') {
            // Unique constraint violation - already synced
            return true;
          }
          throw error;
        }
        return true;
      }
      case 'UPDATE': {
        const { id, ...updateData } = data;
        const { error } = await supabase.from(table).update(updateData).eq('id', id);
        if (error) throw error;
        return true;
      }
      case 'DELETE': {
        const { error } = await supabase.from(table).delete().eq('id', data.id);
        if (error) throw error;
        return true;
      }
      default:
        console.warn(`Unknown action: ${action}`);
        return false;
    }
  } catch (error: any) {
    console.error(`Sync error for mutation ${mutation.id}:`, error);
    return false;
  }
}

/** Sync all pending mutations to Supabase */
export async function syncPendingMutations(): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> {
  const store = useSyncStore.getState();

  if (!navigator.onLine) {
    store.setStatus('offline');
    return { synced: 0, failed: 0, remaining: await getPendingCount() };
  }

  store.setStatus('syncing');

  const mutations = await getPendingMutations();
  let synced = 0;
  let failed = 0;

  for (const mutation of mutations) {
    if (mutation.retries >= MAX_RETRIES) {
      await markMutationError(mutation.id, 'Max retries exceeded');
      failed++;
      continue;
    }

    const success = await processMutation(mutation);
    if (success) {
      await markMutationSynced(mutation.id);
      synced++;
    } else {
      await markMutationError(mutation.id, 'Sync failed');
      failed++;
    }
  }

  const remaining = await getPendingCount();
  store.setPendingCount(remaining);

  if (failed > 0) {
    store.setStatus('error');
  } else if (remaining === 0) {
    store.setStatus('synced');
    store.setLastSyncAt(new Date().toISOString());
  }

  // Clean old synced mutations
  await cleanSyncedMutations();

  return { synced, failed, remaining };
}

/** Initialize sync monitoring */
export function initSyncEngine() {
  const store = useSyncStore.getState();

  // Listen for online/offline events
  window.addEventListener('online', () => {
    store.setOnline(true);
    // Auto-sync when back online
    syncPendingMutations();
  });

  window.addEventListener('offline', () => {
    store.setOnline(false);
    store.setStatus('offline');
  });

  // Listen for service worker sync messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_REQUESTED') {
        syncPendingMutations();
      }
    });
  }

  // Initial sync check
  if (navigator.onLine) {
    syncPendingMutations();
  } else {
    store.setStatus('offline');
  }

  // Periodic sync check every 5 minutes
  setInterval(() => {
    if (navigator.onLine) {
      syncPendingMutations();
    }
  }, 5 * 60 * 1000);
}
