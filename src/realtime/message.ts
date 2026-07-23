import type {
  RealtimeEvent,
  RealtimeEventPayloadMap,
  RealtimeEventType,
  RealtimeScope,
} from './events';

const eventTypes = new Set<RealtimeEventType>([
  'feedback.created',
  'feedback.updated',
  'feedback.deleted',
  'session.created',
  'session.status.changed',
  'camera.status.changed',
  'actor.created',
  'actor.updated',
  'actor.deleted',
  'actor.merged',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toFiniteNumber = (value: unknown) => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === 'true') {
      return true;
    }

    if (normalizedValue === 'false') {
      return false;
    }
  }

  return undefined;
};

const normalizeScope = (scope: unknown): RealtimeScope | undefined => {
  if (!isRecord(scope)) {
    return undefined;
  }

  const projectId = toFiniteNumber(scope.project_id ?? scope.projectId);
  const sessionId = scope.session_id ?? scope.sessionId;
  const userId = toFiniteNumber(scope.user_id ?? scope.userId);

  return {
    ...(projectId !== undefined ? { project_id: projectId } : {}),
    ...(typeof sessionId === 'string' || typeof sessionId === 'number'
      ? { session_id: sessionId }
      : {}),
    ...(userId !== undefined ? { user_id: userId } : {}),
  };
};

const normalizeFeedbackPayload = (
  payload: Record<string, unknown>,
): RealtimeEventPayloadMap['feedback.created'] => ({
  feedback_id: Number(payload.feedback_id ?? payload.feedbackId ?? payload.id),
  session_id: (payload.session_id ?? payload.sessionId) as number | string,
  created_by_user_id: Number(
    payload.created_by_user_id ??
      payload.createdByUserId ??
      payload.user_id ??
      payload.userId,
  ),
  content: String(payload.content ?? ''),
  video_offset_seconds: Number(
    payload.video_offset_seconds ?? payload.videoOffsetSeconds ?? 0,
  ),
  actor_ids: Array.isArray(payload.actor_ids)
    ? payload.actor_ids.map(Number).filter(Number.isFinite)
    : Array.isArray(payload.actorIds)
      ? payload.actorIds.map(Number).filter(Number.isFinite)
      : [],
  actor_names: Array.isArray(payload.actor_names)
    ? payload.actor_names.filter(
        (actorName): actorName is string => typeof actorName === 'string',
      )
    : undefined,
  created_at: String(payload.created_at ?? payload.createdAt ?? ''),
});

const normalizeSessionPayload = (
  payload: Record<string, unknown>,
): RealtimeEventPayloadMap['session.status.changed'] => {
  const sessionId = toFiniteNumber(payload.session_id ?? payload.sessionId);
  const projectId = toFiniteNumber(payload.project_id ?? payload.projectId);
  const inProgress = toBoolean(payload.in_progress ?? payload.inProgress);
  const matchingCompleted = toBoolean(
    payload.matching_completed ?? payload.matchingCompleted,
  );
  const started = toBoolean(
    payload.started ?? payload.rehearsal_started ?? payload.rehearsalStarted,
  );

  return {
    ...(payload as Partial<RealtimeEventPayloadMap['session.status.changed']>),
    session_id: sessionId ?? 0,
    ...(projectId !== undefined ? { project_id: projectId } : {}),
    ...(typeof payload.title === 'string' ? { title: payload.title } : {}),
    ...(typeof payload.s_category === 'string'
      ? { s_category: payload.s_category }
      : typeof payload.sCategory === 'string'
        ? { s_category: payload.sCategory }
        : {}),
    ...(typeof payload.created_at === 'string'
      ? { created_at: payload.created_at }
      : typeof payload.createdAt === 'string'
        ? { created_at: payload.createdAt }
        : {}),
    ...(inProgress !== undefined ? { in_progress: inProgress } : {}),
    ...(matchingCompleted !== undefined
      ? { matching_completed: matchingCompleted }
      : {}),
    ...(started !== undefined ? { started, rehearsal_started: started } : {}),
    ...(typeof payload.status === 'string' ? { status: payload.status } : {}),
  };
};

const normalizeCameraPayload = (
  payload: Record<string, unknown>,
): RealtimeEventPayloadMap['camera.status.changed'] => ({
  session_id: String(payload.session_id ?? payload.sessionId ?? ''),
  status: String(payload.status ?? ''),
  connected_at:
    typeof payload.connected_at === 'string'
      ? payload.connected_at
      : typeof payload.connectedAt === 'string'
        ? payload.connectedAt
        : null,
  recording_started_at:
    typeof payload.recording_started_at === 'string'
      ? payload.recording_started_at
      : typeof payload.recordingStartedAt === 'string'
        ? payload.recordingStartedAt
        : null,
  recording_elapsed_seconds:
    toFiniteNumber(
      payload.recording_elapsed_seconds ?? payload.recordingElapsedSeconds,
    ) ?? null,
  video_url:
    typeof payload.video_url === 'string'
      ? payload.video_url
      : typeof payload.videoUrl === 'string'
        ? payload.videoUrl
        : null,
  db_session_id: toFiniteNumber(payload.db_session_id ?? payload.dbSessionId),
});

const normalizeActorPayload = (
  payload: Record<string, unknown>,
): RealtimeEventPayloadMap['actor.created'] => ({
  actor_id:
    toFiniteNumber(payload.actor_id ?? payload.actorId ?? payload.id) ?? 0,
  name: String(payload.name ?? ''),
  project_id: toFiniteNumber(payload.project_id ?? payload.projectId),
  session_id:
    typeof payload.session_id === 'string' ||
    typeof payload.session_id === 'number'
      ? payload.session_id
      : typeof payload.sessionId === 'string' ||
          typeof payload.sessionId === 'number'
        ? payload.sessionId
        : undefined,
});

const normalizePayload = (
  type: RealtimeEventType,
  payload: unknown,
): RealtimeEventPayloadMap[RealtimeEventType] | null => {
  if (!isRecord(payload)) {
    return null;
  }

  if (type === 'feedback.created' || type === 'feedback.updated') {
    return normalizeFeedbackPayload(payload);
  }

  if (type === 'feedback.deleted') {
    return {
      session_id: (payload.session_id ?? payload.sessionId) as number | string,
      feedback_id: Number(
        payload.feedback_id ?? payload.feedbackId ?? payload.id,
      ),
      deleted_by_user_id:
        payload.deleted_by_user_id === undefined
          ? undefined
          : Number(payload.deleted_by_user_id),
    };
  }

  if (type === 'session.created' || type === 'session.status.changed') {
    return normalizeSessionPayload(payload);
  }

  if (type === 'camera.status.changed') {
    return normalizeCameraPayload(payload);
  }

  if (type === 'actor.created' || type === 'actor.updated') {
    return normalizeActorPayload(payload);
  }

  if (type === 'actor.deleted') {
    return {
      actor_id:
        toFiniteNumber(payload.actor_id ?? payload.actorId ?? payload.id) ?? 0,
      project_id: toFiniteNumber(payload.project_id ?? payload.projectId),
      session_id:
        typeof payload.session_id === 'string' ||
        typeof payload.session_id === 'number'
          ? payload.session_id
          : typeof payload.sessionId === 'string' ||
              typeof payload.sessionId === 'number'
            ? payload.sessionId
            : undefined,
    };
  }

  if (type === 'actor.merged') {
    return {
      actor_id:
        toFiniteNumber(payload.actor_id ?? payload.actorId ?? payload.id) ?? 0,
      target_actor_id:
        toFiniteNumber(payload.target_actor_id ?? payload.targetActorId) ?? 0,
      project_id: toFiniteNumber(payload.project_id ?? payload.projectId),
      session_id:
        typeof payload.session_id === 'string' ||
        typeof payload.session_id === 'number'
          ? payload.session_id
          : typeof payload.sessionId === 'string' ||
              typeof payload.sessionId === 'number'
            ? payload.sessionId
            : undefined,
    };
  }

  return payload as RealtimeEventPayloadMap[RealtimeEventType];
};

export const normalizeRealtimeEvent = (
  message: unknown,
): RealtimeEvent | null => {
  if (!isRecord(message) || typeof message.type !== 'string') {
    return null;
  }

  const eventType = message.type as RealtimeEventType;

  if (!eventTypes.has(eventType)) {
    return null;
  }

  const payload = normalizePayload(eventType, message.payload);

  if (!payload) {
    return null;
  }

  return {
    type: eventType,
    scope: normalizeScope(message.scope),
    payload,
    server_sent_at:
      typeof message.server_sent_at === 'string'
        ? message.server_sent_at
        : undefined,
  } as RealtimeEvent;
};

export const parseRealtimeMessage = (
  rawMessage: string,
): RealtimeEvent | null => {
  try {
    return normalizeRealtimeEvent(JSON.parse(rawMessage));
  } catch {
    return null;
  }
};
