import type { ProjectActorResponse } from '../apis/actor';
import type { CreateFeedbackResponse } from '../apis/feedback';
import type {
  CameraSessionStatusResponse,
  CreateProjectSessionResponse,
} from '../apis/session';

export type RealtimeScope = {
  project_id?: number;
  session_id?: number | string;
  user_id?: number;
};

export type FeedbackDeletedPayload = {
  session_id: number | string;
  feedback_id: number;
  deleted_by_user_id?: number;
};

export type ProjectActorRealtimePayload = ProjectActorResponse & {
  project_id?: number;
  session_id?: number | string;
};

export type ActorDeletedPayload = {
  actor_id: number;
  project_id?: number;
  session_id?: number | string;
};

export type ActorMergedPayload = {
  actor_id: number;
  target_actor_id: number;
  project_id?: number;
  session_id?: number | string;
};

export type SessionStatusChangedPayload =
  Partial<CreateProjectSessionResponse> & {
    session_id: number;
    status?: string;
    started?: boolean;
    rehearsal_started?: boolean;
    matching_completed?: boolean | number | string;
  };

export type CameraStatusChangedPayload = CameraSessionStatusResponse & {
  db_session_id?: number;
};

export type RealtimeEventPayloadMap = {
  'feedback.created': CreateFeedbackResponse;
  'feedback.updated': CreateFeedbackResponse;
  'feedback.deleted': FeedbackDeletedPayload;
  'session.created': CreateProjectSessionResponse;
  'session.status.changed': SessionStatusChangedPayload;
  'camera.status.changed': CameraStatusChangedPayload;
  'actor.created': ProjectActorRealtimePayload;
  'actor.updated': ProjectActorRealtimePayload;
  'actor.deleted': ActorDeletedPayload;
  'actor.merged': ActorMergedPayload;
};

export type RealtimeEventType = keyof RealtimeEventPayloadMap;

export type RealtimeEvent<T extends RealtimeEventType = RealtimeEventType> = {
  type: T;
  scope?: RealtimeScope;
  payload: RealtimeEventPayloadMap[T];
  server_sent_at?: string;
};

export type RealtimeClientMessage =
  | {
      type: 'subscribe';
      scope: RealtimeScope;
    }
  | {
      type: 'unsubscribe';
      scope: RealtimeScope;
    }
  | {
      type: 'ping';
    };

export type RealtimeUnsubscribe = () => void;

export interface RealtimeClient {
  subscribe<T extends RealtimeEventType>(
    type: T,
    listener: (event: RealtimeEvent<T>) => void,
  ): RealtimeUnsubscribe;
  publish<T extends RealtimeEventType>(event: RealtimeEvent<T>): void;
  subscribeScope(scope: RealtimeScope): RealtimeUnsubscribe;
  disconnect(): void;
}
