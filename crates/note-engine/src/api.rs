use std::path::PathBuf;
use std::sync::Arc;

use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use axum::Json;
use note_core::database::{get_database_status, open_database, DatabaseStatus};
use rusqlite::Connection;
use serde::Serialize;
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
) -> Result<Json<DatabaseStatus>, String> {
    let connection = state.connection.lock().await;
    get_database_status(&connection, &state.database_path)
        .map(Json)
        .map_err(|error| error.to_string())
}

