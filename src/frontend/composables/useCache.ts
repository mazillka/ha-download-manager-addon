/**
 * Simple LRU Cache implementation for client-side caching
 */
export class LRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 50, ttl: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);

    if (!item) return undefined;

    // Check if item has expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.value;
  }

  set(key: K, value: V): void {
    // Remove oldest item if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // Remove existing entry to update position
    this.cache.delete(key);

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  has(key: K): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Composable for using cache in Vue components
 */
export function useCache<K, V>(maxSize?: number, ttl?: number) {
  const cache = new LRUCache<K, V>(maxSize, ttl);

  return {
    get: (key: K) => cache.get(key),
    set: (key: K, value: V) => cache.set(key, value),
    has: (key: K) => cache.has(key),
    clear: () => cache.clear(),
    delete: (key: K) => cache.delete(key),
    size: () => cache.size,
  };
}
