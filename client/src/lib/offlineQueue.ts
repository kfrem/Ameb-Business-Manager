/**
 * Offline Queue - Stores transactions locally when offline
 * and syncs them when the connection is restored.
 */

const QUEUE_KEY = 'amt_offline_queue';

export interface QueuedTransaction {
  id: string;
  data: any;
  timestamp: number;
  retries: number;
}

// Get all queued transactions
export function getOfflineQueue(): QueuedTransaction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Add a transaction to the offline queue
export function addToOfflineQueue(data: any): QueuedTransaction {
  const queue = getOfflineQueue();
  const entry: QueuedTransaction = {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    data,
    timestamp: Date.now(),
    retries: 0,
  };
  queue.push(entry);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return entry;
}

// Remove a transaction from the queue (after successful sync)
export function removeFromOfflineQueue(id: string): void {
  const queue = getOfflineQueue().filter(item => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Update retry count for a failed sync attempt
export function updateRetryCount(id: string): void {
  const queue = getOfflineQueue();
  const item = queue.find(q => q.id === id);
  if (item) {
    item.retries += 1;
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Clear the entire queue
export function clearOfflineQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

// Check if we're online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Sync all queued transactions
export async function syncOfflineQueue(
  onSync?: (synced: number, failed: number, total: number) => void
): Promise<{ synced: number; failed: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  // Get user ID for auth header
  const savedUser = localStorage.getItem('amt_user');
  const userId = savedUser ? JSON.parse(savedUser).id : null;
  if (!userId) return { synced: 0, failed: queue.length };

  for (const item of queue) {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify(item.data),
      });

      if (res.ok) {
        removeFromOfflineQueue(item.id);
        synced++;
      } else {
        updateRetryCount(item.id);
        failed++;
      }
    } catch {
      updateRetryCount(item.id);
      failed++;
    }

    onSync?.(synced, failed, queue.length);
  }

  return { synced, failed };
}

// Set up auto-sync when coming back online
let syncListenerAttached = false;

export function setupAutoSync(
  onSyncComplete?: (result: { synced: number; failed: number }) => void
): void {
  if (syncListenerAttached) return;
  syncListenerAttached = true;

  window.addEventListener('online', async () => {
    const queue = getOfflineQueue();
    if (queue.length > 0) {
      const result = await syncOfflineQueue();
      onSyncComplete?.(result);
    }
  });
}
