mod api;

use std::net::SocketAddr;
use std::path::PathBuf;

use axum::middleware;
use axum::routing::{get, patch, post};
use axum::Router;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let user_data_path = std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(".note-engine"));

    let state = api::create_state(user_data_path)?;
    let token = state.session_token.clone();
    let app = build_app(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
    let address: SocketAddr = listener.local_addr()?;
    println!("NOTE_ENGINE_LISTENING http://{address} {token}");

    axum::serve(listener, app).await?;
    Ok(())
}

fn build_app(state: api::EngineState) -> Router {
    let protected_routes = Router::new()
        .route("/engine/info", get(api::engine_info))
        .route("/database/status", get(api::database_status))
        .route("/pages", get(api::pages))
        .route("/pages", post(api::create_page_handler))
        .route("/pages/archived", get(api::archived_pages))
        .route(
            "/pages/purge-expired-archived",
            post(api::purge_expired_archived_pages_handler),
        )
        .route("/pages/archive", post(api::delete_page_handler))
        .route("/pages/move", post(api::move_page_handler))
        .route("/pages/restore", post(api::restore_page_handler))
        .route("/pages/update", patch(api::update_page_handler))
        .route("/pages/:page_id/document", get(api::page_document))
        .route("/pages/:page_id/backlinks", get(api::backlinks))
        .route("/history/redo", post(api::redo_page_history_handler))
        .route("/history/undo", post(api::undo_page_history_handler))
        .route("/blocks", post(api::create_block_handler))
        .route("/blocks/batch", post(api::create_blocks_handler))
        .route("/blocks/delete", post(api::delete_block_handler))
        .route("/blocks/delete-batch", post(api::delete_blocks_handler))
        .route("/blocks/move", post(api::move_block_handler))
        .route("/blocks/move-batch", post(api::move_blocks_handler))
        .route("/blocks/update", patch(api::update_block_handler))
        .route("/search/pages", get(api::page_search))
        .route("/search/workspace", get(api::workspace_search))
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            api::require_token,
        ));

    Router::new()
        .route("/health", get(api::health))
        .merge(protected_routes)
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use axum::body::{to_bytes, Body};
    use axum::http::{Method, Request, StatusCode};
    use serde::de::DeserializeOwned;
    use serde_json::{json, Value};
    use tempfile::{tempdir, TempDir};
    use tower::ServiceExt;

    use super::*;

    struct TestEngine {
        app: Router,
        _temp_dir: TempDir,
        token: String,
    }

    impl TestEngine {
        fn new() -> Self {
            let temp_dir = tempdir().expect("create temp dir");
            let state = api::create_state(temp_dir.path().to_path_buf()).expect("create state");
            let token = state.session_token.clone();
            let app = build_app(state);

            Self {
                app,
                _temp_dir: temp_dir,
                token,
            }
        }

        async fn request<T: DeserializeOwned>(
            &self,
            method: Method,
            path: &str,
            body: Option<Value>,
        ) -> (StatusCode, T) {
            let request = request_builder(method, path, Some(&self.token), body);
            let response = self.app.clone().oneshot(request).await.expect("response");
            let status = response.status();
            let bytes = to_bytes(response.into_body(), usize::MAX)
                .await
                .expect("read body");
            let value = serde_json::from_slice::<T>(&bytes).expect("decode json");

            (status, value)
        }
    }

    #[tokio::test]
    async fn protects_engine_routes_with_session_token() {
        let engine = TestEngine::new();
        let response = engine
            .app
            .clone()
            .oneshot(request_builder(Method::GET, "/pages", None, None))
            .await
            .expect("response");

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        let (status, body): (StatusCode, Value) =
            engine.request(Method::GET, "/health", None).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body, json!({ "ok": true }));
    }

    #[tokio::test]
    async fn handles_page_block_search_archive_and_history_flow() {
        let engine = TestEngine::new();
        let (status, document): (StatusCode, Value) = engine
            .request(
                Method::POST,
                "/pages",
                Some(json!({ "title": "Daily", "parentPageId": null })),
            )
            .await;
        assert_eq!(status, StatusCode::OK);

        let page_id = document["page"]["id"].as_str().expect("page id");
        let first_block_id = document["blocks"][0]["id"].as_str().expect("block id");
        let (status, block): (StatusCode, Value) = engine
            .request(
                Method::PATCH,
                "/blocks/update",
                Some(json!({
                    "blockId": first_block_id,
                    "text": "Ship Rust engine"
                })),
            )
            .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(block["text"], "Ship Rust engine");

        let (status, results): (StatusCode, Value) = engine
            .request(Method::GET, "/search/workspace?query=Rust", None)
            .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(results.as_array().expect("search results").len(), 1);

        let (status, undo): (StatusCode, Value) = engine
            .request(
                Method::POST,
                "/history/undo",
                Some(json!({ "pageId": page_id })),
            )
            .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(undo["blocks"][0]["text"], "");

        let (status, redo): (StatusCode, Value) = engine
            .request(
                Method::POST,
                "/history/redo",
                Some(json!({ "pageId": page_id })),
            )
            .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(redo["blocks"][0]["text"], "Ship Rust engine");

        let (status, archive): (StatusCode, Value) = engine
            .request(
                Method::POST,
                "/pages/archive",
                Some(json!({ "pageId": page_id })),
            )
            .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(archive, json!({ "deleted": true }));

        let (status, active_pages): (StatusCode, Value) =
            engine.request(Method::GET, "/pages", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(active_pages.as_array().expect("active pages").len(), 0);

        let (status, restore): (StatusCode, Value) = engine
            .request(
                Method::POST,
                "/pages/restore",
                Some(json!({ "pageId": page_id })),
            )
            .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(restore, json!({ "restored": true }));

        let (status, active_pages): (StatusCode, Value) =
            engine.request(Method::GET, "/pages", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(active_pages.as_array().expect("active pages").len(), 1);
    }

    fn request_builder(
        method: Method,
        path: &str,
        token: Option<&str>,
        body: Option<Value>,
    ) -> Request<Body> {
        let mut builder = Request::builder().method(method).uri(path);

        if let Some(token) = token {
            builder = builder.header("authorization", format!("Bearer {token}"));
        }

        match body {
            Some(body) => builder
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .expect("request"),
            None => builder.body(Body::empty()).expect("request"),
        }
    }
}
