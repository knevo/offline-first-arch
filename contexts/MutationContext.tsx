import { Mutation, MutationTypeEnum, StatusEnum } from '@/database';
import { setIsSimulatedOffline } from '@/services/mockApiService';
import { processMutation } from '@/services/mutationQueueService';
import * as mutationService from '@/services/mutationService';
import { type CreateMutationPayload } from '@/services/mutationService';
import { deltaSyncServer } from '@/services/syncService';
import { useNetworkState } from 'expo-network';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface MutationContextValue {
  isSyncing: boolean;
  lastSyncTime?: Date;
  allMutations: Mutation[];
  refreshMutations: () => Promise<void>;
  createMutation: (payload: CreateMutationPayload) => Promise<void>;
  registerPackageRefreshCallback: (callback: () => Promise<void>) => void;
}

const MutationContext = createContext<MutationContextValue | undefined>(
  undefined,
);

interface MutationProviderProps {
  children: ReactNode;
}

export function MutationProvider({ children }: MutationProviderProps) {
  const { isInternetReachable } = useNetworkState();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>(undefined);
  const [allMutations, setAllMutations] = useState<Mutation[]>([]);
  const packageRefreshCallbackRef = useRef<(() => Promise<void>) | null>(null);

  const refreshMutations = useCallback(async () => {
    const mutations = await mutationService.getAllMutations();
    // Sort by created_at descending (newest first)
    const sorted = mutations.sort((a, b) => {
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    setAllMutations(sorted);
  }, []);

  const registerPackageRefreshCallback = useCallback(
    (callback: () => Promise<void>) => {
      packageRefreshCallbackRef.current = callback;
    },
    [],
  );

  const processQueue = useCallback(async () => {
    if (isProcessing) {
      return;
    }
    if (!isInternetReachable) {
      return;
    }
    setIsProcessing(true);
    let totalProcessed = 0;
    let totalFailed = 0;
    try {
      // Keep processing until there are no more pending mutations
      let hasMore = true;
      while (hasMore) {
        let processed = 0;
        let failed = 0;

        // Get pending mutations
        const pendingMutations = await mutationService.getPendingMutations();

        if (pendingMutations.length === 0) {
          hasMore = false;
          break;
        }

        // Sort mutations: non-image first, then by createdAt (FIFO within each group)
        const sortedMutations = pendingMutations.sort((a, b) => {
          // First priority: non-image mutations before image mutations
          const aIsImage = a.type === MutationTypeEnum.UploadImage;
          const bIsImage = b.type === MutationTypeEnum.UploadImage;

          if (aIsImage !== bIsImage) {
            return aIsImage ? 1 : -1; // non-image first
          }

          // Second priority: FIFO (oldest first)
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

        for (const mutation of sortedMutations) {
          try {
            const updatedMutation = await processMutation(
              mutation,
              isInternetReachable,
            );

            if (updatedMutation) {
              setAllMutations((prev) =>
                prev.map((m) =>
                  m.id === updatedMutation.id ? updatedMutation : m,
                ),
              );
              processed++;

              // Refresh packages if mutation completed successfully
              if (
                updatedMutation.status === StatusEnum.Completed &&
                packageRefreshCallbackRef.current
              ) {
                await packageRefreshCallbackRef.current();
              }
            } else {
              failed++;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.error(
              `[MutationQueue] Error processing mutation ${mutation.id}:`,
              error,
            );
            failed++;
          }
        }

        totalProcessed += processed;
        totalFailed += failed;

        // If no mutations were successfully processed, stop to avoid infinite loop
        if (processed === 0) {
          hasMore = false;
        }
      }
    } finally {
      setIsProcessing(false);
    }

    return { processed: totalProcessed, failed: totalFailed };
  }, [isProcessing, isInternetReachable]);

  const createMutation = useCallback(
    async (payload: CreateMutationPayload) => {
      const newMutation = await mutationService.createMutation(payload);
      processQueue();
      setAllMutations((prev) => [newMutation, ...prev]);
    },
    [processQueue],
  );

  useEffect(() => {
    refreshMutations();
  }, [refreshMutations]);

  const triggerSync = useCallback(async () => {
    if (isSyncing || !isInternetReachable) {
      return;
    }

    setIsSyncing(true);

    try {
      await deltaSyncServer();
      // Refresh packages after sync pulls new data
      if (packageRefreshCallbackRef.current) {
        await packageRefreshCallbackRef.current();
      }
      await processQueue();
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('[SyncContext] Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isInternetReachable, isSyncing, processQueue]);

  // Trigger sync when coming online
  useEffect(() => {
    if (isInternetReachable && !isSyncing) {
      triggerSync();
      setIsSimulatedOffline(!isInternetReachable);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInternetReachable]);

  const value: MutationContextValue = {
    isSyncing,
    lastSyncTime,
    allMutations,
    refreshMutations,
    createMutation,
    registerPackageRefreshCallback,
  };

  return (
    <MutationContext.Provider value={value}>
      {children}
    </MutationContext.Provider>
  );
}

export function useMutationContext(): MutationContextValue {
  const context = useContext(MutationContext);
  if (context === undefined) {
    throw new Error('useMutation must be used within a MutationProvider');
  }
  return context;
}
