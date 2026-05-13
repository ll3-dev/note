# Rustra Integration Design

## Goal

Replace the HTTP bridge (note-engine Axum server) with rustra's `#[command]` + `@rustra/bun` adapter, eliminating HTTP, port binding, session tokens, Axum, and tokio from the communication path.

## Architecture

### Before

```
webview → RPC → Bun → HTTP fetch → Axum → note-core → SQLite
```

### After

```
webview → RPC → Bun → rustra EngineClient.invoke() → FFI → note-core → SQLite
```

## Crate Structure

```
crates/
  note-core/     — existing logic, add JsonSchema derives to input/output types
  note-bridge/   — NEW: #[command] definitions + main (rustra Package build + TS generation)
```

- `note-engine` is deleted, replaced by `note-bridge`
- `note-core` gains `schemars` dependency; existing Input/Output types get `JsonSchema` derive

## Commands (24 → 23)

`health` removed (no HTTP needed). Remaining 23 handlers map 1:1 to rustra commands:

| Handler | Command Name |
|---|---|
| `engine_info` | `engineInfo` |
| `database_status` | `databaseStatus` |
| `pages` | `listPages` |
| `archived_pages` | `listArchivedPages` |
| `page_document` | `getPageDocument` |
| `create_page_handler` | `createPage` |
| `update_page_handler` | `updatePage` |
| `move_page_handler` | `movePage` |
| `delete_page_handler` | `deletePage` |
| `restore_page_handler` | `restorePage` |
| `purge_expired_archived_pages` | `purgeExpiredArchivedPages` |
| `undo_page_history_handler` | `undoPageHistory` |
| `redo_page_history_handler` | `redoPageHistory` |
| `create_block_handler` | `createBlock` |
| `create_blocks_handler` | `createBlocks` |
| `update_block_handler` | `updateBlock` |
| `delete_block_handler` | `deleteBlock` |
| `delete_blocks_handler` | `deleteBlocks` |
| `move_block_handler` | `moveBlock` |
| `move_blocks_handler` | `moveBlocks` |
| `page_search` | `searchPages` |
| `workspace_search` | `searchWorkspace` |
| `backlinks` | `listBacklinks` |

GET query string endpoints (`searchPages`, `searchWorkspace`) become input structs. All calls unify to `invoke(command, input)`.

## TypeScript Changes

| File | Change |
|---|---|
| `src/shared/engineClient.ts` | **DELETE** — replaced by rustra generated code |
| `src/shared/contracts.ts` | Keep `NoteRPC` only; types imported from generated code |
| `src/shared/rpcValidation.ts` | Keep — RPC boundary validation unchanged |
| `src/bun/engine/engineProcess.ts` | **REWRITE** — process spawn → rustra engine init |
| `src/bun/index.ts` | **MODIFY** — HTTP client → rustra EngineClient |
| `generated/` | **NEW** — rustra CLI output (types.ts, commands.ts, schema.json) |

### NoteRPC

Manual type definitions removed from `contracts.ts`. Generated types imported:

```ts
import type { Page, Block, PageDocument, ... } from "../generated/types";
```

`NoteRPC` RPC schema definition remains in `contracts.ts`.

## Error Handling

| Current (HTTP) | New (rustra) |
|---|---|
| `404 NOT_FOUND` + `"notFound"` | `RustraError::custom("notFound", "...")` |
| `400 BAD_REQUEST` + `"invalidRequest"` | `RustraError::custom("invalidRequest", "...")` |
| `401 UNAUTHORIZED` | **REMOVED** — in-process, no auth needed |
| `500 INTERNAL_SERVER_ERROR` | `"databaseError"` or rustra default |

TS: catch `RustraCommandError`, use `error.code` / `error.message`. `EngineRequestError` class removed.

## Testing

| Level | Current | New |
|---|---|---|
| Rust integration | Axum `oneshot` tests in `note-engine` | rustra `invoke_json` tests in `note-bridge` |
| TS types | Manual `contracts.ts` | Generated code (auto-validated) |
| E2E | Playwright (RPC → HTTP → Rust) | Playwright (RPC → rustra → Rust) — unchanged |

## Key Decisions

- **Separate thread**: Rust runs on a worker thread, maintaining async pattern
- **RPC layer preserved**: Electrobun RPC stays; only the transport under Bun changes
- **note-engine deleted**: Merged into `note-bridge` with rustra commands
- **Auth removed**: No session tokens needed for in-process calls
