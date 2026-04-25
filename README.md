# Note

Electrobun + Bun + React 기반의 block note 앱 프로토타입입니다.

## 구조

- `src/bun/`: Electrobun main process와 SQLite bootstrap
- `src/bun/repositories/`: pages, blocks, ordering, operation 기록 저장소
- `src/mainview/`: React webview UI
- `src/mainview/features/workspace/components/`: workspace 화면과 block editor 컴포넌트
- `src/mainview/features/workspace/hooks/`: workspace query/mutation/focus 훅
- `src/mainview/features/workspace/lib/`: block command, shortcut, style helper
- `src/mainview/features/workspace/types/`: workspace feature 전용 타입
- `src/shared/`: main process와 webview가 공유하는 타입/RPC contract
- `thoughts/`: 설계와 구현 계획 문서

## 실행

```bash
bun install
bun run dev
```

## 검증

```bash
bun run check
```

개별로 확인할 때는 아래 명령을 사용할 수 있습니다.

```bash
bun run typecheck
bun test
bun run build
```

## 에디터 수동 테스트

```bash
bun run dev
```

앱이 뜨면 새 페이지를 만들고 아래 흐름을 확인합니다.

- `/` 입력 시 블록 명령 메뉴가 열리는지 확인
- `# `, `## `, `- `, `1. `, `[] `, `> `, triple backtick 입력 시 블록 타입이 바뀌는지 확인
- Enter 입력 시 현재 블록 아래에 새 블록이 생기고 포커스가 이동하는지 확인
- 빈 블록에서 Backspace 입력 시 이전 블록으로 포커스가 이동하고 현재 블록이 삭제되는지 확인
- To-do 블록 체크 상태가 페이지 전환 후에도 유지되는지 확인
