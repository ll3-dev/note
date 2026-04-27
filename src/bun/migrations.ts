import { eq, sql } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { schema, schemaMigrations } from "./schema";

const CURRENT_SCHEMA_VERSION = 1;

const migrationTableSql = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`;

const migrations = [
  {
    version: 1,
    name: "create block note schema",
    statements: [
      `
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        parent_page_id TEXT NULL REFERENCES pages(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT '',
        icon TEXT NULL,
        cover TEXT NULL,
        archived_at TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS blocks (
        id TEXT PRIMARY KEY,
        page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        parent_block_id TEXT NULL REFERENCES blocks(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        sort_key TEXT NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        props_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_blocks_page_parent_sort
      ON blocks(page_id, parent_block_id, sort_key)
      `,
      `
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        local_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        sha256 TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_assets_sha256
      ON assets(sha256)
      `,
      `
      CREATE TABLE IF NOT EXISTS block_assets (
        block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'content',
        PRIMARY KEY (block_id, asset_id, role)
      )
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_block_assets_asset
      ON block_assets(asset_id)
      `,
      `
      CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts
      USING fts5(
        block_id UNINDEXED,
        page_id UNINDEXED,
        text
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS block_operations (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        op_type TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_block_operations_entity
      ON block_operations(entity_type, entity_id, created_at)
      `,
      `
      CREATE TABLE IF NOT EXISTS sync_documents (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        sync_scope TEXT NOT NULL,
        crdt_kind TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(entity_type, entity_id, sync_scope)
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS sync_changes (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES sync_documents(id) ON DELETE CASCADE,
        peer_id TEXT NULL,
        sequence INTEGER NOT NULL,
        change_payload BLOB NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(document_id, peer_id, sequence)
      )
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_sync_changes_document_sequence
      ON sync_changes(document_id, sequence)
      `,
      `
      CREATE TABLE IF NOT EXISTS sync_peer_states (
        peer_id TEXT PRIMARY KEY,
        state_json TEXT NOT NULL DEFAULT '{}',
        last_seen_at TEXT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
      `
    ]
  }
] as const;

export function runMigrations(orm: BunSQLiteDatabase<typeof schema>) {
  orm.run(sql.raw(migrationTableSql));

  const applied = orm
    .select({ version: schemaMigrations.version })
    .from(schemaMigrations)
    .where(eq(schemaMigrations.version, CURRENT_SCHEMA_VERSION))
    .get();

  if (applied) {
    return;
  }

  orm.transaction((tx) => {
    for (const migration of migrations) {
      for (const statement of migration.statements) {
        tx.run(sql.raw(statement));
      }

      tx.insert(schemaMigrations)
        .values({
          version: migration.version,
          name: migration.name
        })
        .run();
    }
  });
}
