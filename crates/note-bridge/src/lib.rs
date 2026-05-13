use std::ffi::{CStr, CString, c_char};
use std::path::PathBuf;
use std::sync::{Arc, Mutex, OnceLock};

use rustra::prelude::*;
use rusqlite::Connection;
use serde::Deserialize;
use serde_json::{Value, json};

// -- Input/Output types for commands that need bridge-specific shapes --

#[derive(Deserialize, JsonSchema)]
struct EmptyInput {}

#[derive(Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
struct GetPageDocumentInput {
    page_id: String,
}

#[derive(Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
struct SearchPagesInput {
    query: String,
    limit: Option<usize>,
}

#[derive(Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
struct SearchWorkspaceInput {
    query: String,
    limit: Option<usize>,
}

#[derive(Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
struct ListBacklinksInput {
    page_id: String,
}

#[derive(Serialize, JsonSchema)]
struct DeleteBlockOutput {
    deleted: bool,
}

#[derive(Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
struct EngineInfoOutput {
    engine_version: String,
    api_version: String,
    capabilities: Vec<&'static str>,
}

#[derive(Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
struct BridgeMoveBlockInput {
    block_id: String,
    after_block_id: Option<String>,
    parent_block_id: Option<String>,
}

#[derive(Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
struct BridgeMoveBlocksInput {
    block_ids: Vec<String>,
    after_block_id: Option<String>,
    parent_block_id: Option<String>,
}

// -- State --

pub struct BridgeState {
    connection: Mutex<Connection>,
    database_path: PathBuf,
}

impl BridgeState {
    pub fn new(user_data_path: PathBuf) -> rustra::Result<Self> {
        let connection = note_core::database::open_database(&user_data_path)
            .map_err(|e| RustraError::internal(e.to_string()))?;
        Ok(Self {
            database_path: user_data_path.join("note.sqlite3"),
            connection: Mutex::new(connection),
        })
    }
}

// -- Error mapping --

fn map_database_error(error: rusqlite::Error) -> RustraError {
    match error {
        rusqlite::Error::QueryReturnedNoRows => {
            RustraError::custom("notFound", "requested record was not found")
        }
        rusqlite::Error::InvalidQuery => RustraError::custom(
            "invalidRequest",
            "request violates note engine domain rules",
        ),
        _ => RustraError::custom("databaseError", error.to_string()),
    }
}

fn lock_conn(state: &BridgeState) -> rustra::Result<std::sync::MutexGuard<'_, Connection>> {
    state.connection.lock().map_err(|e| RustraError::internal(e.to_string()))
}

// -- Package builder --

pub fn build_package(state: Arc<BridgeState>) -> Package {
    Package::builder("com.note")
        .command("engineInfo", |_input: EmptyInput| -> rustra::Result<EngineInfoOutput> {
            Ok(EngineInfoOutput {
                engine_version: env!("CARGO_PKG_VERSION").to_string(),
                api_version: "1".to_string(),
                capabilities: vec!["pages", "blocks", "search", "history", "archive"],
            })
        })
        .command("databaseStatus", {
            let s = state.clone();
            move |_input: EmptyInput| -> rustra::Result<note_core::database::DatabaseStatus> {
                let c = lock_conn(&s)?;
                note_core::database::get_database_status(&c, &s.database_path)
                    .map_err(map_database_error)
            }
        })
        .command("listPages", {
            let s = state.clone();
            move |_input: EmptyInput| -> rustra::Result<Vec<note_core::documents::Page>> {
                let c = lock_conn(&s)?;
                note_core::documents::list_pages(&c).map_err(map_database_error)
            }
        })
        .command("listArchivedPages", {
            let s = state.clone();
            move |_input: EmptyInput| -> rustra::Result<Vec<note_core::documents::Page>> {
                let c = lock_conn(&s)?;
                note_core::documents::list_archived_pages(&c).map_err(map_database_error)
            }
        })
        .command("getPageDocument", {
            let s = state.clone();
            move |input: GetPageDocumentInput| -> rustra::Result<note_core::documents::PageDocument> {
                let c = lock_conn(&s)?;
                note_core::documents::get_page_document(&c, &input.page_id)
                    .map_err(map_database_error)
            }
        })
        .command("createPage", {
            let s = state.clone();
            move |input: note_core::page_write::CreatePageInput| -> rustra::Result<note_core::documents::PageDocument> {
                let mut c = lock_conn(&s)?;
                note_core::page_write::create_page(&mut c, input).map_err(map_database_error)
            }
        })
        .command("updatePage", {
            let s = state.clone();
            move |input: note_core::page_write::UpdatePageInput| -> rustra::Result<note_core::documents::Page> {
                let mut c = lock_conn(&s)?;
                note_core::page_write::update_page(&mut c, input).map_err(map_database_error)
            }
        })
        .command("movePage", {
            let s = state.clone();
            move |input: note_core::page_write::MovePageInput| -> rustra::Result<note_core::documents::Page> {
                let mut c = lock_conn(&s)?;
                note_core::page_write::move_page(&mut c, input).map_err(map_database_error)
            }
        })
        .command("deletePage", {
            let s = state.clone();
            move |input: note_core::page_archive::DeletePageInput| -> rustra::Result<note_core::page_archive::DeletePageOutput> {
                let mut c = lock_conn(&s)?;
                note_core::page_archive::delete_page(&mut c, input).map_err(map_database_error)
            }
        })
        .command("restorePage", {
            let s = state.clone();
            move |input: note_core::page_archive::RestorePageInput| -> rustra::Result<note_core::page_archive::RestorePageOutput> {
                let mut c = lock_conn(&s)?;
                note_core::page_archive::restore_page(&mut c, input).map_err(map_database_error)
            }
        })
        .command("purgeExpiredArchivedPages", {
            let s = state.clone();
            move |_input: EmptyInput| -> rustra::Result<note_core::page_archive::PurgeExpiredArchivedPagesOutput> {
                let mut c = lock_conn(&s)?;
                note_core::page_archive::purge_expired_archived_pages(&mut c)
                    .map_err(map_database_error)
            }
        })
        .command("undoPageHistory", {
            let s = state.clone();
            move |input: note_core::page_history::PageHistoryInput| -> rustra::Result<Option<note_core::documents::PageDocument>> {
                let mut c = lock_conn(&s)?;
                note_core::page_history::undo_page_history(&mut c, input)
                    .map_err(map_database_error)
            }
        })
        .command("redoPageHistory", {
            let s = state.clone();
            move |input: note_core::page_history::PageHistoryInput| -> rustra::Result<Option<note_core::documents::PageDocument>> {
                let mut c = lock_conn(&s)?;
                note_core::page_history::redo_page_history(&mut c, input)
                    .map_err(map_database_error)
            }
        })
        .command("createBlock", {
            let s = state.clone();
            move |input: note_core::block_write::CreateBlockInput| -> rustra::Result<note_core::documents::Block> {
                let mut c = lock_conn(&s)?;
                note_core::block_write::create_block(&mut c, input).map_err(map_database_error)
            }
        })
        .command("createBlocks", {
            let s = state.clone();
            move |input: note_core::block_write::CreateBlocksInput| -> rustra::Result<Vec<note_core::documents::Block>> {
                let mut c = lock_conn(&s)?;
                note_core::block_write::create_blocks(&mut c, input).map_err(map_database_error)
            }
        })
        .command("updateBlock", {
            let s = state.clone();
            move |input: note_core::block_write::UpdateBlockInput| -> rustra::Result<note_core::documents::Block> {
                let mut c = lock_conn(&s)?;
                note_core::block_write::update_block(&mut c, input).map_err(map_database_error)
            }
        })
        .command("deleteBlock", {
            let s = state.clone();
            move |input: note_core::block_write::DeleteBlockInput| -> rustra::Result<DeleteBlockOutput> {
                let mut c = lock_conn(&s)?;
                note_core::block_write::delete_block(&mut c, input).map_err(map_database_error)?;
                Ok(DeleteBlockOutput { deleted: true })
            }
        })
        .command("deleteBlocks", {
            let s = state.clone();
            move |input: note_core::block_write::DeleteBlocksInput| -> rustra::Result<note_core::block_write::DeleteBlocksOutput> {
                let mut c = lock_conn(&s)?;
                note_core::block_write::delete_blocks(&mut c, input).map_err(map_database_error)
            }
        })
        .command("moveBlock", {
            let s = state.clone();
            move |input: BridgeMoveBlockInput| -> rustra::Result<note_core::documents::Block> {
                let mut c = lock_conn(&s)?;
                let core_input = note_core::block_write::MoveBlockInput {
                    block_id: input.block_id,
                    after_block_id: input.after_block_id,
                    parent_block_id: note_core::block_write::ParentBlockIdInput::Set(input.parent_block_id),
                };
                note_core::block_write::move_block(&mut c, core_input).map_err(map_database_error)
            }
        })
        .command("moveBlocks", {
            let s = state.clone();
            move |input: BridgeMoveBlocksInput| -> rustra::Result<Vec<note_core::documents::Block>> {
                let mut c = lock_conn(&s)?;
                let core_input = note_core::block_write::MoveBlocksInput {
                    block_ids: input.block_ids,
                    after_block_id: input.after_block_id,
                    parent_block_id: note_core::block_write::ParentBlockIdInput::Set(input.parent_block_id),
                };
                note_core::block_write::move_blocks(&mut c, core_input).map_err(map_database_error)
            }
        })
        .command("searchPages", {
            let s = state.clone();
            move |input: SearchPagesInput| -> rustra::Result<Vec<note_core::search::PageSearchResult>> {
                let c = lock_conn(&s)?;
                note_core::search::search_pages(&c, &input.query, input.limit)
                    .map_err(map_database_error)
            }
        })
        .command("searchWorkspace", {
            let s = state.clone();
            move |input: SearchWorkspaceInput| -> rustra::Result<Vec<note_core::search::SearchWorkspaceResult>> {
                let c = lock_conn(&s)?;
                note_core::search::search_workspace(&c, &input.query, input.limit)
                    .map_err(map_database_error)
            }
        })
        .command("listBacklinks", {
            let s = state.clone();
            move |input: ListBacklinksInput| -> rustra::Result<Vec<note_core::search::Backlink>> {
                let c = lock_conn(&s)?;
                note_core::search::list_backlinks(&c, &input.page_id)
                    .map_err(map_database_error)
            }
        })
        .build()
}

// -- FFI entry point --

static STATE: OnceLock<Arc<BridgeState>> = OnceLock::new();

const MAX_PAYLOAD_BYTES: usize = 1024 * 1024;

#[unsafe(no_mangle)]
pub unsafe extern "C" fn rustra_note_invoke(payload: *const c_char) -> *mut c_char {
    if payload.is_null() {
        return json_string(json!({ "ok": false, "error": "payload was null" }));
    }

    let payload = match unsafe { CStr::from_ptr(payload) }.to_str() {
        Ok(p) => p,
        Err(e) => return json_string(json!({ "ok": false, "error": format!("payload was not UTF-8: {e}") })),
    };

    if payload.len() > MAX_PAYLOAD_BYTES {
        return json_string(json!({ "ok": false, "error": "payload exceeds size limit" }));
    }

    let request = match serde_json::from_str::<Value>(payload) {
        Ok(r) => r,
        Err(e) => return json_string(json!({ "ok": false, "error": format!("invalid json: {e}") })),
    };

    let Some(command) = request.get("command").and_then(Value::as_str) else {
        return json_string(json!({ "ok": false, "error": "missing command" }));
    };

    let args = request.get("args").cloned().unwrap_or_else(|| json!({}));

    if let Some(user_data_path) = request.get("userDataPath").and_then(Value::as_str) {
        let _ = STATE.get_or_init(|| {
            let path = PathBuf::from(user_data_path);
            Arc::new(BridgeState::new(path).expect("failed to initialize bridge state"))
        });
    }

    let Some(state) = STATE.get() else {
        return json_string(json!({ "ok": false, "error": "bridge not initialized: provide userDataPath" }));
    };

    let package = build_package(state.clone());
    match package.invoke_json(command, args) {
        Ok(result) => json_string(json!({ "ok": true, "result": result })),
        Err(error) => json_string(json!({ "ok": false, "error": error.to_string() })),
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn rustra_note_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        let _ = unsafe { CString::from_raw(ptr) };
    }
}

fn json_string(value: Value) -> *mut c_char {
    let text = serde_json::to_string(&value)
        .unwrap_or_else(|e| format!(r#"{{"ok":false,"error":"json encode failed: {e}"}}"#));
    CString::new(text)
        .expect("JSON response should not contain interior null bytes")
        .into_raw()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::TempDir;

    struct TestBridge {
        package: Package,
        _temp_dir: TempDir,
    }

    impl TestBridge {
        fn new() -> Self {
            let temp_dir = tempfile::tempdir().expect("create temp dir");
            let state = BridgeState::new(temp_dir.path().to_path_buf()).expect("create state");
            let package = build_package(Arc::new(state));
            Self {
                package,
                _temp_dir: temp_dir,
            }
        }

        fn invoke(&self, command: &str, args: Value) -> Value {
            self.package.invoke_json(command, args).expect("invoke")
        }

        fn invoke_error(&self, command: &str, args: Value) -> RustraError {
            self.package.invoke_json(command, args).unwrap_err()
        }
    }

    #[test]
    fn handles_full_page_block_search_archive_history_flow() {
        let bridge = TestBridge::new();

        let document = bridge.invoke("createPage", json!({ "title": "Daily" }));
        let page_id = document["page"]["id"].as_str().unwrap();
        let first_block_id = document["blocks"][0]["id"].as_str().unwrap();

        let block = bridge.invoke(
            "updateBlock",
            json!({
                "blockId": first_block_id,
                "text": "Ship Rust engine"
            }),
        );
        assert_eq!(block["text"], "Ship Rust engine");

        let results = bridge.invoke("searchWorkspace", json!({ "query": "Rust" }));
        assert_eq!(results.as_array().unwrap().len(), 1);

        let undo = bridge.invoke("undoPageHistory", json!({ "pageId": page_id }));
        assert_eq!(undo["blocks"][0]["text"], "");

        let redo = bridge.invoke("redoPageHistory", json!({ "pageId": page_id }));
        assert_eq!(redo["blocks"][0]["text"], "Ship Rust engine");

        let archive = bridge.invoke("deletePage", json!({ "pageId": page_id }));
        assert_eq!(archive["deleted"], true);

        let pages = bridge.invoke("listPages", json!({}));
        assert_eq!(pages.as_array().unwrap().len(), 0);

        let restore = bridge.invoke("restorePage", json!({ "pageId": page_id }));
        assert_eq!(restore["restored"], true);

        let pages = bridge.invoke("listPages", json!({}));
        assert_eq!(pages.as_array().unwrap().len(), 1);
    }

    #[test]
    fn maps_errors_to_rustra_error_codes() {
        let bridge = TestBridge::new();
        let document = bridge.invoke("createPage", json!({ "title": "Daily" }));
        let page_id = document["page"]["id"].as_str().unwrap();

        let err = bridge.invoke_error("getPageDocument", json!({ "pageId": "missing-page" }));
        assert_eq!(err.code(), "notFound");

        let err = bridge.invoke_error(
            "movePage",
            json!({
                "pageId": page_id,
                "parentPageId": page_id
            }),
        );
        assert_eq!(err.code(), "invalidRequest");
    }

    #[test]
    fn engine_info_and_database_status_work() {
        let bridge = TestBridge::new();

        let info = bridge.invoke("engineInfo", json!({}));
        assert_eq!(info["engineVersion"], env!("CARGO_PKG_VERSION"));
        assert!(info["capabilities"].as_array().unwrap().len() > 0);

        let status = bridge.invoke("databaseStatus", json!({}));
        assert!(!status["sqlite_version"].as_str().unwrap().is_empty());
        assert_eq!(status["pages_count"], 0);
    }
}
