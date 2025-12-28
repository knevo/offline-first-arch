import { Database } from './client';

export async function runMigrations(db: Database) {
  try {
    // Create tables
    await db.run(`
      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY NOT NULL,
        action_type TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        synced_at INTEGER,
        server_id TEXT
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS mutations (
        id TEXT PRIMARY KEY NOT NULL,
        action_id TEXT NOT NULL,
        mutation_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        processed_at INTEGER
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS image_uploads (
        id TEXT PRIMARY KEY NOT NULL,
        action_id TEXT NOT NULL,
        local_uri TEXT NOT NULL,
        upload_status TEXT NOT NULL,
        upload_progress INTEGER NOT NULL DEFAULT 0,
        server_url TEXT,
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
      CREATE INDEX IF NOT EXISTS idx_mutations_action_id ON mutations(action_id);
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_mutations_status ON mutations(status);
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_image_uploads_action_id ON image_uploads(action_id);
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_image_uploads_status ON image_uploads(upload_status);
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
