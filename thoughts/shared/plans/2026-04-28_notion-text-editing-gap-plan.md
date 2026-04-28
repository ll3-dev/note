# Notion 대비 텍스트 편집 개선 계획

## 목적

현재 에디터는 블록 기반 작성의 뼈대는 갖췄지만, Notion과 비교하면 긴 텍스트를 빠르게 고치고 구조화하는 편집 도구로는 아직 마찰이 크다. 이 문서는 그 마찰을 개발 가능한 작업 단위로 정리한다.

## 현재 구현 기준

- 본문 블록은 `contentEditable="plaintext-only"` 기반이라 블록 안의 일부 텍스트에 서식을 걸기 어렵다.
- `/` 메뉴는 기본 블록 타입 변경 중심이다.
- Enter, Backspace, ArrowUp/ArrowDown, Tab/Shift+Tab, drag/drop reorder, autosave는 기본 흐름이 있다.
- paste는 plain text만 삽입해 안전하지만, 여러 블록이나 rich text 구조를 보존하지 않는다.
- 선택 상태는 단일 블록 중심이며, 여러 블록을 선택해 일괄 조작하는 모델은 없다.

## 핵심 불편점

### 1. 인라인 서식 부재

현재는 블록 전체 타입 변경은 가능하지만 텍스트 일부를 굵게, 기울임, 코드, 링크, 색상으로 바꾸는 흐름이 없다. 실제 글 편집에서는 문장 일부를 선택한 뒤 바로 스타일을 입히는 일이 많아서 가장 먼저 체감되는 차이다.

개발 방향:

- 블록 텍스트를 plain string만으로 유지할지, inline mark 구조를 도입할지 결정한다.
- 최소 1차 범위는 bold, italic, inline code, link로 둔다.
- 선택 영역 기반 floating toolbar 또는 command 실행 경로를 추가한다.
- 기존 plain text block과의 마이그레이션 경로를 유지한다.

완료 조건:

- 텍스트 일부를 선택해 bold, italic, code, link를 적용하고 다시 해제할 수 있다.
- 저장 후 페이지를 다시 열어도 inline mark가 보존된다.
- plain text 블록은 기존 데이터 손실 없이 렌더링된다.

### 2. 슬래시 명령 범위 부족

현재 `/` 메뉴는 Text, Heading, To-do, List, Quote, Code, Divider 정도다. Notion의 사용감은 새 블록 삽입뿐 아니라 현재 블록 변환, 색상, duplicate, page link, callout, media 같은 빠른 작업에서 나온다.

개발 방향:

- 명령을 `insert`, `turnInto`, `format`, `blockAction` 계열로 분리한다.
- 1차 확장은 Toggle, Callout, Page link, Duplicate, Delete, Turn into commands로 둔다.
- 이미 존재하는 command registry와 keybinding 구조를 재사용한다.
- command 검색은 label뿐 아니라 alias도 매칭한다. 예: `/bullet`, `/list`, `/todo`, `/check`.

완료 조건:

- `/turn` 또는 타입 명령으로 현재 블록 타입을 바꿀 수 있다.
- `/duplicate`, `/delete` 같은 블록 액션이 동작한다.
- slash menu의 명령 수가 늘어나도 키보드 탐색과 선택이 안정적으로 유지된다.

### 3. 선택 기반 편집 흐름 부족

현재 편집은 커서가 있는 단일 블록 입력 중심이다. Notion처럼 쓰려면 텍스트 선택, 블록 선택, 여러 블록 선택이 서로 자연스럽게 이어져야 한다.

개발 방향:

- 단일 블록 선택과 텍스트 선택을 명확히 구분한다.
- Shift+Arrow 또는 drag range로 여러 블록을 선택하는 모델을 추가한다.
- 선택된 여러 블록에 delete, duplicate, move, turn into를 적용한다.
- 선택 상태는 page feature 내부 상태로 두고 workspace shell로 새지 않게 한다.

완료 조건:

- 여러 블록을 선택해 한 번에 삭제할 수 있다.
- 여러 블록을 선택해 drag/drop 또는 command로 이동할 수 있다.
- 선택 중에도 일반 텍스트 커서 이동과 충돌하지 않는다.

### 4. 구조 보존 paste 부족

현재 paste는 plain text만 삽입한다. 이는 안전하지만 Notion, Markdown, 웹 문서에서 복사한 내용을 붙여넣을 때 제목, 리스트, 체크박스, 여러 줄 구조가 모두 사라지는 문제가 있다.

개발 방향:

- paste 입력을 plain text, Markdown-like text, HTML 세 단계로 나눠 해석한다.
- 1차는 plain text의 여러 줄을 여러 paragraph block으로 나누고, Markdown shortcut을 각 줄에 적용한다.
- 이후 HTML paste에서 heading, ul, ol, blockquote, code 정도만 보수적으로 매핑한다.
- 알 수 없는 HTML은 plain text로 fallback한다.

완료 조건:

- 여러 줄 텍스트를 붙여넣으면 여러 블록으로 분리된다.
- `# 제목`, `- 항목`, `1. 항목`, `[] 할 일`, `>` 같은 입력이 대응 블록으로 변환된다.
- 지원하지 않는 rich paste는 깨지지 않고 plain text로 들어간다.

### 5. 리스트 편집 세부 동작 부족

리스트 블록은 생성, 번호 표시, 들여쓰기, 빈 블록 탈출의 기본은 있으나 긴 리스트를 고칠 때 필요한 세부 동작이 더 필요하다.

개발 방향:

- 중간 커서에서 Enter를 누르면 현재 블록을 분할한다.
- 리스트 블록의 중간 분할 시 뒤쪽 텍스트를 다음 리스트 블록으로 넘긴다.
- Backspace는 빈 블록 삭제, 타입 다운그레이드, 이전 블록과 병합을 순서대로 처리한다.
- numbered list는 삽입, 삭제, 들여쓰기 변경 후 번호가 자연스럽게 이어지게 한다.

완료 조건:

- 문장 중간에서 Enter를 눌러 블록을 나눌 수 있다.
- 블록 시작에서 Backspace를 누르면 이전 블록과 병합하거나 타입을 자연스럽게 낮춘다.
- numbered list의 표시 번호가 삽입/삭제/들여쓰기 후에도 어색하게 끊기지 않는다.

### 6. 검색, 이동, 링크 연결 부족

텍스트 편집 도구는 입력만큼 이동이 중요하다. Notion의 생산성은 페이지 검색, 내부 검색, 페이지 링크, 멘션이 편집 흐름 안에 들어오는 데서 나온다.

개발 방향:

- 페이지 내부 검색을 먼저 구현한다.
- 페이지 전체 quick switcher는 workspace command로 연결한다.
- `@` 또는 `[[` 기반 page mention/page link 후보 검색을 추가한다.
- page link block과 inline page mention을 구분한다.

완료 조건:

- 현재 페이지 안에서 텍스트를 검색하고 결과로 이동할 수 있다.
- 편집 중 다른 페이지를 검색해 링크할 수 있다.
- page link block은 기존 block model 안에서 저장/렌더링된다.

## 개발 우선순위

1. 구조 보존 paste
2. 리스트 분할/병합 동작
3. 슬래시 명령 확장
4. 멀티 블록 선택과 일괄 작업
5. 인라인 서식 저장 모델
6. 검색, 이동, 링크 연결

이 순서가 좋은 이유는 현재 구조를 크게 흔들지 않고 편집 체감을 빠르게 개선할 수 있기 때문이다. paste와 리스트 동작은 기존 plain text 모델 위에서 개선 가능하고, 인라인 서식은 저장 모델 결정이 필요하므로 뒤로 둔다.

## 1차 개발 범위 제안

첫 구현 단위는 paste와 리스트 편집을 묶는다.

- 여러 줄 paste를 여러 블록으로 변환한다.
- paste된 각 줄에 Markdown shortcut을 적용한다.
- Enter 중간 입력에서 block split을 지원한다.
- Backspace 시작 입력에서 이전 블록 병합을 지원한다.
- 관련 로직은 React 컴포넌트보다 `features/page/lib`와 hook으로 분리한다.

검증:

- `bun test`
- `bun run typecheck`
- `bun run build:mainview`
- 가능하면 실제 앱에서 여러 줄 paste, 리스트 split, block merge를 수동 확인한다.

## 열어둘 결정

- inline mark 저장 형식: `text + marks[]`로 둘지, rich tree 형태로 둘지 결정이 필요하다.
- HTML paste 범위: Notion 호환을 우선할지, Markdown 호환을 우선할지 선택해야 한다.
- 블록 선택 UX: Notion처럼 왼쪽 핸들 중심으로 갈지, 문서 편집기처럼 Shift selection 중심으로 갈지 정해야 한다.

## 2026-04-28 구현 메모

이번 구현은 Notion처럼 보이는 텍스트 편집 흐름을 만들기 위한 1차 작업이다. 중요한 결정은 inline formatting을 Markdown 문자열(`**bold**`, `_italic_`, `` `code` ``)로 저장하지 않고, block의 `props.inlineMarks`에 범위 기반 mark로 저장하는 것이다.

### 반영한 것

- 구조 보존 paste 초안
  - 여러 줄 plain text/Markdown-like paste를 block draft로 변환한다.
  - heading, bullet, numbered list, todo, quote, code fence, divider를 block type으로 매핑한다.
  - Markdown 복사 기능은 settings panel의 "현재 페이지 Markdown 복사" 액션으로 연결한다.

- slash command 정리
  - `/` command plate는 block type 전환 중심으로 유지한다.
  - duplicate, delete, bold, italic, inline code는 `/` plate에서 제외한다.
  - duplicate/delete는 block selection plate 쪽 액션으로 둔다.
  - bold/italic/inline code는 text editing shortcut으로 둔다.

- block selection plate
  - block drag handle을 눌러 block을 선택할 수 있다.
  - 선택된 block에 대해 duplicate/delete 액션을 제공한다.
  - multi-select는 Shift/Cmd 클릭 모델로 확장할 수 있는 상태 구조를 갖춘다.

- inline formatting 저장 모델
  - `Cmd+B`, `Cmd+I`, `Cmd+E`는 각각 bold, italic, inline code를 적용한다.
  - 선택 영역이 있으면 해당 범위에 즉시 mark를 적용한다.
  - 선택 영역 없이 caret만 있을 때는 active inline mode를 토글한다.
  - active inline mode가 켜진 상태로 입력한 텍스트에는 자동으로 mark가 붙는다.
  - 다른 위치를 클릭하거나 화살표로 이동하면 그 위치의 `inlineMarks`를 읽어 active mode를 동기화한다.

- inline formatting 렌더링
  - 텍스트 원문은 그대로 유지한다.
  - `props.inlineMarks`를 기준으로 segment를 나누고, bold/italic/code 스타일을 렌더링한다.
  - Markdown marker를 viewer overlay로 숨기는 방식은 폐기했다.

- SQLite 저장 경계 정규화
  - `createBlock`/`updateBlock` 저장 전에 `inlineMarks`를 정규화한다.
  - 허용 타입은 `bold`, `italic`, `code`다.
  - text 길이를 넘는 mark 범위는 clamp한다.
  - 빈 범위, 잘못된 타입, 잘못된 shape은 제거한다.
  - 유효 mark가 없으면 `inlineMarks` prop 자체를 제거한다.

### 구현 경계

- inline formatting은 page editor의 text editing 책임이다.
- SQLite 정규화는 block repository 저장 경계에서 수행한다.
- history/sync/Automerge 또는 page text history 쪽 변경은 별도 작업 영역으로 둔다. 이번 문서의 inline formatting 작업은 그 영역을 전제로 하지 않는다.

### 검증한 것

- `bun test src/mainview/features/page/lib/inlineFormatting.test.ts src/bun/notes.test.ts`
- `bun run typecheck`

### 남은 작업

- 현재 active inline mode를 사용자에게 보여주는 floating toolbar 또는 작은 상태 UI가 필요하다.
- inline mark 범위가 텍스트 중간 삽입/삭제에 따라 자연스럽게 이동하는 정책이 더 필요하다.
- overlapping mark를 merge/split하는 정교한 정규화는 아직 단순하다.
- link mark는 아직 제외했다. link는 URL payload가 필요하므로 `inlineMarks` shape 확장 후 추가하는 것이 좋다.
- HTML paste에서 inline style까지 가져오는 것은 아직 하지 않았다.
