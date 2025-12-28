import { eq } from 'drizzle-orm';

import { database } from '@/database';
import {
  actions,
  imageUploads,
  mutations,
  type Action,
  type ImageUpload,
} from '@/database/schema';
import { syncOrchestrator } from './sync/SyncOrchestrator';

class ActionService {
  async createSmallAction(): Promise<Action> {
    // Create action immediately (optimistic write)
    const [action] = await database
      .insert(actions)
      .values({
        actionType: 'small',
        status: 'completed',
      })
      .returning();

    // Create mutation for sync
    await database.insert(mutations).values({
      actionId: action.id,
      mutationType: 'create_small_action',
      payload: JSON.stringify({ actionId: action.id }),
      status: 'pending',
      retryCount: 0,
    });

    // Trigger immediate sync attempt if online
    syncOrchestrator.executeSyncCycle();

    return action;
  }

  async createLargeActionWithImage(
    imageUri: string,
  ): Promise<{ action: Action; imageUpload: ImageUpload }> {
    // Create action immediately (optimistic write)
    const [action] = await database
      .insert(actions)
      .values({
        actionType: 'large',
        status: 'completed',
      })
      .returning();

    // Create mutation for JSON data sync (high priority)
    await database.insert(mutations).values({
      actionId: action.id,
      mutationType: 'create_large_action',
      payload: JSON.stringify({ actionId: action.id }),
      status: 'pending',
      retryCount: 0,
    });

    // Create image upload record (independent, lower priority)
    const [imageUpload] = await database
      .insert(imageUploads)
      .values({
        actionId: action.id,
        localUri: imageUri,
        uploadStatus: 'pending',
        uploadProgress: 0,
      })
      .returning();

    // Trigger immediate sync attempt if online
    syncOrchestrator.executeSyncCycle();

    return { action, imageUpload };
  }

  async getAllActions(): Promise<Action[]> {
    return await database.select().from(actions);
  }

  async getActionById(id: string): Promise<Action | undefined> {
    const result = await database
      .select()
      .from(actions)
      .where(eq(actions.id, id));
    return result[0];
  }
}

export const actionService = new ActionService();
