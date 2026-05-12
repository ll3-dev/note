use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{Connection, Result};
use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
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
        CREATE TABLE IF NOT EXISTS pages (
          id TEXT PRIMARY KEY,
          parent_page_id TEXT,
          title TEXT NOT NULL DEFAULT '',
          sort_key TEXT NOT NULL DEFAULT '00000000',
          icon TEXT,
          cover TEXT,
          archived_at TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS blocks (
          id TEXT PRIMARY KEY,
          page_id TEXT NOT NULL,
          parent_block_id TEXT,
          type TEXT NOT NULL,
          sort_key TEXT NOT NULL,
          text TEXT NOT NULL DEFAULT '',
          props_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

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
}
