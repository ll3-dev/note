use std::collections::HashSet;

use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DeletePageInput {
    pub page_id: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct DeletePageOutput {
    pub deleted: bool,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RestorePageInput {
    pub page_id: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct RestorePageOutput {
    pub restored: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PurgeExpiredArchivedPagesOutput {
    pub purged_count: usize,
}

pub fn delete_page(
    connection: &mut Connection,
    input: DeletePageInput,
) -> Result<DeletePageOutput> {
    let page_ids = collect_page_ids_with_descendants(connection, &[input.page_id])?;
    let tx = connection.transaction()?;

    for page_id in page_ids {
        tx.execute(
            r#"
            UPDATE pages
            SET archived_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?1
            "#,
            params![page_id],
        )?;
        delete_page_from_search_index(&tx, &page_id)?;
    }

    tx.commit()?;
    Ok(DeletePageOutput { deleted: true })
}

pub fn restore_page(
    connection: &mut Connection,
    input: RestorePageInput,
) -> Result<RestorePageOutput> {
    let page_ids = collect_page_ids_with_descendants(connection, &[input.page_id])?;
    let tx = connection.transaction()?;

    for page_id in page_ids {
        tx.execute(
            r#"
            UPDATE pages
            SET archived_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?1
            "#,
            params![page_id],
        )?;
        index_page(&tx, &page_id)?;
    }

    tx.commit()?;
    Ok(RestorePageOutput { restored: true })
}

pub fn purge_expired_archived_pages(
    connection: &mut Connection,
) -> Result<PurgeExpiredArchivedPagesOutput> {
    let cutoff = connection.query_row("SELECT datetime('now', '-30 days')", [], |row| {
        row.get::<_, String>(0)
    })?;
    let candidates = list_archived_page_ids(connection)?;
    let mut purge_ids = HashSet::new();

    for (page_id, archived_at) in candidates {
        if archived_at >= cutoff {
            continue;
        }

        let descendant_ids = collect_page_ids_with_descendants(connection, &[page_id])?;

        if has_unexpired_archived_descendant(connection, &descendant_ids, &cutoff)? {
            continue;
        }

        for page_id in descendant_ids {
            purge_ids.insert(page_id);
        }
    }

    let tx = connection.transaction()?;

    for page_id in &purge_ids {
        tx.execute(
            "DELETE FROM blocks_fts WHERE page_id = ?1",
            params![page_id],
        )?;
        delete_page_from_search_index(&tx, page_id)?;
        tx.execute(
            "DELETE FROM page_history_entries WHERE page_id = ?1",
            params![page_id],
        )?;
    }

    for page_id in &purge_ids {
        tx.execute("DELETE FROM pages WHERE id = ?1", params![page_id])?;
    }

    let purged_count = purge_ids.len();
    tx.commit()?;

    Ok(PurgeExpiredArchivedPagesOutput { purged_count })
}

fn list_archived_page_ids(connection: &Connection) -> Result<Vec<(String, String)>> {
    let mut statement =
        connection.prepare("SELECT id, archived_at FROM pages WHERE archived_at IS NOT NULL")?;

    let rows = statement
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect();
    rows
}

fn collect_page_ids_with_descendants(
    connection: &Connection,
    page_ids: &[String],
) -> Result<Vec<String>> {
    let mut seen = HashSet::new();
    let mut collected = Vec::new();
    let mut pending = page_ids
        .iter()
        .filter(|page_id| !page_id.is_empty())
        .cloned()
        .collect::<Vec<_>>();

    while let Some(page_id) = pending.pop() {
        if !seen.insert(page_id.clone()) {
            continue;
        }

        collected.push(page_id.clone());

        let mut statement = connection.prepare("SELECT id FROM pages WHERE parent_page_id = ?1")?;
        let children = statement
            .query_map(params![page_id], |row| row.get::<_, String>(0))?
            .collect::<Result<Vec<_>>>()?;

        pending.extend(children);
    }

    Ok(collected)
}

fn has_unexpired_archived_descendant(
    connection: &Connection,
    page_ids: &[String],
    cutoff: &str,
) -> Result<bool> {
    for page_id in page_ids {
        let archived_at = connection.query_row(
            "SELECT archived_at FROM pages WHERE id = ?1",
            params![page_id],
            |row| row.get::<_, Option<String>>(0),
        )?;

        if archived_at.as_deref().is_none_or(|value| value >= cutoff) {
            return Ok(true);
        }
    }

    Ok(false)
}

fn index_page(connection: &Connection, page_id: &str) -> Result<()> {
    delete_page_from_search_index(connection, page_id)?;
    connection.execute(
        r#"
        INSERT INTO pages_fts(page_id, title)
        SELECT id, title FROM pages WHERE id = ?1 AND archived_at IS NULL
        "#,
        params![page_id],
    )?;
    Ok(())
}

fn delete_page_from_search_index(connection: &Connection, page_id: &str) -> Result<()> {
    connection.execute("DELETE FROM pages_fts WHERE page_id = ?1", params![page_id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;
    use crate::database::open_database;
    use crate::documents::{get_page_document, list_archived_pages, list_pages};
    use crate::page_write::{create_page, CreatePageInput};
    use crate::search::{search_pages, search_workspace};

    #[test]
    fn archives_and_restores_pages_with_descendants() {
        let temp_dir = tempdir().expect("create temp dir");
        let mut connection = open_database(temp_dir.path()).expect("open database");
        let parent = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: "Parent".to_string(),
            },
        )
        .expect("create parent")
        .page;
        let child = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: Some(parent.id.clone()),
                title: "Child".to_string(),
            },
        )
        .expect("create child")
        .page;

        assert_eq!(
            delete_page(
                &mut connection,
                DeletePageInput {
                    page_id: parent.id.clone()
                },
            )
            .expect("delete page"),
            DeletePageOutput { deleted: true }
        );

        assert!(list_pages(&connection).expect("list pages").is_empty());
        assert!(search_pages(&connection, "Parent", None)
            .expect("search parent")
            .is_empty());
        assert!(search_workspace(&connection, "Child", None)
            .expect("search child")
            .is_empty());
        assert!(get_page_document(&connection, &parent.id)
            .expect("parent document")
            .page
            .archived_at
            .is_some());
        assert!(get_page_document(&connection, &child.id)
            .expect("child document")
            .page
            .archived_at
            .is_some());

        assert_eq!(
            restore_page(
                &mut connection,
                RestorePageInput {
                    page_id: parent.id.clone()
                },
            )
            .expect("restore page"),
            RestorePageOutput { restored: true }
        );

        let active_page_ids = list_pages(&connection)
            .expect("list active pages")
            .into_iter()
            .map(|page| page.id)
            .collect::<HashSet<_>>();
        assert!(active_page_ids.contains(&parent.id));
        assert!(active_page_ids.contains(&child.id));
        assert_eq!(
            search_pages(&connection, "Child", None).expect("search child")[0].page_id,
            child.id
        );
    }

    #[test]
    fn purges_pages_archived_past_retention_window() {
        let temp_dir = tempdir().expect("create temp dir");
        let mut connection = open_database(temp_dir.path()).expect("open database");
        let expired = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: "Expired".to_string(),
            },
        )
        .expect("create expired")
        .page;
        let recent = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: "Recent".to_string(),
            },
        )
        .expect("create recent")
        .page;

        delete_page(
            &mut connection,
            DeletePageInput {
                page_id: expired.id.clone(),
            },
        )
        .expect("archive expired");
        delete_page(
            &mut connection,
            DeletePageInput {
                page_id: recent.id.clone(),
            },
        )
        .expect("archive recent");
        connection
            .execute(
                "UPDATE pages SET archived_at = datetime('now', '-31 days') WHERE id = ?1",
                params![expired.id],
            )
            .expect("age expired archive");

        assert_eq!(
            purge_expired_archived_pages(&mut connection).expect("purge expired"),
            PurgeExpiredArchivedPagesOutput { purged_count: 1 }
        );
        assert!(get_page_document(&connection, &expired.id).is_err());
        assert!(get_page_document(&connection, &recent.id)
            .expect("recent document")
            .page
            .archived_at
            .is_some());
        assert_eq!(
            list_archived_pages(&connection)
                .expect("list archived pages")
                .into_iter()
                .map(|page| page.id)
                .collect::<Vec<_>>(),
            vec![recent.id]
        );
    }
}
