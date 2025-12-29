import { Database } from './client';
export const resetDatabase = async (db: Database) => {
  await db.run(`
    DROP TABLE IF EXISTS pkgs;
    DROP TABLE IF EXISTS mutations;
    DROP TABLE IF EXISTS sync_metadata;
    DROP INDEX IF EXISTS idx_mutations_pkg_id;
    DROP INDEX IF EXISTS idx_mutations_status;
    DROP INDEX IF EXISTS idx_sync_metadata_key;
  `);
};
export async function runMigrations(db: Database) {
  try {
    // Check if we need to migrate from old schema
    const needsMigration = await checkIfNeedsMigration(db);

    if (needsMigration) {
      console.log('🔄 Old schema detected, recreating tables...');
      await resetDatabase(db);
    }

    // Create tables with new schema
    await db.run(`
      CREATE TABLE IF NOT EXISTS pkgs (
        id TEXT PRIMARY KEY NOT NULL,
        image_url TEXT,
        created_at INTEGER NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS mutations (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        pkg_id TEXT,
        status TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id TEXT PRIMARY KEY NOT NULL,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create indexes for better query performance
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_mutations_pkg_id ON mutations(pkg_id);
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_mutations_status ON mutations(status);
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_sync_metadata_key ON sync_metadata(key);
    `);

    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  }
}

async function checkIfNeedsMigration(db: Database): Promise<boolean> {
  try {
    // Check if the mutations table has the old schema (mutation_type column)
    const result = await db.$client.getAllAsync<{ name: string }>(
      `SELECT name FROM pragma_table_info('mutations') WHERE name='mutation_type'`,
    );
    return result.length > 0;
  } catch {
    // If table doesn't exist or query fails, no migration needed
    return false;
  }
}
