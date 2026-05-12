use std::collections::HashSet;

use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

use crate::documents::{get_page_document, Block, PageDocument};

#[derive(Debug, Clone, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CreateBlockInput {
    pub page_id: String,
    #[serde(default)]
    pub parent_block_id: Option<String>,
    #[serde(default, rename = "type")]
    pub block_type: Option<String>,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub props: Option<Value>,
    #[serde(default)]
    pub after_block_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CreateBlocksInput {
    pub blocks: Vec<CreateBlockInput>,
}

#[derive(Debug, Clone, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBlockInput {
    pub block_id: String,
    #[serde(default, rename = "type")]
    pub block_type: Option<String>,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub props: Option<Value>,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBlockInput {
    pub block_id: String,
}

#[derive(Debug, Clone, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBlocksInput {
    pub block_ids: Vec<String>,
    pub fallback_block: Option<FallbackBlockInput>,
}

#[derive(Debug, Clone, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FallbackBlockInput {
    pub page_id: String,
    #[serde(default, rename = "type")]
    pub block_type: Option<String>,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub props: Option<Value>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBlocksOutput {
    pub created_block: Option<Block>,
    pub deleted: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ParentBlockIdInput {
    Keep,
    Set(Option<String>),
}

impl Default for ParentBlockIdInput {
    fn default() -> Self {
        Self::Keep
    }
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MoveBlockInput {
    pub block_id: String,
    #[serde(default)]
    pub after_block_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_parent_block_id_input")]
    pub parent_block_id: ParentBlockIdInput,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MoveBlocksInput {
    pub block_ids: Vec<String>,
    #[serde(default)]
    pub after_block_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_parent_block_id_input")]
    pub parent_block_id: ParentBlockIdInput,
}

pub fn create_block(connection: &mut Connection, input: CreateBlockInput) -> Result<Block> {
    let page_id = input.page_id.clone();
    let before = get_page_document(connection, &page_id)?;
    let tx = connection.transaction()?;
    let block = insert_block(
        &tx,
        InsertBlockInput {
            page_id: &page_id,
            parent_block_id: input.parent_block_id.as_deref(),
            block_type: input.block_type.as_deref().unwrap_or("paragraph"),
            text: input.text.as_deref().unwrap_or(""),
            props: input.props.as_ref().unwrap_or(&Value::Object(Map::new())),
            after_block_id: input.after_block_id.as_deref(),
        },
    )?;

    touch_page(&tx, &page_id)?;
    record_operation(&tx, "block", &block.id, "create", &block)?;
    tx.commit()?;
    capture_history_after_change(connection, &page_id, before)?;

    Ok(block)
}

pub fn create_blocks(connection: &mut Connection, input: CreateBlocksInput) -> Result<Vec<Block>> {
    let Some(first) = input.blocks.first() else {
        return Ok(Vec::new());
    };
    let page_id = first.page_id.clone();
    let before = get_page_document(connection, &page_id)?;
    let tx = connection.transaction()?;
    let mut created_blocks = Vec::new();
    let mut after_block_id = first.after_block_id.as_deref().map(str::to_string);

    for block_input in &input.blocks {
        if block_input.page_id != page_id {
            return Err(rusqlite::Error::InvalidQuery);
        }

        let block = insert_block(
            &tx,
            InsertBlockInput {
                page_id: &page_id,
                parent_block_id: block_input.parent_block_id.as_deref(),
                block_type: block_input.block_type.as_deref().unwrap_or("paragraph"),
                text: block_input.text.as_deref().unwrap_or(""),
                props: block_input
                    .props
                    .as_ref()
                    .unwrap_or(&Value::Object(Map::new())),
                after_block_id: after_block_id.as_deref(),
            },
        )?;

        after_block_id = Some(block.id.clone());
        record_operation(&tx, "block", &block.id, "create", &block)?;
        created_blocks.push(block);
    }

    touch_page(&tx, &page_id)?;
    tx.commit()?;
    capture_history_after_change(connection, &page_id, before)?;

    Ok(created_blocks)
}

pub fn update_block(connection: &mut Connection, input: UpdateBlockInput) -> Result<Block> {
    let current = get_block(connection, &input.block_id)?;
    let before = get_page_document(connection, &current.page_id)?;
    let next_type = input
        .block_type
        .unwrap_or_else(|| current.block_type.clone());
    let next_text = input.text.unwrap_or_else(|| current.text.clone());
    let props = input.props.unwrap_or_else(|| current.props.clone());
    let next_props = normalize_block_props(&props, next_text.len());

    if next_type == current.block_type && next_text == current.text && next_props == current.props {
        return Ok(current);
    }

    let tx = connection.transaction()?;

    tx.execute(
        r#"
        UPDATE blocks
        SET type = ?1, text = ?2, props_json = ?3, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?4
        "#,
        params![
            next_type,
            next_text,
            serde_json::to_string(&next_props).unwrap_or_else(|_| "{}".to_string()),
            input.block_id
        ],
    )?;
    touch_page(&tx, &current.page_id)?;
    index_block(&tx, &input.block_id)?;
    let block = get_block(&tx, &input.block_id)?;
    record_operation(
        &tx,
        "block",
        &block.id,
        "update",
        &json!({ "type": block.block_type, "text": block.text, "props": block.props }),
    )?;
    tx.commit()?;
    capture_history_after_change(connection, &current.page_id, before)?;

    get_block(connection, &input.block_id)
}

pub fn delete_block(connection: &mut Connection, input: DeleteBlockInput) -> Result<()> {
    let current = get_block(connection, &input.block_id)?;
    let before = get_page_document(connection, &current.page_id)?;
    let tx = connection.transaction()?;

    delete_block_from_index(&tx, &input.block_id)?;
    tx.execute("DELETE FROM blocks WHERE id = ?1", params![input.block_id])?;
    touch_page(&tx, &current.page_id)?;
    record_operation(&tx, "block", &current.id, "delete", &json!({}))?;
    tx.commit()?;
    capture_history_after_change(connection, &current.page_id, before)?;

    Ok(())
}

pub fn delete_blocks(
    connection: &mut Connection,
    input: DeleteBlocksInput,
) -> Result<DeleteBlocksOutput> {
    let first_block = get_block(
        connection,
        input
            .block_ids
            .first()
            .ok_or(rusqlite::Error::InvalidQuery)?,
    )?;
    let page_id = first_block.page_id.clone();
    let before = get_page_document(connection, &page_id)?;
    let tx = connection.transaction()?;
    let mut created_block = None;

    for block_id in &input.block_ids {
        let block = get_block(&tx, block_id)?;

        if block.page_id != page_id {
            return Err(rusqlite::Error::InvalidQuery);
        }

        tx.execute("DELETE FROM blocks WHERE id = ?1", params![block_id])?;
        delete_block_from_index(&tx, block_id)?;
        record_operation(&tx, "block", block_id, "delete", &json!({}))?;
    }

    if let Some(fallback) = input.fallback_block {
        if fallback.page_id != page_id {
            return Err(rusqlite::Error::InvalidQuery);
        }

        let block = insert_block(
            &tx,
            InsertBlockInput {
                page_id: &page_id,
                parent_block_id: None,
                block_type: fallback.block_type.as_deref().unwrap_or("paragraph"),
                text: fallback.text.as_deref().unwrap_or(""),
                props: fallback
                    .props
                    .as_ref()
                    .unwrap_or(&Value::Object(Map::new())),
                after_block_id: None,
            },
        )?;

        record_operation(&tx, "block", &block.id, "create", &block)?;
        created_block = Some(block);
    }

    touch_page(&tx, &page_id)?;
    tx.commit()?;
    capture_history_after_change(connection, &page_id, before)?;

    Ok(DeleteBlocksOutput {
        created_block,
        deleted: true,
    })
}

pub fn move_block(connection: &mut Connection, input: MoveBlockInput) -> Result<Block> {
    let moving_block = get_block(connection, &input.block_id)?;
    let parent_block_id = resolve_parent_block_id(
        &input.parent_block_id,
        moving_block.parent_block_id.as_deref(),
    );
    let before = get_page_document(connection, &moving_block.page_id)?;
    let tx = connection.transaction()?;

    move_block_ids(
        &tx,
        &moving_block.page_id,
        &[moving_block.id.clone()],
        parent_block_id,
        input.after_block_id.as_deref(),
    )?;
    touch_page(&tx, &moving_block.page_id)?;
    record_operation(
        &tx,
        "block",
        &moving_block.id,
        "move",
        &json!({ "afterBlockId": input.after_block_id }),
    )?;
    tx.commit()?;
    capture_history_after_change(connection, &moving_block.page_id, before)?;

    get_block(connection, &input.block_id)
}

pub fn move_blocks(connection: &mut Connection, input: MoveBlocksInput) -> Result<Vec<Block>> {
    let moving_blocks = input
        .block_ids
        .iter()
        .map(|block_id| get_block(connection, block_id))
        .collect::<Result<Vec<_>>>()?;
    let page_id = moving_blocks
        .first()
        .map(|block| block.page_id.clone())
        .ok_or(rusqlite::Error::InvalidQuery)?;
    let block_ids = moving_blocks
        .iter()
        .map(|block| block.id.clone())
        .collect::<Vec<_>>();
    let block_id_set = block_ids.iter().collect::<HashSet<_>>();

    if block_id_set.len() != block_ids.len()
        || moving_blocks.iter().any(|block| block.page_id != page_id)
    {
        return Err(rusqlite::Error::InvalidQuery);
    }

    let parent_block_id = resolve_parent_block_id(
        &input.parent_block_id,
        moving_blocks[0].parent_block_id.as_deref(),
    );

    if let Some(parent_block_id) = parent_block_id {
        if block_ids.iter().any(|block_id| block_id == parent_block_id) {
            return Err(rusqlite::Error::InvalidQuery);
        }
    }

    let before = get_page_document(connection, &page_id)?;
    let tx = connection.transaction()?;

    move_block_ids(
        &tx,
        &page_id,
        &block_ids,
        parent_block_id,
        input.after_block_id.as_deref(),
    )?;
    touch_page(&tx, &page_id)?;

    for block_id in &block_ids {
        record_operation(
            &tx,
            "block",
            block_id,
            "move",
            &json!({ "afterBlockId": input.after_block_id }),
        )?;
    }

    tx.commit()?;
    capture_history_after_change(connection, &page_id, before)?;

    block_ids
        .iter()
        .map(|block_id| get_block(connection, block_id))
        .collect()
}

struct InsertBlockInput<'a> {
    page_id: &'a str,
    parent_block_id: Option<&'a str>,
    block_type: &'a str,
    text: &'a str,
    props: &'a Value,
    after_block_id: Option<&'a str>,
}

fn insert_block(connection: &Connection, input: InsertBlockInput<'_>) -> Result<Block> {
    let block_id = uuid::Uuid::new_v4().to_string();
    let sort_key = get_next_sort_key(
        connection,
        input.page_id,
        input.parent_block_id,
        input.after_block_id,
    )?;
    let props = normalize_block_props(input.props, input.text.len());

    connection.execute(
        r#"
        INSERT INTO blocks (id, page_id, parent_block_id, type, sort_key, text, props_json)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        "#,
        params![
            block_id,
            input.page_id,
            input.parent_block_id,
            input.block_type,
            sort_key,
            input.text,
            serde_json::to_string(&props).unwrap_or_else(|_| "{}".to_string())
        ],
    )?;
    index_block(connection, &block_id)?;
    get_block(connection, &block_id)
}

fn move_block_ids(
    connection: &Connection,
    page_id: &str,
    moving_block_ids: &[String],
    parent_block_id: Option<&str>,
    after_block_id: Option<&str>,
) -> Result<()> {
    let moving_block_set = moving_block_ids.iter().collect::<HashSet<_>>();

    if let Some(after_block_id) = after_block_id {
        if moving_block_set.contains(&after_block_id.to_string()) {
            return Err(rusqlite::Error::InvalidQuery);
        }

        let after_block = get_block(connection, after_block_id)?;
        if after_block.page_id != page_id
            || after_block.parent_block_id.as_deref() != parent_block_id
        {
            return Err(rusqlite::Error::InvalidQuery);
        }
    }

    let mut sibling_ids =
        get_sibling_block_ids_excluding(connection, page_id, parent_block_id, moving_block_ids)?;
    let insert_index = after_block_id
        .and_then(|after_block_id| {
            sibling_ids
                .iter()
                .position(|id| id == after_block_id)
                .map(|index| index + 1)
        })
        .unwrap_or(0);

    for (offset, block_id) in moving_block_ids.iter().enumerate() {
        sibling_ids.insert(insert_index + offset, block_id.clone());
    }

    for (index, block_id) in sibling_ids.iter().enumerate() {
        if moving_block_set.contains(block_id) {
            connection.execute(
                r#"
                UPDATE blocks
                SET parent_block_id = ?1, sort_key = printf('%08d', ?2), updated_at = CURRENT_TIMESTAMP
                WHERE id = ?3
                "#,
                params![parent_block_id, index as i64, block_id],
            )?;
        } else {
            connection.execute(
                "UPDATE blocks SET sort_key = printf('%08d', ?1) WHERE id = ?2",
                params![index as i64, block_id],
            )?;
        }
    }

    Ok(())
}

fn get_next_sort_key(
    connection: &Connection,
    page_id: &str,
    parent_block_id: Option<&str>,
    after_block_id: Option<&str>,
) -> Result<String> {
    if let Some(after_block_id) = after_block_id {
        let after_block = get_block(connection, after_block_id)?;
        let next_index = after_block.sort_key.parse::<i64>().unwrap_or(0) + 1;

        if after_block.page_id != page_id
            || after_block.parent_block_id.as_deref() != parent_block_id
        {
            return Err(rusqlite::Error::InvalidQuery);
        }

        shift_blocks_from_index(connection, page_id, parent_block_id, next_index)?;
        return Ok(make_sort_key(next_index));
    }

    let count = count_sibling_blocks(connection, page_id, parent_block_id)?;
    Ok(make_sort_key(count))
}

fn shift_blocks_from_index(
    connection: &Connection,
    page_id: &str,
    parent_block_id: Option<&str>,
    index: i64,
) -> Result<()> {
    match parent_block_id {
        Some(parent_block_id) => connection.execute(
            r#"
            UPDATE blocks
            SET sort_key = printf('%08d', CAST(sort_key AS INTEGER) + 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE page_id = ?1 AND parent_block_id = ?2 AND CAST(sort_key AS INTEGER) >= ?3
            "#,
            params![page_id, parent_block_id, index],
        )?,
        None => connection.execute(
            r#"
            UPDATE blocks
            SET sort_key = printf('%08d', CAST(sort_key AS INTEGER) + 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE page_id = ?1 AND parent_block_id IS NULL AND CAST(sort_key AS INTEGER) >= ?2
            "#,
            params![page_id, index],
        )?,
    };

    Ok(())
}

fn count_sibling_blocks(
    connection: &Connection,
    page_id: &str,
    parent_block_id: Option<&str>,
) -> Result<i64> {
    match parent_block_id {
        Some(parent_block_id) => connection.query_row(
            "SELECT COUNT(*) FROM blocks WHERE page_id = ?1 AND parent_block_id = ?2",
            params![page_id, parent_block_id],
            |row| row.get(0),
        ),
        None => connection.query_row(
            "SELECT COUNT(*) FROM blocks WHERE page_id = ?1 AND parent_block_id IS NULL",
            params![page_id],
            |row| row.get(0),
        ),
    }
}

fn get_sibling_block_ids_excluding(
    connection: &Connection,
    page_id: &str,
    parent_block_id: Option<&str>,
    excluded_block_ids: &[String],
) -> Result<Vec<String>> {
    let excluded = excluded_block_ids.iter().collect::<HashSet<_>>();
    let sql = match parent_block_id {
        Some(_) => {
            "SELECT id FROM blocks WHERE page_id = ?1 AND parent_block_id = ?2 ORDER BY sort_key"
        }
        None => {
            "SELECT id FROM blocks WHERE page_id = ?1 AND parent_block_id IS NULL ORDER BY sort_key"
        }
    };
    let mut ids = Vec::new();

    match parent_block_id {
        Some(parent_block_id) => {
            let mut statement = connection.prepare(sql)?;
            let rows = statement.query_map(params![page_id, parent_block_id], |row| {
                row.get::<_, String>(0)
            })?;

            for row in rows {
                let block_id = row?;
                if !excluded.contains(&block_id) {
                    ids.push(block_id);
                }
            }
        }
        None => {
            let mut statement = connection.prepare(sql)?;
            let rows = statement.query_map(params![page_id], |row| row.get::<_, String>(0))?;

            for row in rows {
                let block_id = row?;
                if !excluded.contains(&block_id) {
                    ids.push(block_id);
                }
            }
        }
    }

    Ok(ids)
}

pub fn get_block(connection: &Connection, block_id: &str) -> Result<Block> {
    connection.query_row(
        r#"
        SELECT id, page_id, parent_block_id, type, sort_key, text, props_json, created_at, updated_at
        FROM blocks
        WHERE id = ?1
        "#,
        params![block_id],
        |row| {
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
        },
    )
}

fn parse_props(value: &str) -> Value {
    match serde_json::from_str::<Value>(value) {
        Ok(Value::Object(object)) => Value::Object(object),
        _ => Value::Object(Map::new()),
    }
}

fn deserialize_parent_block_id_input<'de, D>(
    deserializer: D,
) -> Result<ParentBlockIdInput, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Option::<String>::deserialize(deserializer).map(ParentBlockIdInput::Set)
}

fn resolve_parent_block_id<'a>(
    input: &'a ParentBlockIdInput,
    current_parent_block_id: Option<&'a str>,
) -> Option<&'a str> {
    match input {
        ParentBlockIdInput::Keep => current_parent_block_id,
        ParentBlockIdInput::Set(parent_block_id) => parent_block_id.as_deref(),
    }
}

fn normalize_block_props(props: &Value, text_len: usize) -> Value {
    let Value::Object(input) = props else {
        return Value::Object(Map::new());
    };
    let mut output = Map::new();

    copy_bool(input, &mut output, "checked");
    copy_bool(input, &mut output, "open");
    copy_string(input, &mut output, "icon", 32);
    copy_i64_clamped(input, &mut output, "depth", 0, 6);
    copy_i64_clamped(input, &mut output, "start", 1, 999_999);
    copy_string(input, &mut output, "language", 64);
    copy_string(input, &mut output, "targetPageId", 128);
    copy_string(input, &mut output, "targetTitle", 200);
    copy_string(input, &mut output, "src", 4_000);
    copy_string(input, &mut output, "alt", 500);
    copy_string(input, &mut output, "caption", 1_000);

    let inline_marks = normalize_inline_marks(input.get("inlineMarks"), text_len);
    if !inline_marks.is_empty() {
        output.insert("inlineMarks".to_string(), Value::Array(inline_marks));
    }

    Value::Object(output)
}

fn normalize_inline_marks(value: Option<&Value>, text_len: usize) -> Vec<Value> {
    let Some(Value::Array(items)) = value else {
        return Vec::new();
    };
    let allowed = ["bold", "italic", "code", "link", "pageLink"];
    let mut marks = Vec::new();

    for item in items {
        let Value::Object(mark) = item else {
            continue;
        };
        let Some(mark_type) = mark.get("type").and_then(Value::as_str) else {
            continue;
        };

        if !allowed.contains(&mark_type) {
            continue;
        }

        let Some(start) = mark.get("start").and_then(Value::as_i64) else {
            continue;
        };
        let Some(end) = mark.get("end").and_then(Value::as_i64) else {
            continue;
        };
        let start = start.clamp(0, text_len as i64);
        let end = end.clamp(0, text_len as i64);

        if start >= end {
            continue;
        }

        let mut normalized = Map::from_iter([
            ("end".to_string(), Value::from(end)),
            ("start".to_string(), Value::from(start)),
            ("type".to_string(), Value::from(mark_type)),
        ]);

        if mark_type == "link" {
            let href = mark.get("href").and_then(Value::as_str).unwrap_or("");
            if !(href.starts_with("http://") || href.starts_with("https://")) {
                continue;
            }
            normalized.insert("href".to_string(), Value::from(href));
        }

        if mark_type == "pageLink" {
            let Some(page_id) = mark.get("pageId").and_then(Value::as_str) else {
                continue;
            };
            if page_id.is_empty() {
                continue;
            }
            normalized.insert(
                "pageId".to_string(),
                Value::from(slice_string(page_id, 128)),
            );
        }

        marks.push(Value::Object(normalized));
    }

    marks
}

fn copy_bool(input: &Map<String, Value>, output: &mut Map<String, Value>, key: &str) {
    if let Some(value) = input.get(key).and_then(Value::as_bool) {
        output.insert(key.to_string(), Value::Bool(value));
    }
}

fn copy_string(
    input: &Map<String, Value>,
    output: &mut Map<String, Value>,
    key: &str,
    max_len: usize,
) {
    if let Some(value) = input.get(key).and_then(Value::as_str) {
        output.insert(key.to_string(), Value::String(slice_string(value, max_len)));
    }
}

fn copy_i64_clamped(
    input: &Map<String, Value>,
    output: &mut Map<String, Value>,
    key: &str,
    min: i64,
    max: i64,
) {
    if let Some(value) = input.get(key).and_then(Value::as_i64) {
        output.insert(key.to_string(), Value::from(value.clamp(min, max)));
    }
}

fn slice_string(value: &str, max_len: usize) -> String {
    value.chars().take(max_len).collect()
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

fn touch_page(connection: &Connection, page_id: &str) -> Result<()> {
    connection.execute(
        "UPDATE pages SET updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![page_id],
    )?;
    Ok(())
}

fn record_operation<T: Serialize>(
    connection: &Connection,
    entity_type: &str,
    entity_id: &str,
    op_type: &str,
    payload: &T,
) -> Result<()> {
    connection.execute(
        r#"
        INSERT INTO block_operations (id, entity_type, entity_id, op_type, payload_json)
        VALUES (?1, ?2, ?3, ?4, ?5)
        "#,
        params![
            uuid::Uuid::new_v4().to_string(),
            entity_type,
            entity_id,
            op_type,
            serde_json::to_string(payload).unwrap_or_else(|_| "{}".to_string())
        ],
    )?;
    Ok(())
}

fn capture_history_after_change(
    connection: &mut Connection,
    page_id: &str,
    before: PageDocument,
) -> Result<()> {
    let after = get_page_document(connection, page_id)?;
    let before_json = serde_json::to_string(&before).unwrap_or_default();
    let after_json = serde_json::to_string(&after).unwrap_or_default();

    if before_json == after_json {
        return Ok(());
    }

    let tx = connection.transaction()?;
    tx.execute(
        r#"
        UPDATE page_history_entries
        SET discarded_at = CURRENT_TIMESTAMP
        WHERE page_id = ?1
          AND origin = 'local'
          AND actor_id = 'local'
          AND undone_at IS NOT NULL
          AND discarded_at IS NULL
        "#,
        params![page_id],
    )?;
    tx.execute(
        r#"
        INSERT INTO page_history_entries (id, page_id, origin, actor_id, before_json, after_json)
        VALUES (?1, ?2, 'local', 'local', ?3, ?4)
        "#,
        params![
            uuid::Uuid::new_v4().to_string(),
            page_id,
            before_json,
            after_json
        ],
    )?;
    tx.execute(
        r#"
        DELETE FROM page_history_entries
        WHERE page_id = ?1
          AND id NOT IN (
            SELECT id
            FROM page_history_entries
            WHERE page_id = ?1
            ORDER BY created_at DESC, id DESC
            LIMIT 1000
          )
        "#,
        params![page_id],
    )?;
    tx.commit()?;
    Ok(())
}

fn make_sort_key(index: i64) -> String {
    format!("{index:08}")
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;
    use crate::database::open_database;
    use crate::page_write::{create_page, CreatePageInput};
    use crate::search::search_workspace;

    #[test]
    fn creates_updates_and_deletes_block_with_history_and_search() {
        let temp_dir = tempdir().expect("create temp dir");
        let mut connection = open_database(temp_dir.path()).expect("open database");
        let document = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: "Daily".to_string(),
            },
        )
        .expect("create page");
        let block = create_block(
            &mut connection,
            CreateBlockInput {
                after_block_id: None,
                block_type: Some("todo".to_string()),
                page_id: document.page.id.clone(),
                parent_block_id: None,
                props: Some(json!({ "checked": false })),
                text: Some("Ship local search".to_string()),
            },
        )
        .expect("create block");

        assert!(search_workspace(&connection, "local", None)
            .expect("search workspace")
            .iter()
            .any(|result| serde_json::to_value(result).unwrap()["blockId"] == block.id));

        let updated = update_block(
            &mut connection,
            UpdateBlockInput {
                block_id: block.id.clone(),
                block_type: None,
                props: Some(json!({ "checked": true })),
                text: Some("Ship sync".to_string()),
            },
        )
        .expect("update block");

        assert_eq!(updated.props["checked"], true);
        assert!(search_workspace(&connection, "local", None)
            .expect("search workspace")
            .is_empty());

        delete_block(&mut connection, DeleteBlockInput { block_id: block.id }).expect("delete");

        let history_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM page_history_entries WHERE page_id = ?1",
                params![document.page.id],
                |row| row.get(0),
            )
            .expect("history count");
        assert_eq!(history_count, 3);
    }

    #[test]
    fn skips_history_for_noop_block_updates() {
        let temp_dir = tempdir().expect("create temp dir");
        let mut connection = open_database(temp_dir.path()).expect("open database");
        let document = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: "No-op".to_string(),
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
                text: Some(block.text),
            },
        )
        .expect("noop update");

        let history_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM page_history_entries WHERE page_id = ?1",
                params![document.page.id],
                |row| row.get(0),
            )
            .expect("history count");
        assert_eq!(history_count, 0);
    }

    #[test]
    fn normalizes_inline_marks_and_preserves_block_props() {
        let temp_dir = tempdir().expect("create temp dir");
        let mut connection = open_database(temp_dir.path()).expect("open database");
        let document = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: "Formatting".to_string(),
            },
        )
        .expect("create page");
        let block = create_block(
            &mut connection,
            CreateBlockInput {
                after_block_id: None,
                block_type: Some("callout".to_string()),
                page_id: document.page.id,
                parent_block_id: None,
                props: Some(json!({
                    "icon": "💡",
                    "inlineMarks": [
                        { "end": 5, "start": 0, "type": "bold" },
                        { "end": 50, "start": 6, "type": "code" },
                        { "end": 11, "href": "https://example.com", "start": 6, "type": "link" },
                        { "end": 5, "pageId": "page-123", "start": 0, "type": "pageLink" },
                        { "end": 5, "start": 0, "type": "pageLink" },
                        { "end": 5, "href": "javascript:alert", "start": 0, "type": "link" },
                        { "end": 2, "start": 2, "type": "italic" },
                        { "end": 4, "start": 1, "type": "unknown" }
                    ]
                })),
                text: Some("Hello world".to_string()),
            },
        )
        .expect("create formatted block");

        assert_eq!(block.block_type, "callout");
        assert_eq!(
            block.props,
            json!({
                "icon": "💡",
                "inlineMarks": [
                    { "end": 5, "start": 0, "type": "bold" },
                    { "end": 11, "start": 6, "type": "code" },
                    { "end": 11, "href": "https://example.com", "start": 6, "type": "link" },
                    { "end": 5, "pageId": "page-123", "start": 0, "type": "pageLink" }
                ]
            })
        );
    }

    #[test]
    fn moves_blocks_and_batches_creation() {
        let temp_dir = tempdir().expect("create temp dir");
        let mut connection = open_database(temp_dir.path()).expect("open database");
        let document = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: "Batch".to_string(),
            },
        )
        .expect("create page");
        let blocks = create_blocks(
            &mut connection,
            CreateBlocksInput {
                blocks: vec![
                    CreateBlockInput {
                        after_block_id: None,
                        block_type: None,
                        page_id: document.page.id.clone(),
                        parent_block_id: None,
                        props: None,
                        text: Some("A".to_string()),
                    },
                    CreateBlockInput {
                        after_block_id: None,
                        block_type: None,
                        page_id: document.page.id.clone(),
                        parent_block_id: None,
                        props: None,
                        text: Some("B".to_string()),
                    },
                ],
            },
        )
        .expect("create blocks");

        let moved = move_block(
            &mut connection,
            MoveBlockInput {
                after_block_id: None,
                block_id: blocks[1].id.clone(),
                parent_block_id: ParentBlockIdInput::Keep,
            },
        )
        .expect("move block");

        assert_eq!(moved.sort_key, "00000000");
    }

    #[test]
    fn batch_delete_can_create_a_fallback_block() {
        let temp_dir = tempdir().expect("create temp dir");
        let mut connection = open_database(temp_dir.path()).expect("open database");
        let document = create_page(
            &mut connection,
            CreatePageInput {
                parent_page_id: None,
                title: "Fallback".to_string(),
            },
        )
        .expect("create page");
        let initial_block = document.blocks[0].clone();

        let output = delete_blocks(
            &mut connection,
            DeleteBlocksInput {
                block_ids: vec![initial_block.id],
                fallback_block: Some(FallbackBlockInput {
                    block_type: None,
                    page_id: document.page.id.clone(),
                    props: None,
                    text: Some("".to_string()),
                }),
            },
        )
        .expect("delete with fallback");

        let created_block = output.created_block.expect("created block");
        assert!(output.deleted);
        assert_eq!(created_block.page_id, document.page.id);
        assert_eq!(
            get_page_document(&connection, &document.page.id)
                .expect("document")
                .blocks
                .len(),
            1
        );
    }

    #[test]
    fn deserializes_rpc_block_contract_fields() {
        let create_input = serde_json::from_value::<CreateBlockInput>(json!({
            "pageId": "page-1",
            "type": "todo",
            "text": "Task"
        }))
        .expect("deserialize create block");
        assert_eq!(create_input.block_type.as_deref(), Some("todo"));

        let keep_parent = serde_json::from_value::<MoveBlockInput>(json!({
            "blockId": "block-1"
        }))
        .expect("deserialize keep parent");
        assert_eq!(keep_parent.parent_block_id, ParentBlockIdInput::Keep);

        let root_parent = serde_json::from_value::<MoveBlockInput>(json!({
            "blockId": "block-1",
            "parentBlockId": null
        }))
        .expect("deserialize root parent");
        assert_eq!(root_parent.parent_block_id, ParentBlockIdInput::Set(None));

        let nested_parent = serde_json::from_value::<MoveBlockInput>(json!({
            "blockId": "block-1",
            "parentBlockId": "parent-1"
        }))
        .expect("deserialize nested parent");
        assert_eq!(
            nested_parent.parent_block_id,
            ParentBlockIdInput::Set(Some("parent-1".to_string()))
        );
    }
}
