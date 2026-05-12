# Rust Local Engine 기반 note 아키텍처

## 결정

`note`는 장기적으로 `JS/TS shell + Rust Local Engine` 구조로 간다.

- `src/mainview`: React 기반 workspace/editor UI를 유지한다.
- `src/bun`: Electrobun 창, 메뉴, OS 이벤트, sidecar lifecycle만 담당한다.
- `crates/note-core`: page/block/storage/search/sync 도메인을 소유한다.
- `crates/note-engine`: localhost JSON-RPC/WebSocket API 서버를 제공한다.
- SQLite는 Rust Engine만 직접 접근한다.

이 구조의 목표는 desktop과 mobile이 같은 core를 공유하되, React Native/Swift/Kotlin별 기능 bridge를 계속 늘리지 않는 것이다. Desktop은 sidecar process로, Mobile은 foreground 동안 실행되는 embedded local server로 같은 API를 호출한다.

## 적용 범위

이 문서는 전체 방향을 고정한다. 실제 구현은 별도 마이그레이션 계획에서 endpoint 단위로 진행한다.

이번 방향에 포함한다.

- Rust localhost engine 도입
- 기존 Electrobun app 유지
- 기존 `NoteRPC` 계약을 engine API로 점진 이전
- file/asset API 경계 설계
- sync, search, workflow, AI adapter가 들어갈 수 있는 core 경계 확보

이번 방향에서 바로 하지 않는다.

- React UI 재작성
- React Native 앱 구현
- 모든 Bun repository 즉시 포팅
- Automerge/CRDT를 Rust로 즉시 이전
- LAN sync, pairing, relay 구현
- mobile background 상주 엔진 기대

## 런타임 경계

```txt
React UI
  -> noteApi
  -> Electrobun Bun shell
  -> Rust Engine client
  -> Rust Local Engine
  -> SQLite / File System / Search / Sync
```

Desktop에서는 Bun shell이 Rust Engine process를 시작하고, `127.0.0.1:<random-port>`와 session token을 받아 RPC handler에서 위임한다. Mobile에서는 tiny native module이 engine lifecycle만 담당하고, RN UI는 같은 TypeScript engine client를 쓴다.

```ts
type EngineInfo = {
  baseUrl: string;
  token: string;
  engineVersion: string;
  apiVersion: string;
  capabilities: string[];
};
```

## API 원칙

Local Engine API는 굵게 설계한다. cursor, selection, scroll, animation, typing draft 같은 editor hot path는 UI 안에 둔다. Rust Engine은 저장, 검색, 동기화, 파일, workflow, AI처럼 transaction과 durable state가 중요한 작업을 맡는다.

`note` 도메인에서는 범용 `document.*`보다 현재 모델과 맞는 이름을 우선한다.

- `engine.info`
- `database.status`
- `page.list`
- `page.listArchived`
- `page.getDocument`
- `page.create`
- `page.update`
- `page.delete`
- `page.restore`
- `block.create`
- `block.createMany`
- `block.update`
- `block.delete`
- `block.deleteMany`
- `block.move`
- `block.moveMany`
- `workspace.search`
- `workspace.backlinks`
- `history.undoPage`
- `history.redoPage`

## File API 원칙

이미지, 첨부, export/import는 JSON-RPC payload에 큰 blob을 직접 싣지 않는다.

- metadata와 transaction 결정은 JSON-RPC로 한다.
- 큰 파일은 engine이 발급한 upload/download token이나 local file handle 경유로 다룬다.
- DB row commit과 file write commit 순서를 Rust Engine이 책임진다.
- asset은 page/block record와 별도 lifecycle을 갖고, orphan cleanup을 engine job으로 둔다.

초기 API 후보:

- `asset.prepareUpload`
- `asset.commitUpload`
- `asset.getDownloadUrl`
- `asset.delete`
- `asset.cleanupOrphans`
- `export.pageMarkdown`
- `import.markdownToPage`

## SQLite 소유권

최종 상태에서 SQLite는 Rust Engine만 연다. UI, Bun shell, RN shell은 DB 파일을 직접 열지 않는다.

단, 마이그레이션 중에는 Bun Drizzle 저장소와 Rust Engine이 동시에 존재할 수 있다. 이 기간에는 endpoint ownership을 명확히 나눈다.

- Rust로 이전된 endpoint는 Rust만 DB에 쓴다.
- Bun에 남은 endpoint는 기존 Drizzle path를 유지한다.
- 같은 write consistency group은 반만 옮기지 않는다.

예를 들어 `getDatabaseStatus`는 단독 이전 가능하다. 반면 `createBlock`, `updateBlock`, `moveBlock`, `undoPageHistory`는 page/block/history consistency가 엮여 있으므로 parity test가 생긴 뒤 묶어서 이전한다.

## Automerge 판단

Automerge 자체는 여전히 좋은 후보지만, 1차 Rust Engine 전환의 목표로 삼지 않는다.

이유:

- 현재 앱의 핵심 리스크는 engine boundary와 SQLite ownership 이전이다.
- Automerge Repo의 실용적인 storage/network adapter 문맥은 현재 JS 쪽 코드와 더 가깝다.
- Rust `automerge` crate는 core document/sync primitive를 제공하지만, note의 page/block repository와 history 정책을 동시에 옮기면 scope가 커진다.

따라서 단기 sync/history는 SQLite op log와 page/block patch 중심으로 둔다. Automerge는 중기 후보로 남긴다.

- 단기: SQLite row + operation log + selective history 유지
- 중기: Rust core 안에서 page 단위 CRDT 문서 실험
- 장기: 실제 multi-device conflict 문제가 커질 때 Automerge/Yjs/직접 op log를 비교

## 보안 원칙

기본 engine은 local-only다.

- 기본 bind는 `127.0.0.1`만 허용한다.
- 매 실행마다 random port를 사용한다.
- 매 실행마다 session token을 발급한다.
- 모든 요청은 `Authorization: Bearer <token>`을 요구한다.
- LAN/Tailscale bind는 사용자 설정과 pairing 이후에만 허용한다.
- pairing 전 sync API는 비활성화한다.

## 단계 축소

큰 로드맵은 유지하되, `note`의 첫 단계는 작게 자른다.

### Phase 0. 설계와 마이그레이션 경계

- 이 문서로 local engine 방향을 고정한다.
- 별도 마이그레이션 계획에서 endpoint 이전 순서를 정한다.

### Phase 1. Desktop Engine Skeleton

- Rust workspace 추가
- `/health`, `engine.info`, `database.status`
- SQLite 파일 open, PRAGMA, migration bootstrap
- Electrobun Bun shell에서 engine start/stop/health check
- 기존 `getDatabaseStatus`만 Rust path로 이전

### Phase 2. Read API 이전

- `page.list`
- `page.listArchived`
- `page.getDocument`
- `workspace.search`
- `workspace.backlinks`

### Phase 3. Page/Block Write API 이전

- page CRUD
- block CRUD/move/batch
- history undo/redo
- search index transaction 연결

### Phase 4. File API

- image block asset metadata
- upload/commit/download/delete
- orphan cleanup

### Phase 5. Mobile Foreground Engine PoC

- RN native module은 lifecycle만 담당한다.
- 같은 TypeScript engine client를 사용한다.

### Phase 6. Sync/Pairing

- QR/manual endpoint
- device allowlist
- sync pull/push
- op log exchange

## 검증 원칙

- Rust 변경 후 `cargo test`를 실행한다.
- React/Bun 변경 후 `bun run check`를 실행한다.
- React 변경이 있으면 `npx -y react-doctor@latest . --verbose --diff`를 실행한다.
- 첫 engine integration은 temp DB smoke test로 `/database/status`와 실제 SQLite 파일 생성을 확인한다.
