import { eq } from 'drizzle-orm';

import { database } from '@/database';
import { pkgs, syncMetadata } from '@/database/schema';
import { mockApiService } from './mockApiService';

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

    const response = await mockApiService.syncPull(lastPulledAt);

    if (!response.success) {
      throw new Error(response.error || 'Delta sync failed');
    }

    const { pkgs: serverPkgs, timestamp } = response;

    // Process new/updated packages
    for (const serverPkg of serverPkgs) {
      const existing = await database
        .select()
        .from(pkgs)
        .where(eq(pkgs.id, serverPkg.id))
        .limit(1);

      if (existing.length > 0) {
        // Update existing package with server data
        await database
          .update(pkgs)
          .set({
            imageUrl: serverPkg.imageUrl,
            createdAt: new Date(serverPkg.createdAt),
          })
          .where(eq(pkgs.id, serverPkg.id));
      } else {
        // Create new package from server
        await database.insert(pkgs).values({
          id: serverPkg.id,
          imageUrl: serverPkg.imageUrl,
          createdAt: new Date(serverPkg.createdAt),
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

    return { success: true, count: serverPkgs.length };
  } catch {
    console.error('[DeltaSync] Error during sync');
    return { success: false, count: 0 };
  }
};
