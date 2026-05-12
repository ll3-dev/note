use rusqlite::{params, Connection, Result};
use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PageSearchResult {
    pub page_id: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Backlink {
    pub block_id: String,
    pub page_id: String,
    pub page_title: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(untagged)]
pub enum SearchWorkspaceResult {
    Page(WorkspacePageResult),
    Block(WorkspaceBlockResult),
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacePageResult {
    pub kind: &'static str,
    pub page_id: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceBlockResult {
    pub kind: &'static str,
    pub block_id: String,
    pub page_id: String,
    pub page_title: String,
    pub text: String,
}

pub fn search_pages(
    connection: &Connection,
    query: &str,
    limit: Option<usize>,
) -> Result<Vec<PageSearchResult>> {
    let query = query.trim();
    let limit = limit.unwrap_or(8).clamp(1, 20);

    if query.is_empty() {
        return Ok(Vec::new());
    }

    let Some(fts_query) = build_fts_query(query) else {
        return Ok(Vec::new());
    };

    let mut statement = connection.prepare(
        r#"
        SELECT pages.id AS page_id, pages.title AS title
        FROM pages_fts
        INNER JOIN pages ON pages.id = pages_fts.page_id
        WHERE pages.archived_at IS NULL
          AND pages_fts MATCH ?1
        ORDER BY
          CASE WHEN pages.title = ?2 THEN 0 ELSE 1 END,
          bm25(pages_fts),
          pages.title
        LIMIT ?3
        "#,
    )?;

    let rows = statement.query_map(params![fts_query, query, limit as i64], |row| {
        Ok(PageSearchResult {
            page_id: row.get(0)?,
            title: row.get(1)?,
        })
    })?;

    rows.collect()
}

pub fn search_workspace(
    connection: &Connection,
    query: &str,
    limit: Option<usize>,
) -> Result<Vec<SearchWorkspaceResult>> {
    let query = query.trim();
    let limit = limit.unwrap_or(12).clamp(1, 30);

    if query.is_empty() {
        return Ok(Vec::new());
    }

    let mut page_results = search_pages(connection, query, Some(limit))?
        .into_iter()
        .map(|page| {
            SearchWorkspaceResult::Page(WorkspacePageResult {
                kind: "page",
                page_id: page.page_id,
                title: page.title,
            })
        })
        .collect::<Vec<_>>();

    let Some(fts_query) = build_fts_query(query) else {
        page_results.truncate(limit);
        return Ok(page_results);
    };

    let mut statement = connection.prepare(
        r#"
        SELECT
          blocks.id AS block_id,
          blocks.page_id AS page_id,
          pages.title AS page_title,
          blocks.text AS text
        FROM blocks_fts
        INNER JOIN blocks ON blocks.id = blocks_fts.block_id
        INNER JOIN pages ON pages.id = blocks.page_id
        WHERE pages.archived_at IS NULL
          AND blocks_fts MATCH ?1
        ORDER BY bm25(blocks_fts), pages.title, blocks.sort_key
        LIMIT ?2
        "#,
    )?;
    let block_rows = statement.query_map(params![fts_query, limit as i64], |row| {
        Ok(SearchWorkspaceResult::Block(WorkspaceBlockResult {
            kind: "block",
            block_id: row.get(0)?,
            page_id: row.get(1)?,
            page_title: row.get(2)?,
            text: row.get(3)?,
        }))
    })?;
    let mut results = page_results;

    for row in block_rows {
        results.push(row?);
    }

    results.truncate(limit);
    Ok(results)
}

pub fn list_backlinks(connection: &Connection, page_id: &str) -> Result<Vec<Backlink>> {
    let mut statement = connection.prepare(
        r#"
        SELECT
          blocks.id AS block_id,
          blocks.page_id AS page_id,
          pages.title AS page_title,
          blocks.props_json AS props_json,
          blocks.text AS text
        FROM blocks
        INNER JOIN pages ON pages.id = blocks.page_id
        WHERE blocks.page_id != ?1
          AND pages.archived_at IS NULL
        ORDER BY pages.title, blocks.sort_key
        "#,
    )?;

    let rows = statement.query_map(params![page_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
        ))
    })?;
    let mut backlinks = Vec::new();

    for row in rows {
        let (block_id, source_page_id, page_title, props_json, text) = row?;

        if connected_page_ids(&props_json)
            .iter()
            .any(|id| id == page_id)
        {
            backlinks.push(Backlink {
                block_id,
                page_id: source_page_id,
                page_title,
                text,
            });
        }
    }

    Ok(backlinks)
}

fn build_fts_query(value: &str) -> Option<String> {
    let terms = value
        .trim()
        .split_whitespace()
        .map(|term| term.replace('"', "\"\""))
        .filter(|term| !term.is_empty())
        .map(|term| format!("\"{term}\"*"))
        .collect::<Vec<_>>();

    if terms.is_empty() {
        return None;
    }

    Some(terms.join(" AND "))
}

fn connected_page_ids(props_json: &str) -> Vec<String> {
    let Ok(Value::Object(props)) = serde_json::from_str::<Value>(props_json) else {
        return Vec::new();
    };
    let mut page_ids = Vec::new();

    if let Some(target_page_id) = props.get("targetPageId").and_then(Value::as_str) {
        if !target_page_id.is_empty() {
            page_ids.push(target_page_id.to_string());
        }
    }

    if let Some(inline_marks) = props.get("inlineMarks").and_then(Value::as_array) {
        for mark in inline_marks {
            if mark.get("type").and_then(Value::as_str) == Some("pageLink") {
                if let Some(page_id) = mark.get("pageId").and_then(Value::as_str) {
                    if !page_id.is_empty() {
                        page_ids.push(page_id.to_string());
                    }
                }
            }
        }
    }

    page_ids
}

#[cfg(test)]
mod tests {
    use rusqlite::params;
    use tempfile::tempdir;

    use super::*;
    use crate::database::open_database;

    #[test]
    fn searches_pages_and_workspace_blocks() {
        let temp_dir = tempdir().expect("create temp dir");
        let connection = open_database(temp_dir.path()).expect("open database");

        insert_page(&connection, "page-1", "Daily", None);
        insert_page_fts(&connection, "page-1", "Daily");
        insert_block(&connection, "block-1", "page-1", "Ship local search", "{}");
        insert_block_fts(&connection, "block-1", "page-1", "Ship local search");

        assert_eq!(
            search_pages(&connection, "Daily", None).expect("search pages"),
            vec![PageSearchResult {
                page_id: "page-1".to_string(),
                title: "Daily".to_string(),
            }]
        );
        assert!(search_workspace(&connection, "local", None)
            .expect("search workspace")
            .contains(&SearchWorkspaceResult::Block(WorkspaceBlockResult {
                kind: "block",
                block_id: "block-1".to_string(),
                page_id: "page-1".to_string(),
                page_title: "Daily".to_string(),
                text: "Ship local search".to_string(),
            })));
    }

    #[test]
    fn excludes_archived_pages_from_search() {
        let temp_dir = tempdir().expect("create temp dir");
        let connection = open_database(temp_dir.path()).expect("open database");

        insert_page(
            &connection,
            "archived",
            "Archived",
            Some("2026-05-12 10:00:00"),
        );
        insert_page_fts(&connection, "archived", "Archived");
        insert_block(&connection, "block-1", "archived", "Archived body", "{}");
        insert_block_fts(&connection, "block-1", "archived", "Archived body");

        assert!(search_pages(&connection, "Archived", None)
            .expect("search pages")
            .is_empty());
        assert!(search_workspace(&connection, "Archived", None)
            .expect("search workspace")
            .is_empty());
    }

    #[test]
    fn lists_target_and_inline_page_link_backlinks() {
        let temp_dir = tempdir().expect("create temp dir");
        let connection = open_database(temp_dir.path()).expect("open database");

        insert_page(&connection, "source", "Source", None);
        insert_page(&connection, "target", "Target", None);
        insert_block(
            &connection,
            "target-block",
            "source",
            "See Target",
            r#"{"targetPageId":"target"}"#,
        );
        insert_block(
            &connection,
            "inline-block",
            "source",
            "Mention Target",
            r#"{"inlineMarks":[{"type":"pageLink","pageId":"target"}]}"#,
        );

        assert_eq!(
            list_backlinks(&connection, "target").expect("backlinks"),
            vec![
                Backlink {
                    block_id: "target-block".to_string(),
                    page_id: "source".to_string(),
                    page_title: "Source".to_string(),
                    text: "See Target".to_string(),
                },
                Backlink {
                    block_id: "inline-block".to_string(),
                    page_id: "source".to_string(),
                    page_title: "Source".to_string(),
                    text: "Mention Target".to_string(),
                },
            ]
        );
    }

    fn insert_page(connection: &Connection, page_id: &str, title: &str, archived_at: Option<&str>) {
        connection
            .execute(
                r#"
                INSERT INTO pages (id, title, sort_key, archived_at, created_at, updated_at)
                VALUES (?1, ?2, '00000000', ?3, '2026-05-12 10:00:00', '2026-05-12 10:00:00')
                "#,
                params![page_id, title, archived_at],
            )
            .expect("insert page");
    }

    fn insert_block(
        connection: &Connection,
        block_id: &str,
        page_id: &str,
        text: &str,
        props_json: &str,
    ) {
        connection
            .execute(
                r#"
                INSERT INTO blocks (
                  id, page_id, parent_block_id, type, sort_key, text, props_json, created_at, updated_at
                )
                VALUES (?1, ?2, NULL, 'paragraph', '00000000', ?3, ?4, '2026-05-12 10:00:00', '2026-05-12 10:00:00')
                "#,
                params![block_id, page_id, text, props_json],
            )
            .expect("insert block");
    }

    fn insert_page_fts(connection: &Connection, page_id: &str, title: &str) {
        connection
            .execute(
                "INSERT INTO pages_fts(page_id, title) VALUES (?1, ?2)",
                params![page_id, title],
            )
            .expect("insert page fts");
    }

    fn insert_block_fts(connection: &Connection, block_id: &str, page_id: &str, text: &str) {
        connection
            .execute(
                "INSERT INTO blocks_fts(block_id, page_id, text) VALUES (?1, ?2, ?3)",
                params![block_id, page_id, text],
            )
            .expect("insert block fts");
    }
}
