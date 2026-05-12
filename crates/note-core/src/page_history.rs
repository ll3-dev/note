use std::collections::HashMap;

use rusqlite::{params, Connection, OptionalExtension, Result};
use serde::Deserialize;
use serde_json::Value;

use crate::documents::{get_page_document, Block, Page, PageDocument};

const LOCAL_ACTOR_ID: &str = "local";

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PageHistoryInput {
    pub page_id: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PageHistoryDirection {
    Redo,
    Undo,
}

struct PersistedPageHistoryEntry {
    after: PageDocument,
    before: PageDocument,
    id: String,
}

pub fn undo_page_history(
    connection: &mut Connection,
    input: PageHistoryInput,
) -> Result<Option<PageDocument>> {
    let Some(entry) = get_entry(connection, &input.page_id, PageHistoryDirection::Undo)? else {
        return Ok(None);
    };

    let tx = connection.transaction()?;
    apply_selective_page_history(&tx, &entry.before, &entry.after, PageHistoryDirection::Undo)?;
    tx.execute(
        "UPDATE page_history_entries SET undone_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![entry.id],
    )?;
    tx.commit()?;

    get_page_document(connection, &input.page_id).map(Some)
}

pub fn redo_page_history(
    connection: &mut Connection,
    input: PageHistoryInput,
) -> Result<Option<PageDocument>> {
    let Some(entry) = get_entry(connection, &input.page_id, PageHistoryDirection::Redo)? else {
        return Ok(None);
    };

    let tx = connection.transaction()?;
    apply_selective_page_history(&tx, &entry.before, &entry.after, PageHistoryDirection::Redo)?;
    tx.execute(
        "UPDATE page_history_entries SET undone_at = NULL WHERE id = ?1",
        params![entry.id],
    )?;
    tx.commit()?;

    get_page_document(connection, &input.page_id).map(Some)
}

fn get_entry(
    connection: &Connection,
    page_id: &str,
    direction: PageHistoryDirection,
) -> Result<Option<PersistedPageHistoryEntry>> {
    let undone_predicate = match direction {
        PageHistoryDirection::Undo => "undone_at IS NULL",
        PageHistoryDirection::Redo => "undone_at IS NOT NULL",
    };
    let sql = format!(
        r#"
        SELECT id, before_json, after_json
        FROM page_history_entries
        WHERE page_id = ?1
          AND origin = 'local'
          AND actor_id = ?2
          AND discarded_at IS NULL
          AND {undone_predicate}
        ORDER BY created_at DESC
        LIMIT 1
        "#
    );

    connection
        .query_row(&sql, params![page_id, LOCAL_ACTOR_ID], |row| {
            let before_json: String = row.get(1)?;
            let after_json: String = row.get(2)?;

            Ok(PersistedPageHistoryEntry {
                after: parse_page_document(&after_json)?,
                before: parse_page_document(&before_json)?,
                id: row.get(0)?,
            })
        })
        .optional()
}

fn parse_page_document(value: &str) -> Result<PageDocument> {
    serde_json::from_str(value).map_err(|_| rusqlite::Error::InvalidQuery)
}

fn apply_selective_page_history(
    connection: &Connection,
    before: &PageDocument,
    after: &PageDocument,
    direction: PageHistoryDirection,
) -> Result<()> {
    let (from, to) = match direction {
        PageHistoryDirection::Undo => (after, before),
        PageHistoryDirection::Redo => (before, after),
    };

    apply_page_fields(connection, &before.page, &after.page, direction)?;
    apply_block_diff(
        connection,
        current_blocks(connection, &before.page.id)?,
        from,
        to,
    )
}

fn apply_page_fields(
    connection: &Connection,
    before: &Page,
    after: &Page,
    direction: PageHistoryDirection,
) -> Result<()> {
    let (from, to) = match direction {
        PageHistoryDirection::Undo => (after, before),
        PageHistoryDirection::Redo => (before, after),
    };
    let Some(current) = get_page(connection, &before.id)? else {
        return Ok(());
    };

    connection.execute(
        r#"
        UPDATE pages
        SET parent_page_id = ?1,
            title = ?2,
            sort_key = ?3,
            icon = ?4,
            cover = ?5,
            archived_at = ?6,
            updated_at = ?7
        WHERE id = ?8
        "#,
        params![
            changed_option(
                current.parent_page_id.as_deref(),
                from.parent_page_id.as_deref(),
                to.parent_page_id.as_deref()
            ),
            changed_string(&current.title, &from.title, &to.title),
            changed_string(&current.sort_key, &from.sort_key, &to.sort_key),
            changed_option(
                current.icon.as_deref(),
                from.icon.as_deref(),
                to.icon.as_deref()
            ),
            changed_option(
                current.cover.as_deref(),
                from.cover.as_deref(),
                to.cover.as_deref()
            ),
            changed_option(
                current.archived_at.as_deref(),
                from.archived_at.as_deref(),
                to.archived_at.as_deref()
            ),
            changed_string(&current.updated_at, &from.updated_at, &to.updated_at),
            before.id
        ],
    )?;
    index_page(connection, &before.id)?;

    Ok(())
}

fn apply_block_diff(
    connection: &Connection,
    current: HashMap<String, Block>,
    from: &PageDocument,
    to: &PageDocument,
) -> Result<()> {
    let from_blocks = block_map(&from.blocks);
    let to_blocks = block_map(&to.blocks);

    for block in &from.blocks {
        if !to_blocks.contains_key(&block.id) {
            delete_block_if_present(connection, &current, &block.id)?;
        }
    }

    for block in &to.blocks {
        let from_block = from_blocks.get(&block.id);
        let current_block = current.get(&block.id);

        match (from_block, current_block) {
            (None, None) => insert_block_snapshot(connection, block)?,
            (Some(from_block), Some(current_block)) => {
                update_changed_block_fields(connection, current_block, from_block, block)?;
            }
            _ => {}
        }
    }

    Ok(())
}

fn update_changed_block_fields(
    connection: &Connection,
    current: &Block,
    from: &Block,
    to: &Block,
) -> Result<()> {
    let props = changed_value(&current.props, &from.props, &to.props);

    connection.execute(
        r#"
        UPDATE blocks
        SET parent_block_id = ?1,
            type = ?2,
            sort_key = ?3,
            text = ?4,
            props_json = ?5,
            updated_at = ?6
        WHERE id = ?7
        "#,
        params![
            changed_option(
                current.parent_block_id.as_deref(),
                from.parent_block_id.as_deref(),
                to.parent_block_id.as_deref()
            ),
            changed_string(&current.block_type, &from.block_type, &to.block_type),
            changed_string(&current.sort_key, &from.sort_key, &to.sort_key),
            changed_string(&current.text, &from.text, &to.text),
            serde_json::to_string(&props).unwrap_or_else(|_| "{}".to_string()),
            changed_string(&current.updated_at, &from.updated_at, &to.updated_at),
            current.id
        ],
    )?;
    index_block(connection, &current.id)?;

    Ok(())
}

fn insert_block_snapshot(connection: &Connection, block: &Block) -> Result<()> {
    connection.execute(
        r#"
        INSERT INTO blocks (
            id, page_id, parent_block_id, type, sort_key, text, props_json, created_at, updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        "#,
        params![
            block.id,
            block.page_id,
            block.parent_block_id,
            block.block_type,
            block.sort_key,
            block.text,
            serde_json::to_string(&block.props).unwrap_or_else(|_| "{}".to_string()),
            block.created_at,
            block.updated_at
        ],
    )?;
    index_block(connection, &block.id)?;

    Ok(())
}

fn delete_block_if_present(
    connection: &Connection,
    current: &HashMap<String, Block>,
    block_id: &str,
) -> Result<()> {
    if !current.contains_key(block_id) {
        return Ok(());
    }

    delete_block_from_index(connection, block_id)?;
    connection.execute("DELETE FROM blocks WHERE id = ?1", params![block_id])?;
    Ok(())
}

fn get_page(connection: &Connection, page_id: &str) -> Result<Option<Page>> {
    connection
        .query_row(
            r#"
            SELECT id, parent_page_id, title, sort_key, icon, cover, archived_at, created_at, updated_at
            FROM pages
            WHERE id = ?1
            "#,
            params![page_id],
            |row| {
                Ok(Page {
                    id: row.get(0)?,
                    parent_page_id: row.get(1)?,
                    title: row.get(2)?,
                    sort_key: row.get(3)?,
                    icon: row.get(4)?,
                    cover: row.get(5)?,
                    archived_at: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .optional()
}

fn current_blocks(connection: &Connection, page_id: &str) -> Result<HashMap<String, Block>> {
    let mut statement = connection.prepare(
        r#"
        SELECT id, page_id, parent_block_id, type, sort_key, text, props_json, created_at, updated_at
        FROM blocks
        WHERE page_id = ?1
        "#,
    )?;
    let rows = statement.query_map(params![page_id], |row| {
        let props_json: String = row.get(6)?;
        let props =
            serde_json::from_str::<Value>(&props_json).unwrap_or(Value::Object(Default::default()));
        Ok(Block {
            id: row.get(0)?,
            page_id: row.get(1)?,
            parent_block_id: row.get(2)?,
            block_type: row.get(3)?,
            sort_key: row.get(4)?,
            text: row.get(5)?,
            props,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;
    let mut blocks = HashMap::new();

    for row in rows {
        let block = row?;
        blocks.insert(block.id.clone(), block);
    }

    Ok(blocks)
}

fn block_map(blocks: &[Block]) -> HashMap<String, &Block> {
    blocks
        .iter()
        .map(|block| (block.id.clone(), block))
        .collect()
}

fn changed_string(current: &str, from: &str, to: &str) -> String {
    if current == from {
        to.to_string()
    } else {
        current.to_string()
    }
}

fn changed_option(current: Option<&str>, from: Option<&str>, to: Option<&str>) -> Option<String> {
    if current == from {
        to.map(str::to_string)
    } else {
        current.map(str::to_string)
    }
}

fn changed_value(current: &Value, from: &Value, to: &Value) -> Value {
    if current == from {
        to.clone()
    } else {
        current.clone()
    }
}

fn index_page(connection: &Connection, page_id: &str) -> Result<()> {
    connection.execute("DELETE FROM pages_fts WHERE page_id = ?1", params![page_id])?;
    connection.execute(
        r#"
        INSERT INTO pages_fts(page_id, title)
        SELECT id, title FROM pages WHERE id = ?1 AND archived_at IS NULL
        "#,
        params![page_id],
    )?;
    Ok(())
}

fn index_block(connection: &Connection, block_id: &str) -> Result<()> {
    delete_block_from_index(connection, block_id)?;
    connection.execute(
        r#"
        INSERT INTO blocks_fts(block_id, page_id, text)
        SELECT id, page_id, text FROM blocks WHERE id = ?1 AND trim(text) != ''
        "#,
        params![block_id],
    )?;
    Ok(())
}

fn delete_block_from_index(connection: &Connection, block_id: &str) -> Result<()> {
    connection.execute(
        "DELETE FROM blocks_fts WHERE block_id = ?1",
        params![block_id],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;
    use crate::block_write::{
        create_block, move_block, update_block, CreateBlockInput, MoveBlockInput,
        ParentBlockIdInput, UpdateBlockInput,
    };
    use crate::database::open_database;
    use crate::page_write::{create_page, CreatePageInput};

    #[test]
    fn undoes_and_redoes_persisted_block_text_updates() {
        let temp_dir = tempdir().expect("create temp dir");
        let mut connection = open_database(temp_dir.path()).expect("open database");
        let document = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: "History".to_string(),
            },
        )
        .expect("create page");
        let block = document.blocks[0].clone();

        update_block(
            &mut connection,
            UpdateBlockInput {
                block_id: block.id.clone(),
                block_type: None,
                props: None,
                text: Some("first".to_string()),
            },
        )
        .expect("first update");
        update_block(
            &mut connection,
            UpdateBlockInput {
                block_id: block.id.clone(),
                block_type: None,
                props: None,
                text: Some("second".to_string()),
            },
        )
        .expect("second update");

        assert_eq!(
            undo_page_history(
                &mut connection,
                PageHistoryInput {
                    page_id: block.page_id.clone()
                },
            )
            .expect("undo")
            .expect("undo document")
            .blocks[0]
                .text,
            "first"
        );
        assert_eq!(
            redo_page_history(
                &mut connection,
                PageHistoryInput {
                    page_id: block.page_id.clone()
                },
            )
            .expect("redo")
            .expect("redo document")
            .blocks[0]
                .text,
            "second"
        );
    }

    #[test]
    fn preserves_external_block_changes_while_undoing() {
        let temp_dir = tempdir().expect("create temp dir");
        let mut connection = open_database(temp_dir.path()).expect("open database");
        let document = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: "Selective".to_string(),
            },
        )
        .expect("create page");
        let first = document.blocks[0].clone();
        let second = create_block(
            &mut connection,
            CreateBlockInput {
                after_block_id: Some(first.id.clone()),
                block_type: None,
                page_id: first.page_id.clone(),
                parent_block_id: None,
                props: None,
                text: Some("local create".to_string()),
            },
        )
        .expect("create second");

        connection
            .execute(
                "UPDATE blocks SET text = 'remote edit' WHERE id = ?1",
                params![first.id],
            )
            .expect("remote edit");

        let undone = undo_page_history(
            &mut connection,
            PageHistoryInput {
                page_id: first.page_id.clone(),
            },
        )
        .expect("undo")
        .expect("undo document");

        assert!(undone.blocks.iter().all(|block| block.id != second.id));
        assert_eq!(undone.blocks[0].text, "remote edit");
    }

    #[test]
    fn undoes_block_moves() {
        let temp_dir = tempdir().expect("create temp dir");
        let mut connection = open_database(temp_dir.path()).expect("open database");
        let document = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: "Move".to_string(),
            },
        )
        .expect("create page");
        let first = document.blocks[0].clone();
        let second = create_block(
            &mut connection,
            CreateBlockInput {
                after_block_id: Some(first.id.clone()),
                block_type: None,
                page_id: first.page_id.clone(),
                parent_block_id: None,
                props: None,
                text: Some("second".to_string()),
            },
        )
        .expect("create second");

        move_block(
            &mut connection,
            MoveBlockInput {
                after_block_id: None,
                block_id: second.id,
                parent_block_id: ParentBlockIdInput::Set(None),
            },
        )
        .expect("move second");

        let undone = undo_page_history(
            &mut connection,
            PageHistoryInput {
                page_id: first.page_id,
            },
        )
        .expect("undo")
        .expect("undo document");

        assert_eq!(undone.blocks[0].id, first.id);
    }
}
