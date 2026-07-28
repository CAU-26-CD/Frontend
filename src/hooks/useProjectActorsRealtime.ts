import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  realtimeClient,
  type RealtimeEvent,
  type RealtimeScope,
} from '../realtime';
import type { Actor } from '../types/feedback';

type ProjectActorsRealtimeOptions = {
  projectId: number;
  sessionId?: number | string;
  enabled?: boolean;
  setActors: Dispatch<SetStateAction<Actor[]>>;
};

const scopeMatches = (
  scope: RealtimeScope | undefined,
  projectId: number,
  sessionId?: number | string,
) => {
  if (scope?.project_id != null && scope.project_id !== projectId) {
    return false;
  }

  if (
    sessionId !== undefined &&
    scope?.session_id != null &&
    String(scope.session_id) !== String(sessionId)
  ) {
    return false;
  }

  return true;
};

const getActorShortcut = (index: number) => String(index + 1);

const normalizeActor = (
  actor: RealtimeEvent<'actor.created' | 'actor.updated'>['payload'],
  index: number,
): Actor => ({
  id: actor.actor_id,
  name: actor.name,
  shortcut: getActorShortcut(index),
});

const reorderShortcuts = (actors: Actor[]) =>
  actors.map((actor, index) => ({
    ...actor,
    shortcut: getActorShortcut(index),
  }));

export const useProjectActorsRealtime = ({
  projectId,
  sessionId,
  enabled = true,
  setActors,
}: ProjectActorsRealtimeOptions) => {
  useEffect(() => {
    if (!enabled || Number.isNaN(projectId)) {
      return;
    }

    const unsubscribeCreated = realtimeClient.subscribe(
      'actor.created',
      (event) => {
        if (!scopeMatches(event.scope, projectId, sessionId)) return;
        if (
          event.payload.project_id !== undefined &&
          event.payload.project_id !== projectId
        ) {
          return;
        }

        setActors((currentActors) => {
          const nextActor = normalizeActor(event.payload, currentActors.length);

          if (currentActors.some((actor) => actor.id === nextActor.id)) {
            return currentActors.map((actor) =>
              actor.id === nextActor.id
                ? { ...actor, name: nextActor.name }
                : actor,
            );
          }

          return reorderShortcuts([...currentActors, nextActor]);
        });
      },
    );

    const unsubscribeUpdated = realtimeClient.subscribe(
      'actor.updated',
      (event) => {
        if (!scopeMatches(event.scope, projectId, sessionId)) return;
        if (
          event.payload.project_id !== undefined &&
          event.payload.project_id !== projectId
        ) {
          return;
        }

        setActors((currentActors) =>
          currentActors.map((actor) =>
            actor.id === event.payload.actor_id
              ? { ...actor, name: event.payload.name }
              : actor,
          ),
        );
      },
    );

    const unsubscribeDeleted = realtimeClient.subscribe(
      'actor.deleted',
      (event) => {
        if (!scopeMatches(event.scope, projectId, sessionId)) return;
        if (
          event.payload.project_id !== undefined &&
          event.payload.project_id !== projectId
        ) {
          return;
        }

        setActors((currentActors) =>
          reorderShortcuts(
            currentActors.filter(
              (actor) => actor.id !== event.payload.actor_id,
            ),
          ),
        );
      },
    );

    const unsubscribeMerged = realtimeClient.subscribe(
      'actor.merged',
      (event) => {
        if (!scopeMatches(event.scope, projectId, sessionId)) return;
        if (
          event.payload.project_id !== undefined &&
          event.payload.project_id !== projectId
        ) {
          return;
        }

        setActors((currentActors) =>
          reorderShortcuts(
            currentActors.filter(
              (actor) => actor.id !== event.payload.actor_id,
            ),
          ),
        );
      },
    );

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeMerged();
    };
  }, [enabled, projectId, sessionId, setActors]);
};
