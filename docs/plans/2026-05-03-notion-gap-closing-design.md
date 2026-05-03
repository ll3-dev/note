# Notion 대비 간극 클로징 설계

## 목적

현재 에디터는 블록 편집, 인라인 서식, paste, 멀티 선택 등 핵심 기능이 구현되어 있다. Notion과 비교해 체감 품질을 한 단계 올리기 위해 세 가지 기능을 추가한다.

## 구현 대상

1. 콜아웃 블록
2. @ / [[ 인라인 페이지 링크
3. 페이지 내 검색 (Cmd+F / Cmd+H)

---

## 1. 콜아웃 블록

### 데이터 모델

```
type: "callout"
text: "내용"
props: { icon: "💡", inlineMarks?: [...] }
```

### 변경 파일

- `contracts.ts` — `"callout"` 을 BlockType 에 추가
- `blockCommands.ts` — `/callout` 명령 등록, `>!` 마크다운 단축키, `callout` alias
- `blockStyles.ts` — 콜아웃 셸 스타일 (배경색, 둥근 모서리, 아이콘-텍스트 가로 배치)
- `blockEditingBehavior.ts` — callout 을 CONTINUING_BLOCK_TYPES 에 추가하지 않음. Enter 시 paragraph 생성
- `BlockBody.tsx` — 콜아웃 렌더링 분기: 아이콘(기본 💡) + EditableTextBlock

### UX 동작

- `/callout` 또는 `>!` 로 생성
- 아이콘은 1차에서 기본 고정 (💡), 이모지 피커는 후속 작업
- Enter 시 새 callout 이 아닌 일반 paragraph 생성
- 빈 callout 에서 Backspace 시 paragraph 로 다운그레이드
- inlineMarks 지원으로 콜아웃 내 텍스트도 bold/italic/code 가능

---

## 2. @ / [[ 인라인 페이지 링크

### 데이터 모델

기존 inlineMarks 에 pageLink 타입을 추가한다.

```
inlineMarks: [{ type: "pageLink", start: 5, end: 12, pageId: "abc123" }]
```

### 변경 파일

- `inlineFormatting.ts` — `InlineMarkType` 에 `"pageLink"` 추가, `pageId` 필드
- `isInlineMark()` — pageLink 검증 로직 추가
- `InlineMarksViewer.tsx` — pageLink 렌더링: 페이지 제목 표시 + 클릭 시 이동
- 새 컴포넌트 `InlinePageLinkMenu.tsx` — `@` / `[[` 입력 시 페이지 검색 팝업
- 새 훅 `useInlinePageSearch.ts` — `@` / `[[` 트리거 감지, 검색 상태 관리
- `blockEditorCommands.ts` 또는 EditableTextBlock — 키 입력 감지 훅 연결

### UX 동작

- `@` 또는 `[[` 입력 시 커서 위치에 검색 팝업 표시
- 타이핑으로 현재 워크스페이스 페이지를 필터링
- 선택 시 입력한 트리거(`@` 또는 `[[...]]`)를 pageLink mark 로 교체
- 렌더링 시 페이지 제목에 primary 색상 밑줄
- 클릭 시 해당 페이지로 이동
- `[[` 입력 시 닫는 `]]` 를 자동으로 임시 생성하고 검색 시작

### 구현 전략

- `@` / `[[` 감지는 contentEditable 의 `onInput` 이벤트에서 커서 앞 텍스트를 확인
- 검색은 기존 페이지 목록 RPC 재사용
- pageLink mark 는 기존 inlineFormatting 파이프라인을 그대로 탐
- InlinePageLinkMenu 는 InlineFormattingToolbar 와 유사한 팝업 패턴 사용

---

## 3. 페이지 내 검색 (Cmd+F / Cmd+H)

### 데이터 모델

검색 상태는 page feature 내부 상태로 관리한다. 저장소와 무관한 임시 상태다.

```
type SearchState = {
  query: string
  replaceQuery: string
  matches: { blockId: string; offset: number; length: number }[]
  activeIndex: number
  showReplace: boolean
}
```

### 새 파일

- `SearchBar.tsx` — 검색 바 컴포넌트 (찾기 + 바꾸기 토글)
- `usePageSearch.ts` — 검색 상태 관리 훅, 블록 텍스트 스캔
- `SearchHighlight` — 기존 InlineMarksViewer 와 별개 레이어로 매칭 하이라이트 렌더링

### UX 동작

- `Cmd+F` → 에디터 상단에 검색 바 표시
- 입력 즉시 현재 페이지 모든 블록 텍스트에서 대소문자 구분 없이 검색
- 매칭 개수 표시 (예: "3/12")
- `Enter` / `Shift+Enter` 로 다음/이전 매칭으로 스크롤 + 포커스
- `Cmd+H` 또는 버튼으로 Replace 모드 토글
- Replace / Replace All 실행 시 개별 블록 text 업데이트
- `Escape` 로 검색 바 닫기, 하이라이트 제거

### 구현 전략

- 하이라이트는 block props 의 `searchHighlights` 임시 prop 으로 각 블록에 주입
- InlineMarksViewer 와 별도 레이어로 렌더링하여 기존 서식 보존
- 검색은 page store 의 블록 목록을 순회하며 `String.indexOf()` 수행
- Replace 는 draft update 경로를 재사용
- 검색 바는 page editor 상단에 absolute/relative 포지셔닝

---

## 개발 순서

1. 콜아웃 블록 — 기존 패턴 재사용으로 가장 빠르게 완료 가능
2. @ / [[ 인라인 페이지 링크 — inlineFormatting 확장, 새 컴포넌트 필요
3. 페이지 내 검색 — 완전히 새로운 UI 컴포넌트, 상태 관리 필요

## 검증

- `bun test`
- `bun run typecheck`
- `bun run build:mainview`
- 수동 확인: 콜아웃 생성/편집, @/[[ 링크 생성/클릭, 검색/바꾸기 동작
