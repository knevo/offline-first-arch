import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export enum StatusEnum {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

// Actions table
export const actions = sqliteTable('actions', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => generateId()),
  actionType: text('action_type').notNull(),
  status: text('status').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  serverId: text('server_id'),
});

// Mutations table
export const mutations = sqliteTable('mutations', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => generateId()),
  actionId: text('action_id').notNull(),
  mutationType: text('mutation_type').notNull(),
  payload: text('payload').notNull(),
  status: text('status').notNull(),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
});

// Image uploads table
export const imageUploads = sqliteTable('image_uploads', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => generateId()),
  actionId: text('action_id').notNull(),
  localUri: text('local_uri').notNull(),
  uploadStatus: text('upload_status').notNull(),
  uploadProgress: integer('upload_progress').notNull().default(0),
  serverUrl: text('server_url'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Sync metadata table
export const syncMetadata = sqliteTable('sync_metadata', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => generateId()),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// TypeScript types for inserts and selects
export type Action = typeof actions.$inferSelect;
export type NewAction = typeof actions.$inferInsert;

export type Mutation = typeof mutations.$inferSelect;
export type NewMutation = typeof mutations.$inferInsert;

export type ImageUpload = typeof imageUploads.$inferSelect;
export type NewImageUpload = typeof imageUploads.$inferInsert;

export type SyncMetadata = typeof syncMetadata.$inferSelect;
export type NewSyncMetadata = typeof syncMetadata.$inferInsert;

// Helper function to generate IDs (similar to WatermelonDB)
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
