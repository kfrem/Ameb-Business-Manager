import { useState, useEffect } from 'react';
import { WifiOff, Wifi, CloudUpload, Loader2 } from 'lucide-react';
import { getOfflineQueue, syncOfflineQueue, setupAutoSync } from '@/lib/offlineQueue';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check queue count periodically
    const interval = setInterval(() => {
      setQueueCount(getOfflineQueue().length);
    }, 2000);

    // Set up auto-sync
    setupAutoSync(async (result) => {
      if (result.synced > 0) {
        toast({
          title: `${result.synced} transaction${result.synced > 1 ? 's' : ''} synced!`,
          description: result.failed > 0 ? `${result.failed} failed - will retry` : undefined,
        });
        // Refresh dashboard and transaction data
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
      }
      setQueueCount(getOfflineQueue().length);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [toast]);

  const handleManualSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue();
      if (result.synced > 0) {
        toast({
          title: `${result.synced} transaction${result.synced > 1 ? 's' : ''} synced!`,
          description: result.failed > 0 ? `${result.failed} failed - will retry` : undefined,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
      }
      setQueueCount(getOfflineQueue().length);
    } finally {
      setIsSyncing(false);
    }
  };

  // Show nothing if online and no queued items
  if (isOnline && queueCount === 0) return null;

  return (
    <div
      className={`fixed top-14 left-0 right-0 z-50 px-4 py-2 text-sm font-medium flex items-center justify-between ${
        !isOnline
          ? 'bg-red-500 text-white'
          : 'bg-yellow-500 text-yellow-950'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You're offline — entries will be saved locally</span>
          </>
        ) : (
          <>
            <CloudUpload className="w-4 h-4" />
            <span>{queueCount} pending transaction{queueCount !== 1 ? 's' : ''} to sync</span>
          </>
        )}
      </div>

      {isOnline && queueCount > 0 && (
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-1 px-3 py-1 rounded bg-yellow-700 text-white text-xs font-semibold hover:bg-yellow-800 disabled:opacity-50"
        >
          {isSyncing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Wifi className="w-3 h-3" />
          )}
          Sync Now
        </button>
      )}
    </div>
  );
}
