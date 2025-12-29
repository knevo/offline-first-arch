import type { Pkg } from '@/database/schema';
let isSimulatedOffline = false;
export const setIsSimulatedOffline = (value: boolean) => {
  isSimulatedOffline = value;
};
// In-memory storage for packages (simulating server database)
let serverPkgs: {
  id: string;
  imageUrl: string | null;
  createdAt: string;
}[] = [];

// Helper function to simulate network delay
const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Helper function to simulate random failures (30% for image uploads)
const shouldFail = (): boolean => {
  return Math.random() < 0.3; // 30% failure rate
};

// Generate unique ID matching client format
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

interface CreatePkgResponse {
  success: boolean;
  pkg?: {
    id: string;
    createdAt: string;
  };
  error?: string;
}

interface UploadImageResponse {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}

interface SyncPullResponse {
  success: boolean;
  pkgs: Pkg[];
  timestamp: string;
  error?: string;
}

export const mockApiService = {
  /**
   * POST /api/pkgs - Create package
   */
  async createPkg(pkgId?: string): Promise<CreatePkgResponse> {
    try {
      if (isSimulatedOffline) {
        return {
          success: false,
          error: 'Network request failed (simulated offline)',
        };
      }
      await delay(500); // Simulate 500ms delay

      const id = pkgId || generateId();
      const pkg = {
        id,
        imageUrl: null,
        createdAt: new Date().toISOString(),
      };

      serverPkgs.push(pkg);

      console.log(`[MockAPI] Package created: ${pkg.id}`);

      return {
        success: true,
        pkg: {
          id: pkg.id,
          createdAt: pkg.createdAt,
        },
      };
    } catch (error) {
      console.error('[MockAPI] Create pkg error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * POST /api/images/upload - Upload image
   */
  async uploadImage(
    imageUri: string,
    pkgId?: string,
  ): Promise<UploadImageResponse> {
    try {
      if (isSimulatedOffline) {
        return {
          success: false,
          error: 'Network request failed (simulated offline)',
        };
      }
      await delay(1500); // Simulate upload delay

      // Simulate 30% failure rate
      if (shouldFail()) {
        console.log('[MockAPI] Simulated upload failure');
        return {
          success: false,
          error: 'Image upload failed (simulated)',
        };
      }

      // For mock server, we can use the original URI or generate a mock URL
      // In a real scenario, the image would be uploaded to a server
      // For now, we'll use the original URI as the "server URL"
      const fileUri = imageUri;

      // Update package if pkgId is provided
      if (pkgId) {
        const pkg = serverPkgs.find((p) => p.id === pkgId);
        if (pkg) {
          pkg.imageUrl = fileUri;
          console.log(`[MockAPI] Updated package ${pkgId} with image URL`);
        }
      }

      const filename = imageUri.split('/').pop() || 'image.jpg';
      console.log(`[MockAPI] Upload successful: ${filename}`);

      return {
        success: true,
        url: fileUri,
        filename: filename,
      };
    } catch (error) {
      console.error('[MockAPI] Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * POST /api/sync/pull - Delta sync
   */
  async syncPull(lastPulledAt: string | null): Promise<SyncPullResponse> {
    try {
      if (isSimulatedOffline) {
        return {
          success: false,
          pkgs: [],
          timestamp: new Date().toISOString(),
          error: 'Network request failed (simulated offline)',
        };
      }
      let filteredPkgs = serverPkgs;

      if (lastPulledAt) {
        const lastPulledDate = new Date(lastPulledAt);
        filteredPkgs = serverPkgs.filter((pkg) => {
          const pkgDate = new Date(pkg.createdAt);
          return pkgDate > lastPulledDate;
        });
      }

      const timestamp = new Date().toISOString();

      // Map to Pkg format
      const mappedPkgs: Pkg[] = filteredPkgs.map((pkg) => ({
        id: pkg.id,
        imageUrl: pkg.imageUrl,
        createdAt: new Date(pkg.createdAt),
      }));

      console.log(
        `[MockAPI] Pulling ${mappedPkgs.length} packages since ${
          lastPulledAt || 'beginning'
        }`,
      );

      return {
        success: true,
        pkgs: mappedPkgs,
        timestamp,
      };
    } catch (error) {
      console.error('[MockAPI] Sync error:', error);
      return {
        success: false,
        pkgs: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get all packages (for debugging)
   */
  getAllPkgs(): {
    id: string;
    imageUrl: string | null;
    createdAt: string;
  }[] {
    return [...serverPkgs];
  },

  /**
   * Clear all packages (for testing)
   */
  clearAllPkgs(): void {
    serverPkgs = [];
  },
};
