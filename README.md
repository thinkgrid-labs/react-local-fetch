# @thinkgrid/react-local-fetch

A lightweight, resilient, and secure data fetching layer for React and Next.js. It implements a **Hydrate-and-Sync (SWR)** pattern using **IndexedDB** for persistence and the **Web Crypto API** for optional hardware-accelerated encryption.

## 🚀 Key Features

- **Instant UI**: Returns cached data immediately while syncing with the API in the background.
- **Hardware Encryption**: Optional AES-GCM 256-bit encryption for sensitive local data.
- **Version-based Invalidation**: Force-clear stale cache when your data schema changes.
- **Next.js Optimized**: Automatically bypasses cache on the server to prevent hydration mismatches and build errors.
- **Resilient**: Gracefully falls back to stale data if the network is down or the API returns an error.
- **Tiny**: < 5KB bundled with zero external dependencies (aside from `idb-keyval`).

## 📦 Installation

```bash
npm install @thinkgrid/react-local-fetch
```

## 🛠️ Usage

### 1. Basic Example (SWR + Persistence)

```tsx
import { useLocalFetch } from '@thinkgrid/react-local-fetch';

function StationList() {
  const { data, isLoading, error } = useLocalFetch('/api/v1/stations', {
    key: 'stations-cache',
    ttl: 86400, // 24 hours
  });

  if (isLoading && !data) return <p>Loading...</p>;
  if (error && !data) return <p>Network Error</p>;

  return (
    <ul>
      {data.map(station => <li key={station.id}>{station.name}</li>)}
    </ul>
  );
}
```

### 2. Advanced Example (Encryption + Versioning)

Best for protecting sensitive metadata or ensuring code-data compatibility across deployments.

```tsx
const { data } = useLocalFetch('/api/v1/user/private-routes', {
  key: 'user-routes',
  version: 2,           // Increment this to nuke old caches
  encrypt: true,        // Toggle AES-GCM encryption
  secret: 'my-secret',  // Used to derive encryption key
  fallbackToCache: true, // Use old data if API fails
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 3. Integration with TanStack Query (React Query)

You can use the core `localFetch` function inside your `queryFn` to gain encryption and persistent SWR while keeping React Query's powerful features (caching, window focus refetching, etc).

```tsx
import { useQuery } from '@tanstack/react-query';
import { localFetch } from '@thinkgrid/react-local-fetch';

function useSecureStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: () => localFetch('/api/v1/stations', {
      key: 'stations-persistent-db',
      encrypt: true,
      secret: process.env.NEXT_PUBLIC_CRYPTO_SECRET,
      version: 1, // Automatic cache busting on deployment
      ttl: 3600 * 24 // 24h
    })
  });
}
```

### 4. Manual Cache Management

Sometimes you need to manually clear items (e.g., on logout) or remove specific keys.

```tsx
import { removeFromStorage, clearAllStorage } from '@thinkgrid/react-local-fetch';

// Remove a specific item
await removeFromStorage('user-routes');

// Clear ALL data stored by this package
await clearAllStorage();
```

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `key` | `string` | **Required** | Unique ID for the data in IndexedDB. |
| `version` | `number` | `0` | If the stored version is lower than this, the cache is cleared. |
| `ttl` | `number` | `0` | Time-to-live in seconds. `0` means forever. |
| `encrypt` | `boolean` | `false` | Whether to encrypt data before storing. |
| `secret` | `string` | `undefined` | The string used to derive the AES key (required if `encrypt: true`). |
| `headers` | `object` | `{}` | Standard fetch headers. |
| `fallbackToCache` | `boolean` | `true` | If `true`, returns stale data if network fetch fails. |

## 📐 Architecture: The "Hydrate-and-Sync" Pattern

1. **Initial Load**: Check IndexedDB. If data exists, return it instantly to the UI (0ms latency).
2. **Background Fetch**: Trigger a non-blocking API call.
3. **Silent Update**: If the API returns new data, update IndexedDB and the UI state automatically.
4. **Resilience**: If the user is offline or the API is down, the UI stays functional using the last known good data.

## 👥 Contributors

- **Dennis P.** ([dennis@thinkgrid.dev](mailto:dennis@thinkgrid.dev)) 

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [thinkgrid-labs](https://github.com/thinkgrid-labs)
