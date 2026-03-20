import { LocalFetchOptions, CacheEntry, CacheMetadata } from './types';
import { getFromStorage, saveToStorage, removeFromStorage } from './storage';
import { encrypt, decrypt } from './crypto';
import { cacheEmitter } from './events';

const isServer = typeof window === 'undefined';
const memoryCache = new Map<string, CacheEntry<any>>();

/**
 * The core fetching engine for react-local-fetch.
 */
export async function localFetch<T>(
  url: string,
  options: LocalFetchOptions
): Promise<T> {
  const {
    key,
    version = 0,
    ttl = 0,
    encrypt: shouldEncrypt = false,
    secret,
    headers = {},
    fallbackToCache = true,
  } = options;

  if (isServer) {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  // 1. Try to get from cache (L1 then L2)
  let cached = memoryCache.get(key) as CacheEntry<T> | undefined;

  if (!cached) {
    cached = await getFromStorage<T>(key);
    if (cached) {
      memoryCache.set(key, cached);
    }
  }

  if (cached) {
    const { metadata, data: storedData } = cached;

    // Check version
    const isVersionValid = metadata.version >= version;

    // Check TTL
    const isTTLExpired = ttl > 0 && Date.now() - metadata.timestamp > ttl * 1000;

    if (isVersionValid && !isTTLExpired) {
      // Return cached data (decrypt if necessary)
      try {
        let finalData: string;
        if (metadata.isEncrypted) {
          if (!secret) throw new Error('Secret is required to decrypt data.');
          finalData = await decrypt(
            storedData as ArrayBuffer,
            secret,
            metadata.salt!,
            metadata.iv!
          );
        } else {
          finalData = typeof storedData === 'string' ? storedData : JSON.stringify(storedData);
        }
        
        // Trigger background sync (revalidate)
        // We don't await this so it returns instantly
        revalidateBackground(url, options);

        return JSON.parse(finalData);
      } catch (err) {
        console.warn('Failed to decrypt or parse cache. Fetching fresh data...', err);
      }
    } else if (isVersionValid && isTTLExpired && fallbackToCache) {
       // Stale data but fallback allowed
       revalidateBackground(url, options);
       
        try {
         let finalData: string;
         if (metadata.isEncrypted) {
           if (!secret) throw new Error('Secret is required to decrypt data.');
           finalData = await decrypt(storedData as ArrayBuffer, secret, metadata.salt!, metadata.iv!);
         } else {
           finalData = typeof storedData === 'string' ? storedData : JSON.stringify(storedData);
         }
         return JSON.parse(finalData);
       } catch (err) {
         // Silently fail and continue to fresh fetch
       }
    }
  }

  // 2. Fetch fresh data
  return await fetchAndStore(url, options);
}

const activeRequests = new Map<string, Promise<any>>();

/**
 * Fetches data from network, encrypts it (if needed), and stores it.
 */
async function fetchAndStore<T>(url: string, options: LocalFetchOptions): Promise<T> {
  const { key, version = 0, encrypt: shouldEncrypt = false, secret, headers = {}, updateStrategy = 'reactive' } = options;
  
  if (activeRequests.has(key)) {
    return activeRequests.get(key) as Promise<T>;
  }

  const promise = (async () => {
    const response = await fetch(url, { headers });
    if (!response.ok) {
       throw new Error(`HTTP error! status: ${response.status}`);
    }
    const freshData = await response.json();
    const jsonString = JSON.stringify(freshData);

    const metadata: CacheMetadata = {
      timestamp: Date.now(),
      version,
      isEncrypted: shouldEncrypt,
    };

    let dataToStore: any;

    if (shouldEncrypt) {
      if (!secret) throw new Error('Secret is required to encrypt data.');
      const { buffer, salt, iv } = await encrypt(jsonString, secret);
      dataToStore = buffer;
      metadata.salt = salt;
      metadata.iv = iv;
    } else {
      dataToStore = freshData;
    }

    const entry: CacheEntry<T> = {
      data: dataToStore,
      metadata,
    };

    memoryCache.set(key, entry);

    try {
      await saveToStorage(key, entry);
    } catch (err) {
      console.warn('Failed to save to local storage', err);
    }

    if (updateStrategy !== 'silent') {
      cacheEmitter.emit(key);
    }

    return freshData;
  })();

  activeRequests.set(key, promise);

  try {
    return await promise;
  } finally {
    activeRequests.delete(key);
  }
}

/**
 * Background revalidation to update the cache without blocking.
 */
async function revalidateBackground(url: string, options: LocalFetchOptions): Promise<void> {
  try {
    await fetchAndStore(url, options);
  } catch (err) {
    console.warn(`Background sync failed for ${url}`, err);
  }
}

/**
 * Mutates the cache for a given key, triggering revalidation in active hooks.
 */
export async function mutate<T>(
  key: string,
  data?: T,
  options?: Partial<LocalFetchOptions>
): Promise<void> {
  if (data !== undefined) {
    const jsonString = JSON.stringify(data);
    let dataToStore: any = data;
    const metadata: CacheMetadata = {
      timestamp: Date.now(),
      version: options?.version || 0,
      isEncrypted: !!options?.encrypt,
    };

    if (options?.encrypt && options?.secret) {
      const { buffer, salt, iv } = await encrypt(jsonString, options.secret);
      dataToStore = buffer;
      metadata.salt = salt;
      metadata.iv = iv;
    }

    const entry: CacheEntry<T> = { data: dataToStore, metadata };

    memoryCache.set(key, entry);
    try {
      await saveToStorage(key, entry);
    } catch (err) {
      console.warn('mutate failed to save to storage', err);
    }
  } else {
    memoryCache.delete(key);
    try {
      await removeFromStorage(key);
    } catch (err) {
      console.warn('mutate failed to remove from storage', err);
    }
  }

  cacheEmitter.emit(key);
}
