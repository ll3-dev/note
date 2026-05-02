# Note

로컬에서 동작하는 Notion입니다. 모든 데이터는 기기에 저장되고, 서버 없이도 동작합니다.

모바일과의 연동을 목표로 하고 있습니다. 데스크톱에서 작성한 문서를 모바일에서도 자연스럽게 이어서 볼 수 있어야 하고, 반대 방향도 마찬가지입니다. 로컬 저장이라는 이점을 유지하면서 기기 간 경험을 이어가는 것이 이 프로젝트의 방향입니다.

## 기능

- 블록 기반 문서 편집 — 문단, 제목, 리스트, 코드, 인용, 토글, 구분선, 이미지, 페이지 링크
- `/` 슬래시 명령으로 블록 타입 전환
- 마크다운 단축 입력 — `# `, `- `, `1. `, `[] `, `> `, triple backtick
- 블록 드래그 앤 드롭
- 인라인 포맷팅 툴바
- 페이지 계층 구조와 사이드바 트리 탐색
- 탭 기반 멀티 페이지 편집
- 퀵 스위처로 빠른 페이지 이동
- 페이지 보관과 복구
- 백링크 감지
- 전체 검색 (페이지 제목 + 블록 본문)
- 실행 취소 / 다시 실행
- 라이트 / 다크 테마

## 기술 스택

| 역할 | 기술 |
|------|------|
| 런타임 | [Bun](https://bun.sh) |
| 데스크톱 프레임워크 | [Electrobun](https://electrobun.dev) |
| UI | React 19, TypeScript |
| 빌드 | Vite |
| 스타일 | Tailwind CSS 4 |
| 데이터베이스 | SQLite (drizzle-orm) |
| 상태 관리 | TanStack React Query, Zustand |
| 라우팅 | TanStack Router |
| 동기화 | Automerge (CRDT) |
| 컴포넌트 | Radix UI, shadcn |
| 테스트 | Bun test, Playwright |

## 구조

```
src/
├── bun/                  # Electrobun 메인 프로세스
│   ├── repositories/     # 데이터 접근 계층 (pages, blocks, ordering, search)
│   ├── sync/             # Automerge 동기화
│   ├── database.ts       # SQLite 설정
│   └── schema.ts         # 데이터베이스 스키마
├── mainview/             # React 웹뷰 UI
│   ├── features/
│   │   ├── workspace/    # 사이드바, 탭, 레이아웃
│   │   └── page/         # 블록 에디터, 슬래시 명령, 드래그 앤 드롭
│   ├── components/ui/    # 공유 UI 컴포넌트 (shadcn)
│   ├── store/            # Zustand 스토어
│   └── app/              # 라우터, 프로바이더
├── shared/               # 메인 프로세스와 웹뷰 공유 타입/RPC 계약
tests/
└── e2e/                  # Playwright E2E 테스트
```

## 시작하기

```bash
bun install
bun run dev
```

## 검증

```bash
bun run check
```

개별 확인:

```bash
bun run typecheck    # 타입 검사
bun test             # 단위 테스트
bun run build        # 빌드
bun run test:e2e     # E2E 테스트
```

## 에디터 수동 테스트

앱을 실행하고 새 페이지를 만든 뒤 아래 흐름을 확인합니다.

- `/` 입력 시 블록 명령 메뉴 열림
- `# `, `## `, `- `, `1. `, `[] `, `> `, triple backtick 입력 시 블록 타입 전환
- Enter 입력 시 새 블록 생성 및 포커스 이동
- 빈 블록에서 Backspace 입력 시 이전 블록으로 포커스 이동 및 현재 블록 삭제
- To-do 체크 상태가 페이지 전환 후에도 유지
