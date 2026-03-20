import { describe, it, expect, vi, beforeEach } from 'vitest';
import { localFetch } from './fetcher';
import * as storage from './storage';

// Mock storage
vi.mock('./storage', () => ({
  getFromStorage: vi.fn(),
  saveToStorage: vi.fn(),
  removeFromStorage: vi.fn(),
  clearAllStorage: vi.fn(),
}));

// Mock fetch
vi.stubGlobal('fetch', vi.fn());

describe('localFetch fetcher', () => {
  const url = 'https://api.example.com/data';
  const options = {
    key: 'test-key',
    version: 1,
    ttl: 3600,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch from network if cache is empty', async () => {
    const uniqueOptions = { ...options, key: 'test-key-1' };
    const mockData = { id: 1, name: 'Test' };
    (storage.getFromStorage as any).mockResolvedValue(undefined);
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await localFetch(url, uniqueOptions);

    expect(result).toEqual(mockData);
    expect(storage.saveToStorage).toHaveBeenCalled();
  });

  it('should return from cache if valid and not expired', async () => {
    const uniqueOptions = { ...options, key: 'test-key-2' };
    const mockData = { id: 1, name: 'Cached' };
    (storage.getFromStorage as any).mockResolvedValue({
      data: mockData,
      metadata: {
        timestamp: Date.now(),
        version: 1,
        isEncrypted: false,
      },
    });

    const result = await localFetch(url, uniqueOptions);

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledTimes(1); // Background revalidation
  });

  it('should clear cache if version is mismatched', async () => {
    const uniqueOptions = { ...options, key: 'test-key-3' };
    const mockData = { id: 2, name: 'New' };
    (storage.getFromStorage as any).mockResolvedValue({
      data: { id: 1, name: 'Old' },
      metadata: {
        timestamp: Date.now(),
        version: 0, // Old version
        isEncrypted: false,
      },
    });
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await localFetch(url, uniqueOptions);

    expect(result).toEqual(mockData);
    expect(storage.saveToStorage).toHaveBeenCalled();
  });
});
