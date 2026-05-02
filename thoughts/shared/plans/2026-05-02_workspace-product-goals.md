# 로컬 Notion형 워크스페이스 확장 목표

## 목적

현재 앱은 로컬 기반 페이지/블록 편집기의 핵심 흐름을 갖췄다. 다음 목표는 단순 편집기를 넘어 실제 지식 작업 공간으로 느껴지게 만드는 것이다.

이번 목표 범위는 다음 네 축으로 잡는다.

1. page 제거와 page tree 모양 정리
2. 대규모 검색, 필터, 정렬
3. 임베드와 미디어 블록
4. database/table view

## 방향

Notion 전체 기능을 그대로 복제하는 것이 목표는 아니다. 먼저 로컬 개인 워크스페이스에서 매일 쓸 수 있는 기능을 만든다. 기준은 빠른 이동, 안전한 삭제, 구조화된 페이지 목록, 로컬 파일을 포함한 문서 작성, 그리고 표 기반 정리다.

서버 상태와 저장소 데이터는 React Query와 Bun/SQLite 경계를 통해 관리한다. workspace shell은 탭, 사이드바, 검색, 설정을 책임지고, page domain은 문서 편집과 블록 렌더링을 책임진다. 공용 검색 인덱싱, attachment 경로, database schema처럼 여러 런타임에서 재사용될 수 있는 로직은 `src/shared` 또는 Bun 저장소 경계에 둔다.

## 1. page 제거와 page tree 모양 정리

### 목표

페이지 트리가 더 이상 단순 목록처럼 보이지 않고, 실제 워크스페이스의 정보 구조처럼 보여야 한다. 페이지 삭제는 데이터 손실 위험이 크므로 즉시 hard delete보다 휴지통 모델을 우선한다.

### 범위

- page soft delete 상태를 추가한다.
- 삭제된 page는 기본 tree/search에서 숨긴다.
- 삭제 시 하위 page와 block 처리 정책을 명확히 한다.
- 활성 탭, route, tab history, backlink가 삭제 page를 참조할 때의 fallback을 정한다.
- page tree의 visual hierarchy를 개선한다.
  - depth별 indent와 connector 감각
  - 접기/펼치기 affordance
  - hover action: 새 하위 페이지, rename, delete
  - 빈 제목, active page, drag target 상태
  - collapsed sidebar와 full sidebar 양쪽 대응

### 완료 조건

- page를 삭제해도 앱이 빈 route나 깨진 탭으로 남지 않는다.
- 삭제된 page는 휴지통 또는 복구 가능한 별도 경로에서만 보인다.
- page tree에서 부모/자식/active/hover/drag 상태가 눈으로 구분된다.
- `bun run check`와 React Doctor가 통과한다.

## 2. 대규모 검색, 필터, 정렬

### 목표

페이지가 많아져도 원하는 내용을 빠르게 찾고, 결과를 의미 있는 순서로 좁힐 수 있어야 한다. 현재 FTS 기반 검색 가능성을 workspace 수준의 실제 탐색 경험으로 올린다.

### 범위

- global search를 quick switcher와 분리하거나 확장한다.
- 검색 대상은 page title, block text, backlink context, 향후 database property까지 포함한다.
- 결과에는 page, block, database row를 구분하는 type을 붙인다.
- 필터는 1차로 type, updated date, parent page, block type 정도로 제한한다.
- 정렬은 relevance, 최근 수정, 제목순을 먼저 지원한다.
- 검색 결과 선택 시 해당 page로 이동하고 block 결과는 해당 block으로 focus/scroll한다.

### 완료 조건

- 수천 page/block 데이터에서도 검색 UI가 멈추지 않는다.
- 검색 결과가 page와 block을 구분해서 보여준다.
- 필터와 정렬이 검색어 변경과 함께 안정적으로 유지된다.
- 검색 인덱스 갱신이 page/block 저장 흐름과 어긋나지 않는다.

## 3. 임베드와 미디어 블록

### 목표

텍스트만 있는 문서에서 벗어나 이미지, 파일, 링크 preview를 문서 안에 안정적으로 넣을 수 있게 한다. 로컬 앱이므로 외부 URL embed보다 로컬 attachment 저장과 복구 가능성을 먼저 잡는다.

### 범위

- attachment 저장 모델을 정의한다.
  - SQLite metadata
  - app data 내부 file storage
  - 원본 파일명, mime type, size, checksum
- image block을 먼저 구현한다.
- file block과 link bookmark block을 다음 단계로 둔다.
- paste/drop으로 이미지 또는 파일을 넣을 수 있게 한다.
- media block은 page domain의 block type으로 렌더링하되, 실제 파일 IO는 Bun 경계에 둔다.

### 완료 조건

- 이미지를 문서에 추가하고 앱 재시작 후에도 볼 수 있다.
- 파일 경로가 바뀌어도 앱 내부 저장본으로 유지된다.
- 지원하지 않는 파일은 깨진 UI 대신 file block fallback으로 보인다.
- attachment 삭제와 page 삭제 정책이 충돌하지 않는다.

## 4. database/table view

### 목표

Notion과의 가장 큰 제품 차이는 database다. 다만 처음부터 모든 view를 만들면 범위가 커진다. 1차 목표는 page를 row로 다루는 table view다.

### 범위

- database는 특수 page 또는 특수 block으로 둔다.
- row는 별도 entity가 아니라 page와 연결된 record로 시작한다.
- property type은 1차로 text, number, checkbox, select, date를 둔다.
- table view는 column resize, row add, cell edit, sort, filter를 지원한다.
- row를 열면 일반 page editor로 들어갈 수 있어야 한다.
- database property 검색은 2번 검색 목표와 연결한다.

### 완료 조건

- table에서 row/page를 만들고 다시 page editor로 열 수 있다.
- property 값이 SQLite에 저장되고 재시작 후 유지된다.
- table sort/filter가 검색 목표와 같은 조건 모델을 공유한다.
- 일반 page block 편집과 database view 편집이 서로 상태를 덮어쓰지 않는다.

## 추천 개발 순서

1. page 제거와 page tree 모양 정리
2. 검색 결과 모델과 global search UI
3. image attachment block
4. table database의 저장 모델
5. table view MVP
6. 검색 필터/정렬을 database property까지 확장
7. file/link embed 확장

이 순서가 좋은 이유는 삭제와 page tree가 workspace의 기본 안정성을 잡고, 검색이 page/block 규모 증가를 받쳐주며, database/table이 검색/필터/정렬 모델을 재사용할 수 있기 때문이다. media는 attachment 저장 경계가 중요하므로 image block으로 작게 시작한다.

## 이번 목표의 제외 범위

- 실시간 협업
- 외부 공유 링크
- Notion API 호환
- 캘린더/보드/gallery view
- 고급 formula/rollup/relation
- 외부 서비스 embed의 완전한 preview 렌더링

이 항목들은 database/table MVP와 local attachment가 안정화된 뒤 별도 목표로 다룬다.
