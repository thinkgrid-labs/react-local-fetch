export interface LocalFetchOptions {
  /** Unique key for the data in IndexedDB */
  key: string;
  /** Version number for cache invalidation (similar to Zustand) */
  version?: number;
  /** Time-to-live in seconds. 0 or Infinity for no expiry. */
  ttl?: number;
  /** Whether to encrypt data before storing. */
  encrypt?: boolean;
  /** Secret used to derive the encryption key if encrypt is true. */
  secret?: string;
  /** Standard fetch headers for the API request. */
  headers?: Record<string, string>;
  /** Return stale data from cache if the network fetch fails. */
  fallbackToCache?: boolean;
  /** Strategy for updating the UI after a background revalidation.
   * 'silent': Update cache only, UI stays stale until next load.
   * 'reactive': Update UI immediately after background sync completes.
   * Default: 'reactive'
   */
  updateStrategy?: 'silent' | 'reactive';
  /** Revalidate data when the window regains focus. */
  revalidateOnFocus?: boolean;
  /** Revalidate data when the network reconnects. */
  revalidateOnReconnect?: boolean;
}

export interface CacheMetadata {
  timestamp: number;
  version: number;
  isEncrypted: boolean;
  salt?: number[];
  iv?: number[];
}

export interface CacheEntry<T> {
  data: unknown; // Encrypted blob or raw JSON
  metadata: CacheMetadata;
}

export interface UseLocalFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  revalidate: () => Promise<void>;
  isStale: boolean;
}
