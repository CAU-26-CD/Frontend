import type {
  RealtimeClient,
  RealtimeClientMessage,
  RealtimeEvent,
  RealtimeEventType,
  RealtimeScope,
  RealtimeUnsubscribe,
} from './events';
import { parseRealtimeMessage } from './message';

type Listener<T extends RealtimeEventType> = (event: RealtimeEvent<T>) => void;

const RECONNECT_DELAYS_MS = [500, 1000, 2000, 5000, 10000];
const HEARTBEAT_INTERVAL_MS = 25000;

const getScopeKey = (scope: RealtimeScope) =>
  JSON.stringify({
    project_id: scope.project_id ?? null,
    session_id: scope.session_id ?? null,
    user_id: scope.user_id ?? null,
  });

export class RemoteRealtimeClient implements RealtimeClient {
  private readonly url: string;
  private socket: WebSocket | null = null;
  private listeners = new Map<
    RealtimeEventType,
    Set<Listener<RealtimeEventType>>
  >();
  private scopes = new Map<string, RealtimeScope>();
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private manuallyClosed = false;

  constructor(url: string) {
    this.url = url;
  }

  subscribe<T extends RealtimeEventType>(
    type: T,
    listener: Listener<T>,
  ): RealtimeUnsubscribe {
    const listeners = this.listeners.get(type) ?? new Set();

    listeners.add(listener as Listener<RealtimeEventType>);
    this.listeners.set(type, listeners);
    this.connect();

    return () => {
      listeners.delete(listener as Listener<RealtimeEventType>);

      if (listeners.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  publish<T extends RealtimeEventType>(event: RealtimeEvent<T>) {
    this.emit(event);
  }

  subscribeScope(scope: RealtimeScope): RealtimeUnsubscribe {
    const scopeKey = getScopeKey(scope);

    this.scopes.set(scopeKey, scope);
    this.connect();
    this.send({ type: 'subscribe', scope });

    return () => {
      this.scopes.delete(scopeKey);
      this.send({ type: 'unsubscribe', scope });
    };
  }

  disconnect() {
    this.manuallyClosed = true;
    this.clearReconnectTimer();
    this.clearHeartbeat();
    this.socket?.close();
    this.socket = null;
  }

  private connect() {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    this.manuallyClosed = false;
    this.socket = new WebSocket(this.url);

    this.socket.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.startHeartbeat();
      this.scopes.forEach((scope) => {
        this.send({ type: 'subscribe', scope });
      });
    });

    this.socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') {
        return;
      }

      const realtimeEvent = parseRealtimeMessage(event.data);

      if (realtimeEvent) {
        this.emit(realtimeEvent);
      }
    });

    this.socket.addEventListener('close', () => {
      this.socket = null;
      this.clearHeartbeat();

      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    });

    this.socket.addEventListener('error', () => {
      this.socket?.close();
    });
  }

  private send(message: RealtimeClientMessage | RealtimeEvent) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.connect();
      return;
    }

    this.socket.send(JSON.stringify(message));
  }

  private emit<T extends RealtimeEventType>(event: RealtimeEvent<T>) {
    const listeners = this.listeners.get(event.type);

    listeners?.forEach((listener) => {
      listener(event as RealtimeEvent<RealtimeEventType>);
    });
  }

  private scheduleReconnect() {
    this.clearReconnectTimer();

    const delay =
      RECONNECT_DELAYS_MS[
        Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)
      ];

    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.clearHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send({ type: 'ping' });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
