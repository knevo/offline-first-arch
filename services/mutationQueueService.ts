import axios from 'axios';
import { asc, eq, inArray } from 'drizzle-orm';

import { API_BASE_URL } from '@/constants/env';
import { database } from '@/database';
import {
  actions,
  mutations,
  StatusEnum,
  type Mutation,
} from '@/database/schema';

class MutationQueueService {
  private isProcessing = false;

  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    let totalProcessed = 0;
    let totalFailed = 0;

    try {
      // Keep processing until there are no more pending mutations
      let hasMore = true;
      while (hasMore) {
        let processed = 0;
        let failed = 0;

        // Get pending mutations in FIFO order
        const pendingMutations = await database
          .select()
          .from(mutations)
          .where(inArray(mutations.status, [StatusEnum.Pending]))
          .orderBy(asc(mutations.createdAt));

        if (pendingMutations.length === 0) {
          hasMore = false;
          break;
        }

        for (const mutation of pendingMutations) {
          try {
            const success = await this.processMutation(mutation);

            if (success) {
              processed++;
            } else {
              failed++;
            }

            // Small delay between mutations to avoid overwhelming the server
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
      this.isProcessing = false;
    }

    return { processed: totalProcessed, failed: totalFailed };
  }

  private async processMutation(mutation: Mutation): Promise<boolean> {
    try {
      const payload = JSON.parse(mutation.payload);
      let endpoint = '';
      let requestData: any = {};

      // Determine endpoint based on mutation type
      if (mutation.mutationType === 'create_small_action') {
        endpoint = '/api/actions/small';
        requestData = { actionId: mutation.actionId, ...payload };
      } else if (mutation.mutationType === 'create_large_action') {
        endpoint = '/api/actions/large';
        requestData = { actionId: mutation.actionId, ...payload };
      } else {
        throw new Error(`Unknown mutation type: ${mutation.mutationType}`);
      }

      // Send to API
      const response = await axios.post(
        `${API_BASE_URL}${endpoint}`,
        requestData,
      );

      if (response.data.success) {
        // Mark mutation as synced
        await database
          .update(mutations)
          .set({
            status: StatusEnum.Completed,
            processedAt: new Date(),
          })
          .where(eq(mutations.id, mutation.id));

        // Update action's synced_at
        await database
          .update(actions)
          .set({
            status: StatusEnum.Completed,
            syncedAt: new Date(response.data.action.syncedAt),
            serverId: response.data.action.id.toString(),
          })
          .where(eq(actions.id, mutation.actionId));

        return true;
      } else {
        throw new Error('API returned success: false');
      }
    } catch (error) {
      console.error(`[MutationQueue] Mutation ${mutation.id} failed:`, error);

      // Increment retry count
      const newRetryCount = mutation.retryCount + 1;

      // Retry later with exponential backoff
      await database
        .update(mutations)
        .set({
          status: StatusEnum.Pending,
          retryCount: newRetryCount,
        })
        .where(eq(mutations.id, mutation.id));

      return false;
    }
  }

  async getPendingCount(): Promise<number> {
    const pending = await database
      .select()
      .from(mutations)
      .where(inArray(mutations.status, [StatusEnum.Pending]));
    return pending.length;
  }
}

export const mutationQueueService = new MutationQueueService();
