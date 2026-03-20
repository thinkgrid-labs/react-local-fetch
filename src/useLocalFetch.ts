import { useState, useEffect, useCallback } from 'react';
import { LocalFetchOptions, UseLocalFetchResult } from './types';
import { localFetch } from './fetcher';
import { cacheEmitter } from './events';
import { useLocalFetchContext } from './provider';

/**
 * React hook for resilient, encrypted, local-first fetching.
 */
export function useLocalFetch<T>(
  url: string,
  optionsInput: LocalFetchOptions
): UseLocalFetchResult<T> {
  const globalOptions = useLocalFetchContext();
  const options = { ...globalOptions, ...optionsInput };
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  // Destructure options for stable dependencies
  const { key, version, ttl, encrypt: shouldEncrypt, secret, fallbackToCache, updateStrategy = 'reactive', revalidateOnFocus, revalidateOnReconnect } = options;
  // headers are usually stable or created inline. To avoid deep equality issues, we can just stringify headers
  const headersString = JSON.stringify(options.headers || {});

  const fetchData = useCallback(async (isManual = false) => {
    if (!isManual) setIsLoading(true);
    setError(null);

    try {
      const result = await localFetch<T>(url, options);
      setData(result);
      setIsStale(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [url, key, version, ttl, shouldEncrypt, secret, fallbackToCache, headersString, updateStrategy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (updateStrategy === 'silent') return;

    const unsubscribeCache = cacheEmitter.subscribe(key, () => {
      fetchData(true); // Fetch data without setting isLoading to true
    });

    return unsubscribeCache;
  }, [key, updateStrategy, fetchData]);

  // Global focus/reconnect subscriptions
  useEffect(() => {
    const unsubFocus = cacheEmitter.subscribe('__global_focus', () => {
      if (revalidateOnFocus) fetchData(true);
    });
    
    const unsubReconnect = cacheEmitter.subscribe('__global_reconnect', () => {
      if (revalidateOnReconnect) fetchData(true);
    });

    return () => {
      unsubFocus();
      unsubReconnect();
    };
  }, [revalidateOnFocus, revalidateOnReconnect, fetchData]);

  const revalidate = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    revalidate,
    isStale,
  };
}
