import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export enum StatusEnum {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}
export enum MutationTypeEnum {
  CreatePkg = 'create_pkg',
  UploadImage = 'upload_image',
}
// Packages table
export const pkgs = sqliteTable('pkgs', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => generateId()),
  imageUrl: text('image_url'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Mutations table
export const mutations = sqliteTable('mutations', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => generateId()),
  type: text('type').notNull().$type<MutationTypeEnum>(),
  payload: text('payload').notNull(),
  pkgId: text('pkg_id'),
  status: text('status').notNull().$type<StatusEnum>(),
  retryCount: integer('retry_count').notNull().default(0),
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
export type Pkg = typeof pkgs.$inferSelect;
export type NewPkg = typeof pkgs.$inferInsert;

export type Mutation = typeof mutations.$inferSelect;
export type NewMutation = typeof mutations.$inferInsert;

export type SyncMetadata = typeof syncMetadata.$inferSelect;
export type NewSyncMetadata = typeof syncMetadata.$inferInsert;

// Helper function to generate IDs (similar to WatermelonDB)
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
