import { eq } from 'drizzle-orm';

import { database } from '@/database';
import {
  actions,
  imageUploads,
  mutations,
  StatusEnum,
  type Action,
  type ImageUpload,
} from '@/database/schema';
import { executeSyncCycle } from './syncService';

export const createSmallAction = async (): Promise<Action> => {
  // Create action immediately (optimistic write)
  const [action] = await database
    .insert(actions)
    .values({
      actionType: 'small',
      status: StatusEnum.Completed,
    })
    .returning();

  // Create mutation for sync
  await database.insert(mutations).values({
    actionId: action.id,
    mutationType: 'create_small_action',
    payload: JSON.stringify({ actionId: action.id }),
    status: StatusEnum.Pending,
    retryCount: 0,
  });

  // Trigger immediate sync attempt if online
  executeSyncCycle();

  return action as Action;
};

export const createLargeActionWithImage = async (
  imageUri: string,
): Promise<{ action: Action; imageUpload: ImageUpload }> => {
  // Create action immediately (optimistic write)
  const [action] = await database
    .insert(actions)
    .values({
      actionType: 'large',
      status: StatusEnum.Completed,
    })
    .returning();

  // Create mutation for JSON data sync (high priority)
  await database.insert(mutations).values({
    actionId: action.id,
    mutationType: 'create_large_action',
    payload: JSON.stringify({ actionId: action.id }),
    status: StatusEnum.Pending,
    retryCount: 0,
  });

  // Create image upload record (independent, lower priority)
  const [imageUpload] = await database
    .insert(imageUploads)
    .values({
      actionId: action.id,
      localUri: imageUri,
      uploadStatus: StatusEnum.Pending,
      uploadProgress: 0,
    })
    .returning();

  // Trigger immediate sync attempt if online
  executeSyncCycle();

  return { action: action as Action, imageUpload };
};

export const getAllActions = async (): Promise<Action[]> => {
  return (await database.select().from(actions)) as Action[];
};

export const getActionById = async (
  id: string,
): Promise<Action | undefined> => {
  const result = await database
    .select()
    .from(actions)
    .where(eq(actions.id, id));
  return result[0] as Action | undefined;
};
