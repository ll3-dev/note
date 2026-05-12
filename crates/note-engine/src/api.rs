use std::path::PathBuf;
use std::sync::Arc;

use axum::extract::{Path, Query, Request, State};
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use axum::Json;
use note_core::database::{get_database_status, open_database, DatabaseStatus};
use note_core::documents::{
    get_page_document, list_archived_pages, list_pages, Page, PageDocument,
};
use note_core::search::{
    list_backlinks, search_pages, search_workspace, Backlink, PageSearchResult,
    SearchWorkspaceResult,
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct EngineState {
    pub database_path: PathBuf,
    pub connection: Arc<Mutex<Connection>>,
    pub session_token: String,
}

#[derive(Serialize)]
pub struct EngineInfo {
    pub engine_version: &'static str,
    pub api_version: &'static str,
    pub capabilities: Vec<&'static str>,
}

#[derive(Serialize)]
pub struct HealthResponse {
    pub ok: bool,
}

#[derive(Deserialize)]
pub struct SearchQuery {
    pub query: String,
    pub limit: Option<usize>,
}

pub fn create_state(user_data_path: PathBuf) -> anyhow::Result<EngineState> {
    let database_path = user_data_path.join("note.sqlite3");
    let connection = open_database(&user_data_path)?;

    Ok(EngineState {
        database_path,
        connection: Arc::new(Mutex::new(connection)),
        session_token: uuid::Uuid::new_v4().to_string(),
    })
}

pub async fn require_token(
    State(state): State<EngineState>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let expected = format!("Bearer {}", state.session_token);
    let actual = request
        .headers()
        .get("authorization")
        .and_then(|value| value.to_str().ok());

    if actual != Some(expected.as_str()) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    Ok(next.run(request).await)
}

pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { ok: true })
}

pub async fn engine_info() -> Json<EngineInfo> {
    Json(EngineInfo {
        engine_version: env!("CARGO_PKG_VERSION"),
        api_version: "1",
        capabilities: vec!["engine.v1", "database.v1"],
    })
}

pub async fn database_status(
    State(state): State<EngineState>,
) -> Result<Json<DatabaseStatus>, (StatusCode, String)> {
    let connection = state.connection.lock().await;
    get_database_status(&connection, &state.database_path)
        .map(Json)
        .map_err(map_database_error)
}

pub async fn pages(
    State(state): State<EngineState>,
) -> Result<Json<Vec<Page>>, (StatusCode, String)> {
    let connection = state.connection.lock().await;
    list_pages(&connection).map(Json).map_err(map_database_error)
}

pub async fn archived_pages(
    State(state): State<EngineState>,
) -> Result<Json<Vec<Page>>, (StatusCode, String)> {
    let connection = state.connection.lock().await;
    list_archived_pages(&connection)
        .map(Json)
        .map_err(map_database_error)
}

pub async fn page_document(
    State(state): State<EngineState>,
    Path(page_id): Path<String>,
) -> Result<Json<PageDocument>, (StatusCode, String)> {
    let connection = state.connection.lock().await;
    get_page_document(&connection, &page_id)
        .map(Json)
        .map_err(map_database_error)
}

pub async fn page_search(
    State(state): State<EngineState>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<Vec<PageSearchResult>>, (StatusCode, String)> {
    let connection = state.connection.lock().await;
    search_pages(&connection, &query.query, query.limit)
        .map(Json)
        .map_err(map_database_error)
}

pub async fn workspace_search(
    State(state): State<EngineState>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<Vec<SearchWorkspaceResult>>, (StatusCode, String)> {
    let connection = state.connection.lock().await;
    search_workspace(&connection, &query.query, query.limit)
        .map(Json)
        .map_err(map_database_error)
}

pub async fn backlinks(
    State(state): State<EngineState>,
    Path(page_id): Path<String>,
) -> Result<Json<Vec<Backlink>>, (StatusCode, String)> {
    let connection = state.connection.lock().await;
    list_backlinks(&connection, &page_id)
        .map(Json)
        .map_err(map_database_error)
}

fn map_database_error(error: rusqlite::Error) -> (StatusCode, String) {
    let status = match error {
        rusqlite::Error::QueryReturnedNoRows => StatusCode::NOT_FOUND,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    };

    (status, error.to_string())
}
