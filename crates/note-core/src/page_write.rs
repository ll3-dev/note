use rusqlite::{params, Connection, OptionalExtension, Result};
use serde::Deserialize;

use crate::documents::{get_page_document, Page, PageDocument};

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CreatePageInput {
    pub title: String,
    pub parent_page_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePageInput {
    pub page_id: String,
    pub title: Option<String>,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MovePageInput {
    pub page_id: String,
    pub parent_page_id: Option<String>,
    pub after_page_id: Option<String>,
}

pub fn create_page(connection: &mut Connection, input: CreatePageInput) -> Result<PageDocument> {
    let page_id = uuid::Uuid::new_v4().to_string();
    let title = input.title.trim().to_string();
    let parent_page_id = input.parent_page_id.as_deref();
    let tx = connection.transaction()?;
    let sort_key = get_tail_page_sort_key(&tx, parent_page_id)?;

    tx.execute(
        r#"
        INSERT INTO pages (id, parent_page_id, sort_key, title)
        VALUES (?1, ?2, ?3, ?4)
        "#,
        params![page_id, parent_page_id, sort_key, title],
    )?;
    index_page(&tx, &page_id)?;
    tx.execute(
        r#"
        INSERT INTO blocks (id, page_id, parent_block_id, type, sort_key, text, props_json)
        VALUES (?1, ?2, NULL, 'paragraph', '00000000', '', '{}')
        "#,
        params![uuid::Uuid::new_v4().to_string(), page_id],
    )?;
    tx.commit()?;

    get_page_document(connection, &page_id)
}

pub fn update_page(connection: &mut Connection, input: UpdatePageInput) -> Result<Page> {
    if let Some(title) = input.title {
        let title = title.trim().to_string();
        let tx = connection.transaction()?;

        tx.execute(
            r#"
            UPDATE pages
            SET title = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?2
            "#,
            params![title, input.page_id],
        )?;
        index_page(&tx, &input.page_id)?;
        tx.commit()?;
    }

    get_page(connection, &input.page_id)
}

pub fn move_page(connection: &mut Connection, input: MovePageInput) -> Result<Page> {
    let page = get_page(connection, &input.page_id)?;
    let parent_page_id = input.parent_page_id.as_deref();
    let after_page_id = input.after_page_id.as_deref();

    validate_page_move(connection, &page.id, parent_page_id, after_page_id)?;

    let tx = connection.transaction()?;
    let sort_key = get_next_page_sort_key(&tx, parent_page_id, after_page_id)?;

    tx.execute(
        r#"
        UPDATE pages
        SET parent_page_id = ?1, sort_key = ?2, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?3
        "#,
        params![parent_page_id, sort_key, page.id],
    )?;
    tx.commit()?;

    get_page(connection, &input.page_id)
}

pub fn get_page(connection: &Connection, page_id: &str) -> Result<Page> {
    connection.query_row(
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
}

fn get_tail_page_sort_key(connection: &Connection, parent_page_id: Option<&str>) -> Result<String> {
    let count: i64 = match parent_page_id {
        Some(parent_page_id) => connection.query_row(
            r#"
            SELECT COUNT(*)
            FROM pages
            WHERE archived_at IS NULL AND parent_page_id = ?1
            "#,
            params![parent_page_id],
            |row| row.get(0),
        )?,
        None => connection.query_row(
            r#"
            SELECT COUNT(*)
            FROM pages
            WHERE archived_at IS NULL AND parent_page_id IS NULL
            "#,
            [],
            |row| row.get(0),
        )?,
    };

    Ok(make_sort_key(count))
}

fn get_next_page_sort_key(
    connection: &Connection,
    parent_page_id: Option<&str>,
    after_page_id: Option<&str>,
) -> Result<String> {
    if let Some(after_page_id) = after_page_id {
        let after_page = get_page(connection, after_page_id)?;
        let next_index = after_page.sort_key.parse::<i64>().unwrap_or(0) + 1;

        shift_pages_from_index(connection, parent_page_id, next_index)?;
        return Ok(make_sort_key(next_index));
    }

    shift_pages_from_index(connection, parent_page_id, 0)?;
    Ok(make_sort_key(0))
}

fn shift_pages_from_index(
    connection: &Connection,
    parent_page_id: Option<&str>,
    index: i64,
) -> Result<()> {
    match parent_page_id {
        Some(parent_page_id) => {
            connection.execute(
                r#"
                UPDATE pages
                SET sort_key = printf('%08d', CAST(sort_key AS INTEGER) + 1),
                    updated_at = CURRENT_TIMESTAMP
                WHERE archived_at IS NULL
                  AND parent_page_id = ?1
                  AND CAST(sort_key AS INTEGER) >= ?2
                "#,
                params![parent_page_id, index],
            )?;
        }
        None => {
            connection.execute(
                r#"
                UPDATE pages
                SET sort_key = printf('%08d', CAST(sort_key AS INTEGER) + 1),
                    updated_at = CURRENT_TIMESTAMP
                WHERE archived_at IS NULL
                  AND parent_page_id IS NULL
                  AND CAST(sort_key AS INTEGER) >= ?1
                "#,
                params![index],
            )?;
        }
    }

    Ok(())
}

fn validate_page_move(
    connection: &Connection,
    page_id: &str,
    parent_page_id: Option<&str>,
    after_page_id: Option<&str>,
) -> Result<()> {
    if parent_page_id == Some(page_id) {
        return Err(rusqlite::Error::InvalidQuery);
    }

    if let Some(parent_page_id) = parent_page_id {
        if is_descendant_page(connection, parent_page_id, page_id)? {
            return Err(rusqlite::Error::InvalidQuery);
        }
    }

    if let Some(after_page_id) = after_page_id {
        let after_page = get_page(connection, after_page_id)?;

        if after_page.parent_page_id.as_deref() != parent_page_id {
            return Err(rusqlite::Error::InvalidQuery);
        }
    }

    Ok(())
}

fn is_descendant_page(
    connection: &Connection,
    candidate_page_id: &str,
    ancestor_page_id: &str,
) -> Result<bool> {
    let mut current_page = get_page(connection, candidate_page_id)?;

    while let Some(parent_page_id) = current_page.parent_page_id {
        if parent_page_id == ancestor_page_id {
            return Ok(true);
        }

        current_page = get_page(connection, &parent_page_id)?;
    }

    Ok(false)
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

fn make_sort_key(index: i64) -> String {
    format!("{index:08}")
}

pub fn page_exists(connection: &Connection, page_id: &str) -> Result<bool> {
    let exists = connection
        .query_row(
            "SELECT 1 FROM pages WHERE id = ?1",
            params![page_id],
            |_| Ok(()),
        )
        .optional()?
        .is_some();

    Ok(exists)
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;
    use crate::database::open_database;
    use crate::search::search_pages;

    #[test]
    fn creates_page_with_initial_block_and_search_index() {
        let temp_dir = tempdir().expect("create temp dir");
        let mut connection = open_database(temp_dir.path()).expect("open database");

        let document = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: " Project notes ".to_string(),
            },
        )
        .expect("create page");

        assert_eq!(document.page.title, "Project notes");
        assert_eq!(document.blocks.len(), 1);
        assert_eq!(document.blocks[0].block_type, "paragraph");
        assert_eq!(
            search_pages(&connection, "Project", None).expect("search pages")[0].page_id,
            document.page.id
        );
    }

    #[test]
    fn updates_page_title_and_moves_pages() {
        let temp_dir = tempdir().expect("create temp dir");
        let mut connection = open_database(temp_dir.path()).expect("open database");

        let first = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: "First".to_string(),
            },
        )
        .expect("create first")
        .page;
        let second = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: "Second".to_string(),
            },
        )
        .expect("create second")
        .page;
        let updated = update_page(
            &mut connection,
            UpdatePageInput {
                page_id: first.id.clone(),
                title: Some(" Published ".to_string()),
            },
        )
        .expect("update page");

        assert_eq!(updated.title, "Published");

        let moved = move_page(
            &mut connection,
            MovePageInput {
                after_page_id: None,
                page_id: second.id.clone(),
                parent_page_id: Some(first.id.clone()),
            },
        )
        .expect("move page");

        assert_eq!(moved.parent_page_id.as_deref(), Some(first.id.as_str()));
        assert_eq!(moved.sort_key, "00000000");
    }
}
