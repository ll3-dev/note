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
