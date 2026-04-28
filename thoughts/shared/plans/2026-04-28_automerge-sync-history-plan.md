# Automerge 기반 문서 동기화와 history merge 계획

## 결정

문서의 뒤로가기/앞으로가기는 브라우저 `contentEditable` undo 스택이나 블록별 React state로 해결하지 않는다. 앞으로 모바일 앱과 같은 로컬 네트워크 피어가 붙을 수 있으므로, page 단위 문서를 Automerge CRDT 문서로 두고 local-first 변경 로그 위에서 history 정책을 설계한다.

## 1. 현재 block schema 매핑

- Automerge 문서 단위는 `PageDocument` 하나를 기본값으로 둔다.
- 문서 구조는 `schemaVersion`, `page`, `blocks[]`로 시작한다.
- `blocks[]`는 현재 SQLite `blocks` row와 같은 `id`, `pageId`, `parentBlockId`, `type`, `sortKey`, `text`, `props`, timestamp 필드를 유지한다.
- 초기 단계에서는 block text를 일반 문자열로 둔다. rich text range, mark, inline annotation은 별도 schema version에서 올린다.
- 변경 함수는 배열 전체 교체를 피하고, block field 변경이나 `splice` 기반 insert처럼 Automerge가 병합 가능한 최소 변경으로 기록한다.

## 2. mDNS와 update transport 경계

- mDNS는 구현하지 않는다. 역할은 피어 발견까지만이다.
- mDNS가 발견한 `{ host, port, peerId }`는 나중에 Automerge Repo `NetworkAdapter`를 여는 입력으로 쓴다.
- 실제 Automerge 메시지 교환은 WebSocket/TCP/WebRTC 중 하나의 transport adapter에서 담당한다.
- 현재 적용 범위는 `@automerge/automerge-repo`가 요구하는 storage/network 경계를 repo에 들여오는 것이다.

## 3. origin 구분

history capture는 origin으로 나눈다.

- `local`: 현재 디바이스 사용자가 직접 만든 편집. undo 대상이다.
- `remote`: 다른 디바이스에서 들어온 변경. undo 대상이 아니다.
- `sync`: 초기 load, backfill, compaction, peer catch-up. undo 대상이 아니다.
- `system`: migration, repair, import. 기본적으로 undo 대상이 아니다.

현재 코드에는 `shouldCaptureAutomergeHistory(origin)` 정책 함수를 추가했다. 아직 UI undo에는 연결하지 않는다.

## 4. history capture/merge 정책

- local text input은 일정 시간 안의 연속 입력을 하나의 history item으로 묶는다.
- block create/delete/move/type 변경은 기본적으로 별도 history item이다.
- slash command가 text shortcut과 block type 변경을 같이 만든 경우 하나의 transaction으로 묶는다.
- remote 변경이 들어와도 local undo stack은 사라지지 않아야 한다. undo는 “이 사용자의 이전 local change를 반전하는 새 Automerge change”로 적용한다.
- 같은 block에 local/remote 변경이 동시에 있으면 Automerge merge 결과를 먼저 확정한 뒤, undo 반전 change를 다시 적용한다.

## 5. Yjs vs Automerge 스파이크 기준

Automerge를 우선 적용한다.

- 현재 앱이 이미 page/block JSON 모델을 갖고 있고, 모바일 local-first 동기화가 중요한 방향이다.
- Automerge Repo는 storage adapter와 network adapter 경계가 명확해서 SQLite 저장소와 나중의 mDNS-discovered transport를 분리하기 좋다.
- editor framework 수준의 selection/rich text binding은 아직 성급하다. 필요해지면 Automerge 문서 위에 ProseMirror/Lexical binding을 붙이는 방향으로 다시 판단한다.

## 이번 적용 범위

- `@automerge/automerge`, `@automerge/automerge-repo` 의존성을 추가한다.
- `src/shared/automerge/pageDocument.ts`에 page document 변환, field 변경, block insert, merge helper, origin capture 정책을 둔다.
- `src/bun/sync/automergeStorageAdapter.ts`에 SQLite-backed Automerge Repo storage adapter를 둔다.
- `automerge_repo_chunks` 테이블을 schema migration v3로 추가한다.
- mDNS는 구현하지 않고, 나중에 NetworkAdapter를 붙일 수 있다는 경계만 이 문서에 고정한다.
