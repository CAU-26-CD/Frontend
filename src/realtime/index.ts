import { LocalRealtimeClient } from './localRealtimeClient';
import { RemoteRealtimeClient } from './remoteRealtimeClient';

const wsUrl = import.meta.env.VITE_WS_URL;

export const realtimeClient =
  typeof wsUrl === 'string' && wsUrl.trim()
    ? new RemoteRealtimeClient(wsUrl)
    : new LocalRealtimeClient();

export type {
  RealtimeClient,
  RealtimeClientMessage,
  RealtimeEvent,
  RealtimeEventType,
  RealtimeScope,
  RealtimeUnsubscribe,
} from './events';
