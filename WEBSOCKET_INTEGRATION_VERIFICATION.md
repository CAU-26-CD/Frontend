# WebSocket Integration Verification

작성일: 2026-07-28

## 개요

백엔드 `feat/websocket` 브랜치(PR #114)의 WebSocket 이벤트 계약에 맞춰 프론트엔드 실시간 구독 및 이벤트 normalize 로직을 점검하고 수정했다.

이번 변경의 목표는 다음과 같다.

- 서버 구독 프로토콜(`subscribe`, `unsubscribe`, `ping`)에 맞는 scope 전송
- `null` scope 와일드카드 규칙 반영
- 백엔드가 보내는 최신 이벤트 payload 필드명 반영
- 피드백, 세션 상태, 카메라 상태, 배우 이벤트가 기존 화면 상태에 정상 반영되도록 보정
- 타입 빌드와 lint 통과 확인

## 적용된 변경

### WebSocket 연결 설정

환경 변수에 WebSocket URL을 추가했다.

```env
VITE_WS_URL=ws://localhost:8000/ws
VITE_WS_URL=wss://reaction--deploy.up.railway.app/ws
```

로컬 개발 환경에서는 `.env.local`의 `ws://localhost:8000/ws`를 사용한다.

운영 환경 기본값은 `.env`의 `wss://reaction--deploy.up.railway.app/ws`로 맞췄다.

### 구독 Scope 정리

서버 계약에 맞춰 WebSocket 구독 scope는 다음 두 필드만 사용하도록 정리했다.

```json
{
  "project_id": 1,
  "session_id": 10
}
```

기존 일부 구독에 포함되던 `user_id`는 WebSocket scope 계약에 없으므로 제거했다.

구독 메시지 전송 시 값이 없는 scope 필드는 `null`로 전송해 서버의 와일드카드 규칙과 일치시켰다.

```json
{
  "type": "subscribe",
  "scope": {
    "project_id": 1,
    "session_id": null
  }
}
```

중복 구독은 ref-count 방식으로 관리해 같은 scope를 여러 컴포넌트가 사용해도 서버에는 불필요한 중복 subscribe/unsubscribe가 나가지 않게 했다.

### Event Normalize 반영

다음 백엔드 payload 계약을 프론트 normalize 레이어에 반영했다.

- `actor.merged`: `merged_from`, `merged_into`를 수신하고 기존 UI 코드가 쓰는 `actor_id`, `target_actor_id`와 함께 normalize
- `session.status.changed`: `rehearsal_started_at` 필드 보존
- scope의 `null`: 와일드카드로 취급하고 필터링에서 제외
- 숫자 normalize 시 `null`, `undefined`, 빈 문자열은 유효 숫자로 변환하지 않도록 수정

### 카메라 상태 호환

백엔드 계약상 카메라 연결 상태는 `connected`가 아니라 `connect`다.

프론트는 기존 호환성을 유지하면서 다음 두 값을 모두 연결 상태로 처리하도록 수정했다.

```ts
connect
connected
```

이에 따라 카메라 QR 모달, 피드백 입력 잠금, 녹화 상태 전환 로직이 `connect` 이벤트에서도 정상 동작한다.

### 프로젝트 레벨 Actor 이벤트

배우 이벤트는 서버에서 `scope.session_id: null`로 내려온다.

프론트 scope 매칭 로직은 `null`을 와일드카드로 보고, 현재 프로젝트가 일치하면 해당 이벤트를 수용하도록 정리했다.

적용 대상:

- `actor.created`
- `actor.updated`
- `actor.deleted`
- `actor.merged`

## 주요 수정 파일

- `src/realtime/remoteRealtimeClient.ts`
- `src/realtime/message.ts`
- `src/realtime/events.ts`
- `src/hooks/useRealtimeScope.ts`
- `src/hooks/useFeedback.ts`
- `src/hooks/useProjectActorsRealtime.ts`
- `src/pages/FeedbackPage.tsx`
- `src/pages/WorkspacePage.tsx`
- `src/pages/ActorMappingPage.tsx`
- `src/pages/ActorMappingWaitingPage.tsx`
- `src/components/modals/CameraSessionModal.tsx`

## 검증 결과

다음 명령을 실행했고 모두 성공했다.

```bash
npm run build
```

결과:

- TypeScript project build 성공
- Vite production build 성공
- 최종 JS/CSS 번들 생성 성공

```bash
npm run lint
```

결과:

- ESLint 검사 통과

## 로컬 실행 확인

Vite dev server를 실행해 프론트가 정상 기동되는 것을 확인했다.

```bash
npm run dev -- --host 0.0.0.0
```

접속 URL:

```text
http://localhost:5173/
```

로컬 WebSocket 백엔드가 실행 중이면 프론트는 다음 주소로 연결한다.

```text
ws://localhost:8000/ws
```

## 브라우저 통합 확인 시나리오

백엔드 로컬 서버 실행 후 아래 시나리오로 확인할 수 있다.

1. 프론트 dev server 접속: `http://localhost:5173/`
2. 프로젝트 워크스페이스 또는 피드백 페이지 진입
3. 브라우저 탭 2개를 같은 프로젝트/세션에 열기
4. 한 탭에서 피드백 생성, 수정, 삭제
5. 다른 탭에서 `feedback.created`, `feedback.updated`, `feedback.deleted` 반영 확인
6. 카메라 연결 상태가 `connect`, `recording`, `end`, `done` 순서로 UI에 반영되는지 확인
7. 배우 생성, 수정, 삭제, 병합 시 같은 프로젝트의 세션 화면에 반영되는지 확인
8. 세션 매칭 완료 시 대기 화면에서 리뷰 화면으로 이동하는지 확인

## 결론

프론트 WebSocket 구현은 백엔드 최신 계약에 맞게 보정되었고, 정적 검증 기준으로 정상 통과했다.

남은 확인은 실제 백엔드 `feat/websocket` 서버와 브라우저 2개를 이용한 end-to-end 이벤트 수신 테스트다.
