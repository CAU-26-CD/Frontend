import { useEffect } from 'react';
import { realtimeClient, type RealtimeScope } from '../realtime';

const hasScopeValue = (scope: RealtimeScope) =>
  scope.project_id != null || scope.session_id != null;

export const useRealtimeScope = (
  scope: RealtimeScope,
  enabled = true,
) => {
  const projectId = scope.project_id;
  const sessionId = scope.session_id;

  useEffect(() => {
    const nextScope = {
      ...(projectId != null ? { project_id: projectId } : {}),
      ...(sessionId != null ? { session_id: sessionId } : {}),
    };

    if (!enabled || !hasScopeValue(nextScope)) {
      return;
    }

    return realtimeClient.subscribeScope(nextScope);
  }, [enabled, projectId, sessionId]);
};
