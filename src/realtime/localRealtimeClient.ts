import type {
  RealtimeClient,
  RealtimeEvent,
  RealtimeEventType,
  RealtimeScope,
  RealtimeUnsubscribe,
} from './events';

type Listener<T extends RealtimeEventType> = (event: RealtimeEvent<T>) => void;

export class LocalRealtimeClient implements RealtimeClient {
  private listeners = new Map<RealtimeEventType, Set<Listener<RealtimeEventType>>>();

  subscribe<T extends RealtimeEventType>(
    type: T,
    listener: Listener<T>,
  ): RealtimeUnsubscribe {
    const listeners = this.listeners.get(type) ?? new Set();

    listeners.add(listener as Listener<RealtimeEventType>);
    this.listeners.set(type, listeners);

    return () => {
      listeners.delete(listener as Listener<RealtimeEventType>);

      if (listeners.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  publish<T extends RealtimeEventType>(event: RealtimeEvent<T>) {
    const listeners = this.listeners.get(event.type);

    listeners?.forEach((listener) => {
      listener(event as RealtimeEvent<RealtimeEventType>);
    });
  }

  subscribeScope(scope: RealtimeScope): RealtimeUnsubscribe {
    void scope;

    return () => {};
  }

  disconnect() {}
}
