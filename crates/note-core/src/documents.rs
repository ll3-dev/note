use rusqlite::{params, Connection, Result, Row};
use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Page {
    pub id: String,
    pub parent_page_id: Option<String>,
    pub title: String,
    pub sort_key: String,
    pub icon: Option<String>,
    pub cover: Option<String>,
    pub archived_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Block {
    pub id: String,
    pub page_id: String,
    pub parent_block_id: Option<String>,
    pub block_type: String,
    pub sort_key: String,
    pub text: String,
    pub props: Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PageDocument {
    pub page: Page,
    pub blocks: Vec<Block>,
}

impl Serialize for Block {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;

        let mut state = serializer.serialize_struct("Block", 9)?;
        state.serialize_field("id", &self.id)?;
        state.serialize_field("pageId", &self.page_id)?;
        state.serialize_field("parentBlockId", &self.parent_block_id)?;
        state.serialize_field("type", &self.block_type)?;
        state.serialize_field("sortKey", &self.sort_key)?;
        state.serialize_field("text", &self.text)?;
        state.serialize_field("props", &self.props)?;
        state.serialize_field("createdAt", &self.created_at)?;
        state.serialize_field("updatedAt", &self.updated_at)?;
        state.end()
    }
}

pub fn list_pages(connection: &Connection) -> Result<Vec<Page>> {
    let mut statement = connection.prepare(
        r#"
        SELECT id, parent_page_id, title, sort_key, icon, cover, archived_at, created_at, updated_at
        FROM pages
        WHERE archived_at IS NULL
        ORDER BY parent_page_id ASC, sort_key ASC, rowid ASC
        "#,
    )?;

    let pages = statement.query_map([], map_page)?.collect();
    pages
}

pub fn list_archived_pages(connection: &Connection) -> Result<Vec<Page>> {
    let mut statement = connection.prepare(
        r#"
        SELECT id, parent_page_id, title, sort_key, icon, cover, archived_at, created_at, updated_at
        FROM pages
        WHERE archived_at IS NOT NULL
        ORDER BY archived_at ASC, parent_page_id ASC, sort_key ASC
        "#,
    )?;

    let pages = statement.query_map([], map_page)?.collect();
    pages
}

pub fn get_page_document(connection: &Connection, page_id: &str) -> Result<PageDocument> {
    Ok(PageDocument {
        page: get_page(connection, page_id)?,
        blocks: list_blocks_for_page(connection, page_id)?,
    })
}

fn get_page(connection: &Connection, page_id: &str) -> Result<Page> {
    connection.query_row(
        r#"
        SELECT id, parent_page_id, title, sort_key, icon, cover, archived_at, created_at, updated_at
        FROM pages
        WHERE id = ?1
        "#,
        params![page_id],
        map_page,
    )
}

fn list_blocks_for_page(connection: &Connection, page_id: &str) -> Result<Vec<Block>> {
    let mut statement = connection.prepare(
        r#"
        SELECT id, page_id, parent_block_id, type, sort_key, text, props_json, created_at, updated_at
        FROM blocks
        WHERE page_id = ?1
        ORDER BY parent_block_id ASC, sort_key ASC
        "#,
    )?;

    let blocks = statement.query_map(params![page_id], map_block)?.collect();
    blocks
}

fn map_page(row: &Row<'_>) -> Result<Page> {
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
}

fn map_block(row: &Row<'_>) -> Result<Block> {
    let props_json: String = row.get(6)?;

    Ok(Block {
        id: row.get(0)?,
        page_id: row.get(1)?,
        parent_block_id: row.get(2)?,
        block_type: row.get(3)?,
        sort_key: row.get(4)?,
        text: row.get(5)?,
        props: parse_props(&props_json),
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn parse_props(value: &str) -> Value {
    match serde_json::from_str::<Value>(value) {
        Ok(Value::Object(object)) => Value::Object(object),
        _ => Value::Object(Default::default()),
    }
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;
    use crate::database::open_database;

    #[test]
    fn lists_active_and_archived_pages_in_existing_order() {
        let temp_dir = tempdir().expect("create temp dir");
        let connection = open_database(temp_dir.path()).expect("open database");

        connection
            .execute(
                r#"
                INSERT INTO pages (id, title, sort_key, archived_at, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, '2026-05-12 10:00:00', '2026-05-12 10:00:00')
                "#,
                params!["active-a", "Active A", "00000000", Option::<String>::None],
            )
            .expect("insert active a");
        connection
            .execute(
                r#"
                INSERT INTO pages (id, title, sort_key, archived_at, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, '2026-05-12 10:00:00', '2026-05-12 10:00:00')
                "#,
                params!["active-b", "Active B", "00000001", Option::<String>::None],
            )
            .expect("insert active b");
        connection
            .execute(
                r#"
                INSERT INTO pages (id, title, sort_key, archived_at, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, '2026-05-12 10:00:00', '2026-05-12 10:00:00')
                "#,
                params![
                    "archived",
                    "Archived",
                    "00000002",
                    Some("2026-05-12 11:00:00")
                ],
            )
            .expect("insert archived");

        let active_ids = list_pages(&connection)
            .expect("list pages")
            .into_iter()
            .map(|page| page.id)
            .collect::<Vec<_>>();
        let archived_ids = list_archived_pages(&connection)
            .expect("list archived pages")
            .into_iter()
            .map(|page| page.id)
            .collect::<Vec<_>>();

        assert_eq!(active_ids, vec!["active-a", "active-b"]);
        assert_eq!(archived_ids, vec!["archived"]);
    }

    #[test]
    fn returns_page_document_with_normalized_block_props() {
        let temp_dir = tempdir().expect("create temp dir");
        let connection = open_database(temp_dir.path()).expect("open database");

        connection
            .execute(
                r#"
                INSERT INTO pages (id, title, sort_key, created_at, updated_at)
                VALUES ('page-1', 'Page', '00000000', '2026-05-12 10:00:00', '2026-05-12 10:00:00')
                "#,
                [],
            )
            .expect("insert page");
        connection
            .execute(
                r#"
                INSERT INTO blocks (
                  id, page_id, parent_block_id, type, sort_key, text, props_json, created_at, updated_at
                )
                VALUES (
                  'block-1', 'page-1', NULL, 'todo', '00000000', 'Ship Rust reads',
                  '{"checked":true}', '2026-05-12 10:00:00', '2026-05-12 10:00:00'
                )
                "#,
                [],
            )
            .expect("insert block");
        connection
            .execute(
                r#"
                INSERT INTO blocks (
                  id, page_id, parent_block_id, type, sort_key, text, props_json, created_at, updated_at
                )
                VALUES (
                  'block-2', 'page-1', NULL, 'paragraph', '00000001', 'Bad props',
                  '[]', '2026-05-12 10:00:00', '2026-05-12 10:00:00'
                )
                "#,
                [],
            )
            .expect("insert block with bad props");

        let document = get_page_document(&connection, "page-1").expect("page document");

        assert_eq!(document.page.id, "page-1");
        assert_eq!(document.blocks[0].block_type, "todo");
        assert_eq!(document.blocks[0].props["checked"], true);
        assert_eq!(document.blocks[1].props, serde_json::json!({}));
    }
}
