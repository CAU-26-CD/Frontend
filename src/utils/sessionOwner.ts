const SESSION_OWNER_STORAGE_PREFIX = 'reaction-session-owner';

type SessionOwnerCandidate = {
  user_id?: unknown;
  owner_id?: unknown;
  owner_user_id?: unknown;
  created_by?: unknown;
  creator_id?: unknown;
  created_by_user_id?: unknown;
};

const toPositiveNumber = (value: unknown) => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

const getStorageKey = (sessionId: number | string) =>
  `${SESSION_OWNER_STORAGE_PREFIX}:${sessionId}`;

export const getSessionOwnerId = (
  session: SessionOwnerCandidate | null | undefined,
) => {
  if (!session) {
    return null;
  }

  return (
    toPositiveNumber(session.user_id) ??
    toPositiveNumber(session.owner_id) ??
    toPositiveNumber(session.owner_user_id) ??
    toPositiveNumber(session.created_by) ??
    toPositiveNumber(session.creator_id) ??
    toPositiveNumber(session.created_by_user_id)
  );
};

export const saveSessionOwnerId = (
  sessionId: number | string,
  ownerId: number,
) => {
  localStorage.setItem(getStorageKey(sessionId), String(ownerId));
};

export const getStoredSessionOwnerId = (sessionId: number | string) =>
  toPositiveNumber(localStorage.getItem(getStorageKey(sessionId)));
