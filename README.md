# Note

Electrobun + Bun + React 기반의 block note 앱 프로토타입입니다.

## 구조

- `src/bun/`: Electrobun main process, SQLite, note 저장소
- `src/mainview/`: React webview UI
- `src/shared/`: main process와 webview가 공유하는 타입/RPC contract
- `thoughts/`: 설계와 구현 계획 문서

## 실행

```bash
bun install
bun run dev
```

## 검증

```bash
bun run typecheck
bun run build
```
