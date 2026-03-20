import React, { createContext, useContext, useEffect } from 'react';
import { LocalFetchOptions } from './types';
import { cacheEmitter } from './events';
import { localFetch } from './fetcher';

const LocalFetchContext = createContext<Partial<LocalFetchOptions>>({});

export function useLocalFetchContext() {
  return useContext(LocalFetchContext);
}

export interface LocalFetchProviderProps {
  children: React.ReactNode;
  defaultOptions?: Partial<LocalFetchOptions>;
}

export function LocalFetchProvider({ children, defaultOptions = {} }: LocalFetchProviderProps) {
  // Global focus and reconnect listeners
  useEffect(() => {
    if (!defaultOptions.revalidateOnFocus && !defaultOptions.revalidateOnReconnect) {
      return;
    }

    const onFocus = () => {
      if (defaultOptions.revalidateOnFocus) {
        // Broadcast a global revalidation event for all active hooks to pick up.
        // Or we could trigger `revalidate` on all active options.
        // It's cleaner to emit a special event that useLocalFetch listens to.
        cacheEmitter.emit('__global_focus');
      }
    };

    const onOnline = () => {
      if (defaultOptions.revalidateOnReconnect) {
        cacheEmitter.emit('__global_reconnect');
      }
    };

    if (defaultOptions.revalidateOnFocus) {
      window.addEventListener('focus', onFocus);
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') onFocus();
      });
    }

    if (defaultOptions.revalidateOnReconnect) {
      window.addEventListener('online', onOnline);
    }

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [defaultOptions.revalidateOnFocus, defaultOptions.revalidateOnReconnect]);

  return (
    <LocalFetchContext.Provider value={defaultOptions}>
      {children}
    </LocalFetchContext.Provider>
  );
}
