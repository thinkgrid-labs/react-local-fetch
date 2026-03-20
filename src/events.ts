/**
 * Default internal event emitter for local-fetch cache updates.
 * Used to broadcast revalidation updates to mounted React hooks.
 */

type ListenerCallback = (key: string) => void;

class LocalFetchEventEmitter {
  private listeners = new Map<string, Set<ListenerCallback>>();

  subscribe(key: string, callback: ListenerCallback): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  emit(key: string) {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach((cb) => cb(key));
    }
  }
}

export const cacheEmitter = new LocalFetchEventEmitter();
