# Script PDF Feedback Performance Baseline

측정일: 2026-08-08

## A. 재현 환경

- 실행 방식: Vite dev server `http://127.0.0.1:5173`
- development / production: development
- 브라우저: Google Chrome 151, Chrome DevTools Protocol 자동 조작
- 로그인: `HELEN / 1234`, `user_id=11`
- 대상: `project_id=14`, `session_id=44`
- PDF 페이지 수: 5 pages
- 특이 조건: 로컬 origin에서 Railway API CORS가 막혀 측정용 Chrome만 `--disable-web-security`로 실행
- 임시 instrumentation: PDF/canvas/render/network counter를 5개 파일에 추가 후 측정 완료 뒤 제거
- 측정 후 상태: `git status` clean, `npm run build` 통과
- 측정 중 생성된 테스트 피드백 `332`, `333`은 삭제 완료

## B. PDF Canvas Render 결과

| Scenario | ScriptPdfViewer render | PDF canvas render | Overlay render | 비고 |
|---|---:|---:|---:|---|
| Idle 10 sec | 20 | 0 | page 1: 2 | 1초 session polling 영향. PDF canvas 재렌더 없음 |
| Script click 1회 | 6 | 0 | page 1: 4 | `draftAnchor` 1회 변경, `onSurfaceScroll` 참조 1회 변경 |
| Input 12 chars | 28 | 0 | 영문 page 1: 6 / 한글 0 | 입력 중 PDF canvas 재렌더 재현 안 됨 |
| Actor/marker hover 10회 | 4 | 0 | page 1: 50 | hover local overlay render 큼, canvas 영향 없음 |
| Actor select/unselect | 2 | 0 | 0 | composer local render 중심 |
| Video polling 10 sec | 20 | 0 | 0 | `/video` 아님. `/projects/14/sessions` 10회 polling |

페이지별 PDF canvas render count는 모든 시나리오에서 reset 이후 `page 1~5 = 0`이었다.
최초 PDF 로딩 때만 `page 1~5 = 각 1회` 발생했다.

## C. 입력 12글자 상세

이전 baseline:

- 5 pages
- 12 chars
- 약 60 canvas renders

현재 영문 입력:

- pages: 5
- chars: `abcdefghijkl`
- page 1: 0
- page 2: 0
- page 3: 0
- page 4: 0
- page 5: 0
- total: 0

한글 입력 `가나다라마바사아자차카타`도 total 0이다.
단, CDP `insertText`로 측정했기 때문에 실제 IME composition 이벤트 전체까지는 재현하지 않았고, 커밋된 한글 입력 이벤트 기준이다.

## D. 상태 -> 렌더 전파 구조

`scriptDraftContent`

```text
ScriptFeedbackWorkspacePage
  ↓
ScriptPdfViewer prop draftContent
  ↓
ScriptFeedbackComposer
```

결과: Workspace/Viewer/Composer는 렌더되지만 `ScriptPdfDocumentSurface`와 PDF canvas effect까지는 전파되지 않았다.

`draftAnchor`

```text
ScriptPdfViewer local state
  ↓
handleSurfaceScroll 참조 변경
  ↓
ScriptPdfDocumentSurface / 해당 page overlay render
```

결과: canvas render 없음.

`selected actor`

```text
ScriptFeedbackComposer local selection
  ↓
ScriptFeedbackComposer render
```

결과: composer 중심 render. canvas 영향 없음.

`feedback markers`

```text
visibleScriptFeedbacks 새 배열
  ↓
feedbackMarkers / feedbackMarkersByPage
  ↓
page overlay render
```

결과: POST 후 overlay는 갱신되지만 canvas render 없음.

`polling state`

```text
setCurrentProjectSession(matchedSession)
  ↓
RehearsalFeedbackPage
  ↓
ScriptFeedbackWorkspacePage
  ↓
ScriptPdfViewer
```

결과: 10초에 20회 렌더. canvas render 없음.

## E. Effect Dependency 분석

실제 PDF canvas render는 `src/components/feedback/ScriptPdfViewer.tsx`의 `page.render(...)` 지점에서 수행된다.

```ts
const renderTask = page.render({
  canvas,
  canvasContext: context,
  viewport,
});
```

해당 effect dependency:

```ts
[
  canvasRef,
  containerWidth,
  document,
  onRenderingChange,
  onSizeChange,
  pageNumber,
]
```

현재 입력/클릭/hover/actor 선택에서 이 값들은 바뀌지 않았다. 그래서 `ScriptPdfViewer`가 재렌더되어도 `PDF_RENDER`은 0회였다.

PDF 문서 로딩 effect dependency:

```ts
[onPageCountChange, retryCount, script.url]
```

입력 중 `script.url`은 stable primitive라 PDF 재다운로드도 발생하지 않았다.

## F. Referential Equality 문제

| Prop / dependency | 현재 참조 안정성 | PDF render effect 영향 |
|---|---|---|
| `script.url` | stable primitive | PDF load effect만 영향. 입력/클릭 중 변화 없음 |
| `feedbacks` | feedback 목록/pending 변경 때 새 배열 | overlay render 영향. canvas effect 직접 영향 없음 |
| `visibleScriptFeedbacks` | `[...feedback.feedbacks, ...pendingScriptFeedbacks]`로 dependency 변경 때 새 배열 | POST 때 markers 참조 변경 |
| `feedbackMarkers` | `feedbacks.filter(...)` useMemo | `feedbacks` 변경 때만 새 배열 |
| page `markers` | feedback 변경 때 page별 새 배열 | `ScriptPdfPage` render 영향. `ScriptPdfCanvas` prop 아님 |
| `onFeedbackSelect` | `useCallback`, stable | 문제 없음 |
| `handlePageClick` | `pageSizes` 변경 시 새 참조 | canvas prop 아님 |
| `handleSurfaceScroll` | `draftAnchor`/closing 변경 시 새 참조 | surface/page render 유발. canvas effect 영향 없음 |
| `onSizeChange` | `useCallback`, stable | canvas effect dependency지만 측정 중 변화 없음 |
| `onRenderingChange` | `useCallback`, stable | canvas effect dependency지만 측정 중 변화 없음 |

## G. Network 결과

Feedback POST:

- 호출 횟수: 1
- endpoint: `POST /api/v2/sessions/44/feedbacks?user_id=11`
- status: 201
- request payload size: 170 bytes
- Waiting: 560 ms
- TTFB: 561 ms
- Content Download: 0 ms
- Total: 561 ms

기존 1.7~2.0초 TTFB는 이번 측정에서는 재현되지 않았다.

등록 전후 추가 요청:

- feedback 목록 전체 재조회: 없음
- script metadata 재조회: 없음
- presigned URL 재조회: 없음
- PDF 재다운로드: 없음
- session polling GET: 측정 구간 중 계속 발생

Scenario F에서 `/api/v1/sessions/44/video` 호출은 0회였다.
현재 feedback 입력 페이지의 1초 polling은 `/api/v1/projects/14/sessions?...`이다.

## H. 현재 병목 우선순위

P0

이전의 "입력마다 모든 PDF canvas 재렌더링"은 현재 재현되지 않음. 현재 P0로 볼만한 canvas 병목은 없음.

P1

1초 session polling이 같은 값이어도 `setCurrentProjectSession`을 호출해서 10초 동안 `RehearsalFeedbackPage`, `ScriptFeedbackWorkspacePage`, `ScriptPdfViewer`가 각각 20회 렌더됨.

P1

피드백/marker hover 10회에서 page 1 overlay render 50회. canvas는 안전하지만 overlay 쪽 render 빈도는 큼.

P2

대본 클릭 1회가 viewer 6회, surface 4회, composer 4회 render를 유발. canvas는 안전함.

P2

피드백 입력 12글자에서 Workspace/Viewer/Composer가 28회 렌더. canvas는 안전하지만 상위 render는 남아 있음.

## I. 다음 최적화 제안

1. Polling state update guard

- 수정 대상: `src/pages/FeedbackPage.tsx`
- 기대 효과: 동일 session 응답이면 parent/viewer render 제거
- 기능 영향 위험: session 상태 변경 감지 누락 가능
- 검증 방법: polling 10초에서 `RehearsalFeedbackPage`/`ScriptPdfViewer` render count 감소 확인

2. 입력 상태 localize

- 수정 대상: `src/pages/ScriptFeedbackWorkspacePage.tsx`, `src/components/feedback/ScriptFeedbackComposer.tsx`
- 기대 효과: 12글자 입력 시 Workspace/Viewer render 감소
- 기능 영향 위험: 우측 movement panel과 draft content 동기화 깨질 수 있음
- 검증 방법: 12글자 입력에서 Workspace/Viewer render count 비교

3. Hover overlay render 축소

- 수정 대상: `src/components/feedback/ScriptPdfViewer.tsx`의 `ScriptPdfPage` marker hover 영역
- 기대 효과: hover 10회 overlay render 50회 감소
- 기능 영향 위험: hover close animation 타이밍 영향
- 검증 방법: marker hover 10회 카운트와 bubble animation 시각 확인

4. Feedback marker array 안정화 유지/강화

- 수정 대상: `visibleScriptFeedbacks`, `feedbackMarkersByPage`
- 기대 효과: POST/필터 변경 때만 overlay 갱신
- 기능 영향 위험: pending feedback 반영 누락 가능
- 검증 방법: POST 후 marker 추가, 리스트 반영, PDF canvas render 0 유지

## Chrome Performance / Web Vitals 측정 가이드

같은 시나리오로 Chrome DevTools Performance recording을 켠 뒤 다음 구간을 본다.

1. 페이지 진입
2. PDF 로딩 완료
3. 대본 클릭
4. 피드백 입력창 표시
5. 영문 12글자 입력
6. actor marker hover/선택
7. 피드백 등록
8. 기존 피드백 클릭 -> PDF 위치 이동

확인 대상:

- `Interactions`: INP 후보와 interaction duration
- `Main`: long task, scripting, timer callback
- `Layout`: forced layout 또는 layout 반복
- `Paint`: overlay 변화와 paint 비용
- `Network`: POST feedback, session polling, PDF 재다운로드 여부

현재 문제는 사용자 인터랙션 지연이므로 LCP/CLS보다 INP와 interaction 처리 시간이 우선이다.
Lighthouse는 로컬 dev/HMR와 인증 상태 때문에 점수 신뢰도가 낮고, production build를 serve한 뒤 로그인 세션을 만든 상태에서 참고용으로만 보는 것이 적절하다.
