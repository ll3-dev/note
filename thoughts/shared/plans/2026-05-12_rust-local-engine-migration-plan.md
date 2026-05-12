# Rust Local Engine 마이그레이션 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 Electrobun/Bun 저장소를 한 번에 갈아엎지 않고, Rust Local Engine으로 endpoint 단위 이전을 시작한다.

**Architecture:** React UI와 `NoteRPC` app-facing 계약은 유지한다. Bun shell은 Electrobun lifecycle과 OS 이벤트를 담당하고, Rust Engine client를 통해 localhost engine으로 요청을 위임한다. SQLite ownership은 최종적으로 Rust Engine으로 이동하지만, 마이그레이션 중에는 endpoint별 owner를 명시한다.

**Tech Stack:** Rust workspace, `axum` 계열 local HTTP server, `rusqlite`, Bun, Electrobun, React Query, TypeScript.

## 2026-05-12 진행 현황

Desktop runtime 기준 Phase 1-3은 구현 완료 상태다.

- 완료: Rust workspace, `note-core`, `note-engine` sidecar.
- 완료: SQLite current schema bootstrap과 Bun app packaged sidecar copy.
- 완료: Bun shell의 `NoteRPC` 데이터 요청을 Rust Engine client로 위임.
- 완료: page read/write/archive/restore/purge.
- 완료: block create/update/delete/move/batch.
- 완료: workspace search, page search, backlinks.
- 완료: page history undo/redo.
- 완료: engine HTTP smoke test.
- 완료: engine 오류 응답을 `{ error: { code, message } }` 형태로 구조화.
- 완료: engine HTTP client를 `src/shared`로 이동해 desktop/mobile shell에서 재사용 가능한 경계로 정리.
- 완료: Bun legacy SQLite 저장소 제거.
- 완료: Bun SQLite Automerge storage adapter 제거.
- 완료: `drizzle-orm`, `@automerge/automerge-repo` 의존성 제거.

Bun shell은 이제 app lifecycle, OS 이벤트, engine lifecycle, RPC validation만 담당한다. Engine HTTP client는 host-agnostic shared module이며, SQLite 파일은 Rust Engine만 직접 연다.

검증 기준:

- `bun run check`
- Rust core unit tests
- Rust engine HTTP smoke tests
- Bun UI/domain tests

---

## 파일 구조

- Create: `Cargo.toml`
  - Rust workspace root.
- Create: `crates/note-core/Cargo.toml`
  - core/storage crate manifest.
- Create: `crates/note-core/src/lib.rs`
  - core module export.
- Create: `crates/note-core/src/database.rs`
  - SQLite open, PRAGMA, migration bootstrap, status query.
- Create: `crates/note-engine/Cargo.toml`
  - localhost engine binary manifest.
- Create: `crates/note-engine/src/main.rs`
  - CLI entrypoint and HTTP server bootstrap.
- Create: `crates/note-engine/src/api.rs`
  - health/info/database status handlers.
- Create: `src/bun/engine/engineProcess.ts`
  - sidecar spawn, health wait, shutdown.
- Create: `src/shared/engineClient.ts`
  - token-aware, host-agnostic HTTP client.
- Modify: `src/bun/index.ts`
  - engine lifecycle bootstrap and `getDatabaseStatus` delegation.
- Modify: `package.json`
  - scripts for engine build/test if needed.
- Test: Rust unit tests under `crates/note-core`.
- Test: Bun tests for engine process/client if they can run without launching Electrobun.

## Task 1. Rust workspace와 DB status skeleton

- [ ] Root `Cargo.toml`을 만든다.

```toml
[workspace]
members = [
  "crates/note-core",
  "crates/note-engine"
]
resolver = "2"
```

- [ ] `crates/note-core/Cargo.toml`을 만든다.

```toml
[package]
name = "note-core"
version = "0.1.0"
edition = "2021"

[dependencies]
rusqlite = { version = "0.32", features = ["bundled"] }
serde = { version = "1", features = ["derive"] }
```

- [ ] `crates/note-core/src/lib.rs`를 만든다.

```rust
pub mod database;
```

- [ ] `crates/note-core/src/database.rs`를 만든다.

```rust
use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{Connection, Result};
use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct DatabaseStatus {
    pub sqlite_version: String,
    pub pages_count: i64,
    pub blocks_count: i64,
    pub database_path: PathBuf,
}

pub fn open_database(user_data_path: impl AsRef<Path>) -> Result<Connection> {
    fs::create_dir_all(user_data_path.as_ref())
        .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))?;

    let database_path = user_data_path.as_ref().join("note.sqlite3");
    let connection = Connection::open(database_path)?;
    connection.pragma_update(None, "foreign_keys", "ON")?;
    connection.pragma_update(None, "journal_mode", "WAL")?;
    connection.pragma_update(None, "busy_timeout", 5000)?;
    run_migrations(&connection)?;
    Ok(connection)
}

pub fn get_database_status(
    connection: &Connection,
    database_path: impl AsRef<Path>,
) -> Result<DatabaseStatus> {
    let sqlite_version: String =
        connection.query_row("SELECT sqlite_version()", [], |row| row.get(0))?;
    let pages_count = count_table_if_exists(connection, "pages")?;
    let blocks_count = count_table_if_exists(connection, "blocks")?;

    Ok(DatabaseStatus {
        sqlite_version,
        pages_count,
        blocks_count,
        database_path: database_path.as_ref().to_path_buf(),
    })
}

fn run_migrations(connection: &Connection) -> Result<()> {
    connection.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS pages (
          id TEXT PRIMARY KEY,
          parent_page_id TEXT,
          title TEXT NOT NULL DEFAULT '',
          sort_key TEXT NOT NULL DEFAULT '00000000',
          icon TEXT,
          cover TEXT,
          archived_at TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS blocks (
          id TEXT PRIMARY KEY,
          page_id TEXT NOT NULL,
          parent_block_id TEXT,
          type TEXT NOT NULL,
          sort_key TEXT NOT NULL,
          text TEXT NOT NULL DEFAULT '',
          props_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )?;
    Ok(())
}

fn count_table_if_exists(connection: &Connection, table_name: &str) -> Result<i64> {
    let exists: i64 = connection.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
        [table_name],
        |row| row.get(0),
    )?;

    if exists == 0 {
        return Ok(0);
    }

    let query = format!("SELECT COUNT(*) FROM {table_name}");
    connection.query_row(&query, [], |row| row.get(0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn opens_database_and_reports_status() {
        let temp_dir = tempfile::tempdir().expect("create temp dir");
        let database_path = temp_dir.path().join("note.sqlite3");
        let connection = open_database(temp_dir.path()).expect("open database");

        let status = get_database_status(&connection, &database_path).expect("status");

        assert!(!status.sqlite_version.is_empty());
        assert_eq!(status.pages_count, 0);
        assert_eq!(status.blocks_count, 0);
        assert_eq!(status.database_path, database_path);
    }
}
```

- [ ] 위 테스트가 `tempfile`을 쓰므로 `crates/note-core/Cargo.toml`에 dev dependency를 추가한다.

```toml
[dev-dependencies]
tempfile = "3"
```

- [ ] 실행한다.

```bash
cargo test -p note-core
```

Expected: `opens_database_and_reports_status` 통과.

## Task 2. Local engine HTTP skeleton

- [ ] `crates/note-engine/Cargo.toml`을 만든다.

```toml
[package]
name = "note-engine"
version = "0.1.0"
edition = "2021"

[dependencies]
anyhow = "1"
axum = "0.7"
note-core = { path = "../note-core" }
rusqlite = { version = "0.32", features = ["bundled"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["macros", "net", "rt-multi-thread", "signal", "sync"] }
uuid = { version = "1", features = ["v4"] }
```

- [ ] `crates/note-engine/src/api.rs`를 만든다.

```rust
use std::path::PathBuf;
use std::sync::Arc;

use axum::extract::Request;
use axum::extract::State;
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
```

- [ ] `crates/note-engine/src/main.rs`를 만든다.

```rust
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
        .route_layer(middleware::from_fn_with_state(state.clone(), api::require_token));
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
```

- [ ] 실행한다.

```bash
cargo test -p note-core && cargo check -p note-engine
```

Expected: tests pass and engine compiles.

## Task 3. Bun shell sidecar lifecycle

- [ ] `src/bun/engine/engineProcess.ts`를 만든다.

```ts
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import path from "node:path";

export type EngineProcess = {
  baseUrl: string;
  token: string;
  stop: () => void;
};

export async function startEngineProcess(userDataPath: string): Promise<EngineProcess> {
  const binaryPath = path.resolve("target/debug/note-engine");
  const child = spawn(binaryPath, [userDataPath], {
    stdio: ["ignore", "pipe", "pipe"]
  });

  const { baseUrl, token } = await waitForEngineListening(child);

  return {
    baseUrl,
    token,
    stop: () => child.kill()
  };
}

async function waitForEngineListening(
  child: ChildProcessWithoutNullStreams
): Promise<{ baseUrl: string; token: string }> {
  if (!child.stdout) {
    throw new Error("engine stdout is unavailable");
  }

  let buffer = "";
  child.stdout.setEncoding("utf8");

  for await (const chunk of child.stdout) {
    buffer += chunk;
    const match = buffer.match(/NOTE_ENGINE_LISTENING (http:\/\/127\.0\.0\.1:\d+) ([a-f0-9-]+)/);
    if (match) {
      return { baseUrl: match[1], token: match[2] };
    }
  }

  const [code] = await once(child, "exit");
  throw new Error(`engine exited before listening: ${String(code)}`);
}
```

- [ ] `src/bun/engine/engineClient.ts`를 만든다.

```ts
import type { DatabaseStatus } from "@/shared/contracts";

export type EngineClient = {
  getDatabaseStatus: () => Promise<DatabaseStatus>;
};

export function createEngineClient(baseUrl: string, token: string): EngineClient {
  return {
    async getDatabaseStatus() {
      const response = await fetch(`${baseUrl}/database/status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`engine database status failed: ${response.status}`);
      }

      const status = (await response.json()) as {
        sqlite_version: string;
        pages_count: number;
        blocks_count: number;
      };

      return {
        sqliteVersion: status.sqlite_version,
        pagesCount: status.pages_count,
        blocksCount: status.blocks_count
      };
    }
  };
}
```

- [ ] `src/bun/index.ts`의 bootstrap을 async로 감싸고 `getDatabaseStatus`만 Rust로 위임한다.

Expected shape:

```ts
async function main() {
  const databaseHandle = openDatabase(Utils.paths.userData);
  const engineProcess = await startEngineProcess(Utils.paths.userData);
  const engineClient = createEngineClient(
    engineProcess.baseUrl,
    engineProcess.token
  );

  const rpc = BrowserView.defineRPC<NoteRPC>({
    maxRequestTime: 5000,
    handlers: {
      requests: {
        getDatabaseStatus: () => engineClient.getDatabaseStatus(),
        // other handlers stay on existing Bun repositories
      },
      messages: {}
    }
  });

  // existing window/menu/event wiring stays inside main()
}

void main();
```

- [ ] Electrobun close/quit path에서 `engineProcess.stop()`을 호출한다.

- [ ] 실행한다.

```bash
cargo build -p note-engine
bun run typecheck
```

Expected: Rust binary builds and TypeScript compiles.

## Task 4. Verification

- [ ] Rust checks.

```bash
cargo test
cargo check
```

Expected: all Rust tests/checks pass.

- [ ] App checks.

```bash
bun run check
```

Expected: typecheck, tests, build pass.

- [ ] React 변경이 있으면 React Doctor를 실행한다.

```bash
npx -y react-doctor@latest . --verbose --diff
```

Expected: new React findings are addressed or explicitly documented.

## 이후 이전 순서

1. `database.status`
2. `page.list`, `page.listArchived`
3. `page.getDocument`
4. `workspace.search`, `workspace.backlinks`
5. page write APIs
6. block write APIs
7. history undo/redo
8. asset/file APIs
9. mobile foreground engine PoC

각 단계는 Rust parity test를 먼저 만들고, Bun RPC handler를 하나씩 Rust client로 위임한다.
