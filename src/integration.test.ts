import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { localFetch } from './fetcher';
import { clearAllStorage, getFromStorage } from './storage';

// Mock fetch
vi.stubGlobal('fetch', vi.fn());

describe('Integration: localFetch full flow', () => {
  const url = 'https://api.example.com/data';
  const secret = 'test-secret-key-1234567890123456'; // 32 chars for AES-GCM
  const mockData = { message: 'Integration test success!', timestamp: Date.now() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await clearAllStorage();
  });

  it('should fetch from network, encrypt, and store in IndexedDB on first call', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await localFetch(url, {
      key: 'integration-test',
      encrypt: true,
      secret,
    });

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledTimes(1);

    // Verify it was stored in IndexedDB (encrypted)
    const stored = await getFromStorage('integration-test');
    expect(stored).toBeDefined();
    expect(stored?.metadata.isEncrypted).toBe(true);
    expect(stored?.data).toBeDefined();
    // In some environments it might be a Uint8Array or ArrayBuffer
    expect((stored?.data as any).byteLength).toBeGreaterThan(0);
    expect(stored?.metadata.salt).toBeDefined();
    expect(stored?.metadata.iv).toBeDefined();
  });

  it('should retrieve from IndexedDB and decrypt on subsequent call', async () => {
    // 1. First call to populate cache
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    await localFetch(url, {
      key: 'integration-test-2',
      encrypt: true,
      secret,
    });

    vi.clearAllMocks();

    // 2. Second call should hit the cache
    // We mock fetch for the background revalidation, but it shouldn't block the return
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...mockData, revalidated: true }),
    });

    const result = await localFetch(url, {
      key: 'integration-test-2',
      encrypt: true,
      secret,
      ttl: 3600, // Valid for an hour
    });

    expect(result).toEqual(mockData); // Should return cached data
    expect(fetch).toHaveBeenCalled(); // Background revalidation still happens
  });

  it('should handle version mismatch by clearing cache and fetching fresh', async () => {
    // 1. Populate cache with version 1
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: 1 }),
    });

    await localFetch(url, {
      key: 'version-test',
      version: 1,
    });

    vi.clearAllMocks();

    // 2. Request with version 2
    const newData = { version: 2 };
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(newData),
    });

    const result = await localFetch(url, {
      key: 'version-test',
      version: 2,
    });

    expect(result).toEqual(newData);
    expect(fetch).toHaveBeenCalled();
    
    // Verify cache updated to version 2
    const stored = await getFromStorage('version-test');
    expect(stored?.metadata.version).toBe(2);
  });
});
