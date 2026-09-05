/**
 * Small caches for the search page: an in-memory LRU for the current session
 * (instant back/forward and repeated queries) plus a bounded sessionStorage
 * copy of the most recent first pages so returning to `/search?q=…` from a
 * poem doesn't refetch.
 */
export class LruCache<V> {
  private readonly map = new Map<string, V>();

  constructor(private readonly maxEntries: number) {}

  get(key: string): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: string, value: V) {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.map.delete(oldest);
    }
  }

  has(key: string) {
    return this.map.has(key);
  }
}

interface SessionEntry<V> {
  key: string;
  savedAt: number;
  value: V;
}

const MAX_SESSION_BYTES = 900_000;

export const createSessionCache = <V>(storageKey: string, maxEntries: number) => {
  const read = (): SessionEntry<V>[] => {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as SessionEntry<V>[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const write = (entries: SessionEntry<V>[]) => {
    if (typeof window === "undefined") {
      return;
    }
    let next = entries;
    while (next.length > 0) {
      const serialized = JSON.stringify(next);
      if (serialized.length <= MAX_SESSION_BYTES) {
        try {
          window.sessionStorage.setItem(storageKey, serialized);
        } catch {
          // Storage full or unavailable: silently keep memory-only caching.
        }
        return;
      }
      next = next.slice(0, -1);
    }
  };

  return {
    get(key: string): V | null {
      const entry = read().find((item) => item.key === key);
      return entry ? entry.value : null;
    },
    set(key: string, value: V) {
      const entries = read().filter((item) => item.key !== key);
      write(
        [{ key, savedAt: Date.now(), value }, ...entries].slice(0, maxEntries),
      );
    },
  };
};
