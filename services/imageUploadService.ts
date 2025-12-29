import axios from 'axios';

import { API_BASE_URL } from '@/constants/env';
import type { Mutation } from '@/database/schema';

export const uploadImage = async (
  mutation: Mutation,
): Promise<string | null> => {
  try {
    const payload = JSON.parse(mutation.payload);
    const imageUri = payload.imageUri;

    // Create FormData for React Native
    const formData = new FormData();

    // For React Native, we need to create a proper file object
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    // Include pkgId in the request so server can update the package
    if (payload.pkgId) {
      formData.append('pkgId', payload.pkgId);
    }

    // Upload with axios
    const response = await axios.post(
      `${API_BASE_URL}/api/images/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      },
    );

    if (response.data.success && response.data.url) {
      // Return the server URL
      return response.data.url;
    } else {
      throw new Error(response.data.error || 'Upload failed');
    }
  } catch (error) {
    console.error(`[ImageUpload] Upload error for ${mutation.id}:`, error);
    return null;
  }
};
