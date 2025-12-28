import axios from 'axios';
import { asc, eq } from 'drizzle-orm';

import { database } from '@/database';
import { imageUploads, type ImageUpload } from '@/database/schema';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'http://localhost:3000';
const MAX_RETRIES = 3;

class ImageUploadService {
  private isProcessing = false;
  private retryCounts = new Map<string, number>();

  async processPendingUploads(): Promise<{
    processed: number;
    failed: number;
  }> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;

    try {
      // Get pending uploads
      const pendingUploads = await database
        .select()
        .from(imageUploads)
        .where(eq(imageUploads.uploadStatus, 'pending'))
        .orderBy(asc(imageUploads.createdAt));

      for (const upload of pendingUploads) {
        try {
          const success = await this.uploadImage(upload);
          if (success) {
            processed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`[ImageUpload] Error uploading ${upload.id}:`, error);
          failed++;
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, failed };
  }

  private async uploadImage(imageUpload: ImageUpload): Promise<boolean> {
    try {
      // Create FormData (React Native built-in)
      const formData = new FormData();
      formData.append('image', {
        uri: imageUpload.localUri,
        type: 'image/jpeg',
        name: 'image.jpg',
      } as any);

      // Update progress
      await database
        .update(imageUploads)
        .set({ uploadProgress: 50 })
        .where(eq(imageUploads.id, imageUpload.id));

      // Upload with axios
      const response = await axios.post(
        `${API_BASE_URL}/api/images/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 second timeout
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              database
                .update(imageUploads)
                .set({ uploadProgress: progress })
                .where(eq(imageUploads.id, imageUpload.id))
                .then(() => {});
            }
          },
        },
      );

      if (response.data.success) {
        await database
          .update(imageUploads)
          .set({
            uploadStatus: 'completed',
            uploadProgress: 100,
            serverUrl: response.data.url,
          })
          .where(eq(imageUploads.id, imageUpload.id));

        this.retryCounts.delete(imageUpload.id);
        return true;
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error(`[ImageUpload] Upload error for ${imageUpload.id}:`, error);
      await this.handleUploadFailure(imageUpload);
      return false;
    }
  }

  private async handleUploadFailure(imageUpload: ImageUpload): Promise<void> {
    const currentRetryCount = this.retryCounts.get(imageUpload.id) || 0;
    const newRetryCount = currentRetryCount + 1;
    this.retryCounts.set(imageUpload.id, newRetryCount);

    if (newRetryCount >= MAX_RETRIES) {
      await database
        .update(imageUploads)
        .set({ uploadStatus: 'failed' })
        .where(eq(imageUploads.id, imageUpload.id));
    } else {
      // Keep as pending for retry
      await database
        .update(imageUploads)
        .set({
          uploadStatus: 'pending',
          uploadProgress: 0,
        })
        .where(eq(imageUploads.id, imageUpload.id));
    }
  }

  async getPendingCount(): Promise<number> {
    const pending = await database
      .select()
      .from(imageUploads)
      .where(eq(imageUploads.uploadStatus, 'pending'));
    return pending.length;
  }
}

export const imageUploadService = new ImageUploadService();
