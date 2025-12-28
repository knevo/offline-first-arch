import axios from 'axios';
import { eq } from 'drizzle-orm';

import { database } from '@/database';
import { actions, syncMetadata } from '@/database/schema';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'http://localhost:3000';

class DeltaSyncService {
  async pullChanges(): Promise<{ success: boolean; count: number }> {
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
          await database
            .update(actions)
            .set({
              actionType: serverAction.type,
              status: 'completed',
              syncedAt: new Date(serverAction.syncedAt),
              serverId: serverAction.id.toString(),
            })
            .where(eq(actions.id, existing[0].id));
        } else {
          // Create new action
          await database.insert(actions).values({
            actionType: serverAction.type,
            status: 'completed',
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
  }
}

export const deltaSyncService = new DeltaSyncService();
