import axios from 'axios';
import { eq } from 'drizzle-orm';

import { API_BASE_URL } from '@/constants/env';
import { database } from '@/database';
import { actions, StatusEnum, syncMetadata } from '@/database/schema';
import { imageUploadService } from './imageUploadService';
import { mutationQueueService } from './mutationQueueService';

export const executeSyncCycle = async () => {
  // 1. Delta sync (pull changes)
  console.log('[SyncOrchestrator] Starting delta sync...');
  const deltaResult = await deltaSyncServer();
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
};

export const getPendingCounts = async () => {
  return {
    pendingMutations: await mutationQueueService.getPendingCount(),
    pendingImages: await imageUploadService.getPendingCount(),
  };
};

export const deltaSyncServer = async () => {
  try {
    // Get last_pulled_at from sync_metadata
    const lastPulledRecord = await database
      .select()
      .from(syncMetadata)
      .where(eq(syncMetadata.key, 'last_pulled_at'))
      .limit(1);

    let lastPulledAt: string | null = null;
    if (lastPulledRecord.length > 0) {
      lastPulledAt = lastPulledRecord[0].value;
    }

    // Call delta sync endpoint
    const response = await axios.post(`${API_BASE_URL}/api/sync/pull`, {
      last_pulled_at: lastPulledAt,
    });

    if (!response.data.success) {
      throw new Error('Delta sync failed');
    }

    const { actions: serverActions, timestamp } = response.data;

    // Process new/updated actions
    for (const serverAction of serverActions) {
      // Check if action already exists by server_id
      const existing = await database
        .select()
        .from(actions)
        .where(eq(actions.serverId, serverAction.id.toString()))
        .limit(1);

      if (existing.length > 0) {
        // Update existing action
        // @Todo: Implement this
        // await database
        //   .update(actions)
        //   .set({
        //     actionType: serverAction.type,
        //     status: StatusEnum.Completed,
        //     syncedAt: new Date(serverAction.syncedAt),
        //     serverId: serverAction.id.toString(),
        //   })
        //   .where(eq(actions.id, existing[0].id));
      } else {
        // Create new action
        await database.insert(actions).values({
          actionType: serverAction.type,
          status: StatusEnum.Completed,
          createdAt: new Date(serverAction.createdAt),
          syncedAt: new Date(serverAction.syncedAt),
          serverId: serverAction.id.toString(),
        });
      }
    }

    // Update last_pulled_at timestamp
    if (lastPulledRecord.length > 0) {
      await database
        .update(syncMetadata)
        .set({
          value: timestamp,
          updatedAt: new Date(),
        })
        .where(eq(syncMetadata.key, 'last_pulled_at'));
    } else {
      await database.insert(syncMetadata).values({
        key: 'last_pulled_at',
        value: timestamp,
        updatedAt: new Date(),
      });
    }

    return { success: true, count: serverActions.length };
  } catch (error) {
    console.error('[DeltaSync] Error:', error);
    return { success: false, count: 0 };
  }
};
