mod api;

use std::net::SocketAddr;
use std::path::PathBuf;

use axum::middleware;
use axum::routing::get;
use axum::Router;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let user_data_path = std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(".note-engine"));

    let state = api::create_state(user_data_path)?;
    let token = state.session_token.clone();
    let protected_routes = Router::new()
        .route("/engine/info", get(api::engine_info))
        .route("/database/status", get(api::database_status))
        .route("/pages", get(api::pages))
        .route("/pages/archived", get(api::archived_pages))
        .route("/pages/:page_id/document", get(api::page_document))
        .route("/pages/:page_id/backlinks", get(api::backlinks))
        .route("/search/pages", get(api::page_search))
        .route("/search/workspace", get(api::workspace_search))
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            api::require_token,
        ));
    let app = Router::new()
        .route("/health", get(api::health))
        .merge(protected_routes)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
    let address: SocketAddr = listener.local_addr()?;
    println!("NOTE_ENGINE_LISTENING http://{address} {token}");

    axum::serve(listener, app).await?;
    Ok(())
}
