import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { DatabaseStatus } from "../shared/contracts";

export type DatabaseHandle = {
  db: Database;
  databasePath: string;
};

export function openDatabase(userDataPath: string): DatabaseHandle {
  mkdirSync(userDataPath, { recursive: true });

  const databasePath = path.join(userDataPath, "note.sqlite3");
  const db = new Database(databasePath, { create: true });

  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA busy_timeout = 5000");

  runMigrations(db);

  return { db, databasePath };
}

export function getDatabaseStatus(handle: DatabaseHandle): DatabaseStatus {
  const sqliteVersion = handle.db
    .query("SELECT sqlite_version() AS version")
    .get() as { version: string };
  const pagesCount = handle.db
    .query("SELECT COUNT(*) AS count FROM pages")
    .get() as { count: number };
  const blocksCount = handle.db
    .query("SELECT COUNT(*) AS count FROM blocks")
    .get() as { count: number };

  return {
    sqliteVersion: sqliteVersion.version,
    pagesCount: pagesCount.count,
    blocksCount: blocksCount.count,
    databasePath: handle.databasePath
  };
}

function runMigrations(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const applied = db
    .query("SELECT version FROM schema_migrations WHERE version = ?")
    .get(1);

  if (applied) {
    return;
  }

  db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        parent_page_id TEXT NULL REFERENCES pages(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT '',
        icon TEXT NULL,
        cover TEXT NULL,
        archived_at TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

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
      );

      CREATE INDEX IF NOT EXISTS idx_blocks_page_parent_sort
      ON blocks(page_id, parent_block_id, sort_key);

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        local_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        sha256 TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_assets_sha256
      ON assets(sha256);

      CREATE TABLE IF NOT EXISTS block_assets (
        block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'content',
        PRIMARY KEY (block_id, asset_id, role)
      );

      CREATE INDEX IF NOT EXISTS idx_block_assets_asset
      ON block_assets(asset_id);

      CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts
      USING fts5(
        block_id UNINDEXED,
        page_id UNINDEXED,
        text
      );

      CREATE TABLE IF NOT EXISTS block_operations (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        op_type TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_block_operations_entity
      ON block_operations(entity_type, entity_id, created_at);

      CREATE TABLE IF NOT EXISTS sync_documents (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        sync_scope TEXT NOT NULL,
        crdt_kind TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(entity_type, entity_id, sync_scope)
      );

      CREATE TABLE IF NOT EXISTS sync_changes (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES sync_documents(id) ON DELETE CASCADE,
        peer_id TEXT NULL,
        sequence INTEGER NOT NULL,
        change_payload BLOB NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(document_id, peer_id, sequence)
      );

      CREATE INDEX IF NOT EXISTS idx_sync_changes_document_sequence
      ON sync_changes(document_id, sequence);

      CREATE TABLE IF NOT EXISTS sync_peer_states (
        peer_id TEXT PRIMARY KEY,
        state_json TEXT NOT NULL DEFAULT '{}',
        last_seen_at TEXT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO schema_migrations (version, name)
      VALUES (1, 'create block note schema');
    `);
  })();
}
