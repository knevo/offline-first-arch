import axios from 'axios';
import { asc, eq, inArray } from 'drizzle-orm';

import { database } from '@/database';
import { actions, mutations, type Mutation } from '@/database/schema';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'http://localhost:3000';
const MAX_RETRIES = 3;

class MutationQueueService {
  private isProcessing = false;

  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;

    try {
      // Get pending mutations in FIFO order
      const pendingMutations = await database
        .select()
        .from(mutations)
        .where(inArray(mutations.status, ['pending', 'retry']))
        .orderBy(asc(mutations.createdAt));

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
    } finally {
      this.isProcessing = false;
    }

    return { processed, failed };
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
            status: 'synced',
            processedAt: new Date(),
          })
          .where(eq(mutations.id, mutation.id));

        // Update action's synced_at
        await database
          .update(actions)
          .set({
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

      if (newRetryCount >= MAX_RETRIES) {
        // Max retries reached, mark as failed
        await database
          .update(mutations)
          .set({
            status: 'failed',
            processedAt: new Date(),
          })
          .where(eq(mutations.id, mutation.id));
      } else {
        // Retry later with exponential backoff
        await database
          .update(mutations)
          .set({
            status: 'retry',
            retryCount: newRetryCount,
          })
          .where(eq(mutations.id, mutation.id));
      }

      return false;
    }
  }

  async getPendingCount(): Promise<number> {
    const pending = await database
      .select()
      .from(mutations)
      .where(inArray(mutations.status, ['pending', 'retry']));
    return pending.length;
  }
}

export const mutationQueueService = new MutationQueueService();
