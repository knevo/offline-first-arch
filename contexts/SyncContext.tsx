import { imageUploadService } from '@/services/imageUploadService';
import { mutationQueueService } from '@/services/mutationQueueService';
import { deltaSyncServer } from '@/services/syncService';
import { useNetworkState } from 'expo-network';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime?: Date;
  pendingMutations: number;
  pendingImages: number;
}

interface SyncContextValue extends SyncStatus {
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const { isInternetReachable } = useNetworkState();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>(undefined);
  const [pendingMutations, setPendingMutations] = useState(0);
  const [pendingImages, setPendingImages] = useState(0);

  const updatePendingCounts = useCallback(async () => {
    const [mutations, images] = await Promise.all([
      mutationQueueService.getPendingCount(),
      imageUploadService.getPendingCount(),
    ]);
    setPendingMutations(mutations);
    setPendingImages(images);
  }, []);

  const triggerSync = useCallback(async () => {
    if (isSyncing || !isInternetReachable) {
      return;
    }

    setIsSyncing(true);

    try {
      // 1. Delta sync (pull changes)
      console.log('[SyncContext] Starting delta sync...');
      const deltaResult = await deltaSyncServer();
      console.log(`[SyncContext] Delta sync: ${deltaResult.count} changes`);

      // 2. Process mutation queue (push changes - small requests first)
      console.log('[SyncContext] Processing mutation queue...');
      const mutationResult = await mutationQueueService.processQueue();
      console.log(
        `[SyncContext] Mutations: ${mutationResult.processed} processed, ${mutationResult.failed} failed`,
      );

      // 3. Process image uploads (large requests - independent)
      console.log('[SyncContext] Processing image uploads...');
      const imageResult = await imageUploadService.processPendingUploads();
      console.log(
        `[SyncContext] Images: ${imageResult.processed} started, ${imageResult.failed} failed`,
      );

      setLastSyncTime(new Date());
      await updatePendingCounts();

      // Check if there are still pending items after sync
      const stillPending = await mutationQueueService.getPendingCount();
      if (stillPending > 0) {
        console.log(
          `[SyncContext] ${stillPending} mutations still pending, will retry`,
        );
      }
    } catch (error) {
      console.error('[SyncContext] Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isInternetReachable, isSyncing, updatePendingCounts]);

  // Trigger sync when coming online
  useEffect(() => {
    if (isInternetReachable && !isSyncing) {
      triggerSync();
    }
  }, [isInternetReachable, isSyncing, triggerSync]);

  const value: SyncContextValue = {
    isSyncing,
    lastSyncTime,
    pendingMutations,
    pendingImages,
    triggerSync,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
