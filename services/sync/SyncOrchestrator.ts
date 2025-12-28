import { deltaSyncService } from './DeltaSyncService';
import { imageUploadService } from './ImageUploadService';
import { mutationQueueService } from './MutationQueueService';

/**
 * SyncOrchestrator - Coordinates sync operations
 * Note: For React components, use SyncContext instead for reactive state management
 * This is kept for backward compatibility and utility purposes
 */
class SyncOrchestrator {
  async executeSyncCycle(): Promise<{
    delta: { count: number };
    mutations: { processed: number; failed: number };
    images: { processed: number; failed: number };
  }> {
    // 1. Delta sync (pull changes)
    console.log('[SyncOrchestrator] Starting delta sync...');
    const deltaResult = await deltaSyncService.pullChanges();
    console.log(`[SyncOrchestrator] Delta sync: ${deltaResult.count} changes`);

    // 2. Process mutation queue (push changes - small requests first)
    console.log('[SyncOrchestrator] Processing mutation queue...');
    const mutationResult = await mutationQueueService.processQueue();
    console.log(
      `[SyncOrchestrator] Mutations: ${mutationResult.processed} processed, ${mutationResult.failed} failed`,
    );

    // 3. Process image uploads (large requests - independent)
    console.log('[SyncOrchestrator] Processing image uploads...');
    const imageResult = await imageUploadService.processPendingUploads();
    console.log(
      `[SyncOrchestrator] Images: ${imageResult.processed} started, ${imageResult.failed} failed`,
    );

    return {
      delta: deltaResult,
      mutations: mutationResult,
      images: imageResult,
    };
  }

  async getPendingCounts(): Promise<{
    pendingMutations: number;
    pendingImages: number;
  }> {
    return {
      pendingMutations: await mutationQueueService.getPendingCount(),
      pendingImages: await imageUploadService.getPendingCount(),
    };
  }
}

export const syncOrchestrator = new SyncOrchestrator();
