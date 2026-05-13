use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{Connection, Result};
use schemars::JsonSchema;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, JsonSchema, PartialEq, Eq)]
pub struct DatabaseStatus {
    pub sqlite_version: String,
    pub pages_count: i64,
    pub blocks_count: i64,
    pub database_path: PathBuf,
}

pub fn open_database(user_data_path: impl AsRef<Path>) -> Result<Connection> {
    fs::create_dir_all(user_data_path.as_ref())
        .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))?;

    let database_path = user_data_path.as_ref().join("note.sqlite3");
    let connection = Connection::open(database_path)?;
    connection.pragma_update(None, "foreign_keys", "ON")?;
    connection.pragma_update(None, "journal_mode", "WAL")?;
    connection.pragma_update(None, "busy_timeout", 5000)?;
    run_migrations(&connection)?;
    Ok(connection)
}

pub fn get_database_status(
    connection: &Connection,
    database_path: impl AsRef<Path>,
) -> Result<DatabaseStatus> {
    let sqlite_version: String =
        connection.query_row("SELECT sqlite_version()", [], |row| row.get(0))?;
    let pages_count = count_table_if_exists(connection, "pages")?;
    let blocks_count = count_table_if_exists(connection, "blocks")?;

    Ok(DatabaseStatus {
        sqlite_version,
        pages_count,
        blocks_count,
        database_path: database_path.as_ref().to_path_buf(),
    })
}

fn run_migrations(connection: &Connection) -> Result<()> {
    connection.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pages (
          id TEXT PRIMARY KEY,
          parent_page_id TEXT NULL REFERENCES pages(id) ON DELETE CASCADE,
          title TEXT NOT NULL DEFAULT '',
          sort_key TEXT NOT NULL DEFAULT '00000000',
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

        CREATE INDEX IF NOT EXISTS idx_pages_parent_sort
        ON pages(parent_page_id, sort_key);

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

        CREATE INDEX IF NOT EXISTS idx_assets_sha256 ON assets(sha256);

        CREATE TABLE IF NOT EXISTS block_assets (
          block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
          asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'content',
          PRIMARY KEY (block_id, asset_id, role)
        );

        CREATE INDEX IF NOT EXISTS idx_block_assets_asset
        ON block_assets(asset_id);

        CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts
        USING fts5(
          page_id UNINDEXED,
          title
        );

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

        CREATE TABLE IF NOT EXISTS automerge_repo_chunks (
          storage_key TEXT PRIMARY KEY,
          data BLOB NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS page_history_entries (
          id TEXT PRIMARY KEY,
          page_id TEXT NOT NULL,
          origin TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          before_json TEXT NOT NULL,
          after_json TEXT NOT NULL,
          undone_at TEXT NULL,
          discarded_at TEXT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_page_history_page_local_undo
        ON page_history_entries(page_id, origin, actor_id, undone_at, discarded_at, created_at);

        INSERT OR IGNORE INTO schema_migrations(version, name)
        VALUES
          (1, 'create block note schema'),
          (2, 'add page tree sort key'),
          (3, 'add automerge repo chunk storage'),
          (4, 'add page history entries'),
          (5, 'add page fts index and backfill search');
        "#,
    )?;
    Ok(())
}

fn count_table_if_exists(connection: &Connection, table_name: &str) -> Result<i64> {
    let exists: i64 = connection.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
        [table_name],
        |row| row.get(0),
    )?;

    if exists == 0 {
        return Ok(0);
    }

    let query = format!("SELECT COUNT(*) FROM {table_name}");
    connection.query_row(&query, [], |row| row.get(0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn opens_database_and_reports_status() {
        let temp_dir = tempfile::tempdir().expect("create temp dir");
        let database_path = temp_dir.path().join("note.sqlite3");
        let connection = open_database(temp_dir.path()).expect("open database");

        let status = get_database_status(&connection, &database_path).expect("status");

        assert!(!status.sqlite_version.is_empty());
        assert_eq!(status.pages_count, 0);
        assert_eq!(status.blocks_count, 0);
        assert_eq!(status.database_path, database_path);
    }

    #[test]
    fn bootstraps_current_schema_objects() {
        let temp_dir = tempfile::tempdir().expect("create temp dir");
        let connection = open_database(temp_dir.path()).expect("open database");
        let expected_names = [
            "assets",
            "automerge_repo_chunks",
            "block_assets",
            "block_operations",
            "blocks",
            "blocks_fts",
            "idx_assets_sha256",
            "idx_block_assets_asset",
            "idx_block_operations_entity",
            "idx_blocks_page_parent_sort",
            "idx_page_history_page_local_undo",
            "idx_pages_parent_sort",
            "idx_sync_changes_document_sequence",
            "page_history_entries",
            "pages",
            "pages_fts",
            "schema_migrations",
            "sync_changes",
            "sync_documents",
            "sync_peer_states",
        ];

        for name in expected_names {
            let exists: i64 = connection
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE name = ?1",
                    [name],
                    |row| row.get(0),
                )
                .expect("query schema object");

            assert_eq!(exists, 1, "missing schema object: {name}");
        }

        let schema_version: i64 = connection
            .query_row("SELECT MAX(version) FROM schema_migrations", [], |row| {
                row.get(0)
            })
            .expect("schema version");

        assert_eq!(schema_version, 5);
    }
}
