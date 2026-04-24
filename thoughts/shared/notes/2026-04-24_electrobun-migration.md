# Electrobun 전환 메모

## 결정

Tauri/Rust 기반 구조를 제거하고 Electrobun + Bun + React 기반으로 전환한다.

## 이유

- 주 개발 언어를 TypeScript에 가깝게 유지한다.
- `async` / `await` 흐름을 renderer와 main 양쪽에서 비슷하게 쓴다.
- SQLite 접근은 Bun process에서만 수행하고, 화면은 typed RPC로만 요청한다.
- Rust 학습 비용보다 block note 저장소 모델과 editor 기능 구현에 집중한다.

## 현재 경계

- `src/bun`: Electrobun main process, SQLite schema, note 저장소
- `src/mainview`: React 기반 renderer UI
- `src/shared`: main process와 renderer가 공유하는 타입과 RPC contract

## 다음 후보

1. `insertBlock` 구현
2. `getPageTree` 구현
3. Markdown import/export를 block tree와 연결
4. Automerge 같은 CRDT 적용을 고려한 operation log 정리
