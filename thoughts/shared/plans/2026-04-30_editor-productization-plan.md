# 로컬 Notion형 문서 편집기 제품화 계획

## 현재 판단

현재 편집기는 로컬 기반 블록 문서 편집기의 핵심 뼈대는 갖췄다. 페이지/블록 저장, 블록 선택, 키보드 이동, 복사/붙여넣기, 삭제 후 빈 블록 보장, title/body 이동, Markdown import/export, undo/redo 기반이 있다.

다만 제품으로 느껴지려면 실제 브라우저/Electrobun 환경에서 contenteditable, Selection API, Clipboard API, 포커스, 스크롤, drag/drop을 검증하는 상위 테스트가 필요하다. 지금은 순수 로직 테스트가 강하고, 실제 편집 흐름 테스트가 약하다.

## 1차 제품화 범위

1. Title에서 Enter를 누르면 본문 첫 블록으로 자연스럽게 이동한다.
2. 어떤 경로로든 페이지 블록이 0개가 되면 빈 paragraph를 보장한다.
3. 선택 블록의 복사/붙여넣기/삭제/Arrow 이동이 Notion식 블록 조작으로 유지된다.
4. 붙여넣기는 여러 블록을 한 덩어리처럼 반영하고, 외부 앱에는 Markdown으로 호환된다.
5. 긴 문서에서 Arrow 선택 이동 시 스크롤이 따라간다.

## 2차 제품화 범위

1. 실제 editor flow 테스트 하네스를 만든다.
   - title Enter -> 첫 블록 focus
   - 본문 입력 -> 저장 flush -> refetch 후 유지
   - Enter/Backspace 블록 생성/병합/삭제
   - Cmd+A/C/V/Delete 블록 선택 흐름
   - Markdown paste와 내부 block paste
   - Cmd+Z/Cmd+Shift+Z UI 경로
2. autosave queue를 더 테스트하기 쉬운 controller로 분리한다.
3. batch action 계획 로직을 순수 helper로 분리해 duplicate/paste/delete-all 순서와 fallback을 테스트한다.
4. inline formatting toolbar/link editing UI를 추가한다.
5. slash menu를 "현재 블록 변환"뿐 아니라 "아래 삽입/액션 실행"까지 확장한다.
6. 긴 문서 성능 예산을 잡고 1k/5k 블록 smoke test를 만든다.

## 제품화 완료 기준

1. `bun run check`가 통과한다.
2. React Doctor가 새 문제를 만들지 않는다.
3. editor flow 테스트가 실제 DOM focus, selection, clipboard를 최소 핵심 경로에서 검증한다.
4. 빈 페이지, 전체 삭제, 대량 붙여넣기, title/body 이동이 모두 편집 가능한 상태로 끝난다.
