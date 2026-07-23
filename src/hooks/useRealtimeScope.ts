import { useEffect } from 'react';
import { realtimeClient, type RealtimeScope } from '../realtime';

const hasScopeValue = (scope: RealtimeScope) =>
  scope.project_id !== undefined ||
  scope.session_id !== undefined ||
  scope.user_id !== undefined;

export const useRealtimeScope = (
  scope: RealtimeScope,
  enabled = true,
) => {
  const projectId = scope.project_id;
  const sessionId = scope.session_id;
  const userId = scope.user_id;

  useEffect(() => {
    const nextScope = {
      ...(projectId !== undefined ? { project_id: projectId } : {}),
      ...(sessionId !== undefined ? { session_id: sessionId } : {}),
      ...(userId !== undefined ? { user_id: userId } : {}),
    };

    if (!enabled || !hasScopeValue(nextScope)) {
      return;
    }

    return realtimeClient.subscribeScope(nextScope);
  }, [enabled, projectId, sessionId, userId]);
};
