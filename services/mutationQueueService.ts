import { eq } from 'drizzle-orm';

import { database } from '@/database';
import {
  mutations,
  pkgs,
  StatusEnum,
  syncMetadata,
  type Mutation,
} from '@/database/schema';
import { mockApiService } from './mockApiService';

export const getMaxRetries = async (
  mutationType: string,
): Promise<number | null> => {
  try {
    const key =
      mutationType === 'upload_image'
        ? 'image_upload_max_retries'
        : 'json_upload_max_retries';

    const record = await database
      .select()
      .from(syncMetadata)
      .where(eq(syncMetadata.key, key))
      .limit(1);

    if (record.length > 0) {
      const value = record[0].value;
      if (value === undefined || value === null || value === 'infinite') {
        return null; // null means infinite
      }
      const maxRetries = parseInt(value, 10);
      return isNaN(maxRetries) ? 3 : maxRetries; // Default to 3 if invalid
    }

    // Default to 3 if not set
    return 3;
  } catch (error) {
    console.error('[MutationQueue] Error getting max retries:', error);
    return 3; // Default to 3 on error
  }
};

/**
 * Checks if an error is a network-related error
 */
const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('offline') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('econnrefused')
    );
  }
  return false;
};

export const processMutation = async (
  mutation: Mutation,
  isInternetReachable?: boolean,
): Promise<Mutation | null> => {
  try {
    const payload = JSON.parse(mutation.payload);

    // Route to appropriate handler based on mutation type
    switch (mutation.type) {
      case 'create_pkg':
        return await processCreatePkg(mutation, payload);
      case 'upload_image':
        return await processUploadImage(mutation, payload);
      default:
        console.error(
          `[MutationQueue] Unknown mutation type: ${mutation.type}`,
        );
        return null;
    }
  } catch (error) {
    console.error(`[MutationQueue] Mutation ${mutation.id} failed:`, error);

    // Check if this is a network error
    const isNetworkErr = isNetworkError(error) || isInternetReachable === false;

    if (isNetworkErr) {
      // Network error: keep as pending without incrementing retry count
      // Will be retried when network reconnects
      console.log(
        `[MutationQueue] Mutation ${mutation.id} failed due to network error. Will retry when network reconnects.`,
      );
      const [updatedMutation] = await database
        .update(mutations)
        .set({
          status: StatusEnum.Pending,
          // Don't increment retry count for network errors
        })
        .where(eq(mutations.id, mutation.id))
        .returning();

      return updatedMutation;
    }

    // Non-network error: proceed with normal retry logic
    // Get max retries for this mutation type
    const maxRetries = await getMaxRetries(mutation.type);
    let updatedMutation: Mutation | null = null;
    // Increment retry count
    const newRetryCount = mutation.retryCount + 1;

    // Check if we've exceeded max retries (unless infinite)
    if (maxRetries !== null && newRetryCount > maxRetries) {
      // Mark as failed - exceeded max retries
      [updatedMutation] = await database
        .update(mutations)
        .set({
          status: StatusEnum.Failed,
          retryCount: newRetryCount,
        })
        .where(eq(mutations.id, mutation.id))
        .returning();

      console.log(
        `[MutationQueue] Mutation ${mutation.id} failed after ${newRetryCount} retries (max: ${maxRetries})`,
      );
      return updatedMutation;
    }

    // Retry later with exponential backoff
    [updatedMutation] = await database
      .update(mutations)
      .set({
        status: StatusEnum.Pending,
        retryCount: newRetryCount,
      })
      .where(eq(mutations.id, mutation.id))
      .returning();

    return updatedMutation;
  }
};

const processCreatePkg = async (mutation: Mutation, payload: any) => {
  try {
    // Send to mock API
    const response = await mockApiService.createPkg(payload.pkgId);
    let updatedMutation: Mutation | null = null;
    if (response.success) {
      // Mark mutation as synced
      [updatedMutation] = await database
        .update(mutations)
        .set({
          status: StatusEnum.Completed,
        })
        .where(eq(mutations.id, mutation.id))
        .returning();

      // Update package's createdAt if returned
      if (response.pkg?.createdAt) {
        await database
          .update(pkgs)
          .set({
            createdAt: new Date(response.pkg.createdAt),
          })
          .where(eq(pkgs.id, payload.pkgId));
      }

      return updatedMutation;
    } else {
      throw new Error(response.error || 'API returned success: false');
    }
  } catch (error) {
    console.error(`[MutationQueue] Create pkg mutation failed:`, error);
    throw error;
  }
};

const processUploadImage = async (mutation: Mutation, payload: any) => {
  try {
    const { pkgId, imageUri } = payload;

    // Use the mock API service
    const response = await mockApiService.uploadImage(imageUri, pkgId);
    let updatedMutation: Mutation | null = null;
    if (response.success && response.url) {
      // Mark mutation as completed
      [updatedMutation] = await database
        .update(mutations)
        .set({
          status: StatusEnum.Completed,
        })
        .where(eq(mutations.id, mutation.id))
        .returning();

      // Update package's imageUrl with server URL
      await database
        .update(pkgs)
        .set({
          imageUrl: response.url,
        })
        .where(eq(pkgs.id, pkgId));

      return updatedMutation;
    } else {
      throw new Error(response.error || 'Image upload failed');
    }
  } catch (error) {
    console.error(`[MutationQueue] Upload image mutation failed:`, error);
    throw error;
  }
};
