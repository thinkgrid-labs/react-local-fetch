import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLocalFetch } from './useLocalFetch';
import * as fetcherModule from './fetcher';

// Mock the fetcher module
vi.mock('./fetcher', () => ({
  localFetch: vi.fn(),
}));

describe('useLocalFetch hook', () => {
  const url = 'https://api.example.com/data';
  const options = { key: 'test-key' };
  const mockData = { id: 1, name: 'Test Data' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in loading state', async () => {
    (fetcherModule.localFetch as any).mockResolvedValue(mockData);
    
    // Use a slow promise to ensure we can see loading state
    let resolveMock: any;
    const slowPromise = new Promise((resolve) => {
      resolveMock = resolve;
    });
    (fetcherModule.localFetch as any).mockReturnValue(slowPromise);

    const { result } = renderHook(() => useLocalFetch(url, options));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    await act(async () => {
      resolveMock(mockData);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockData);
  });

  it('should handle success state correctly', async () => {
    (fetcherModule.localFetch as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => useLocalFetch(url, options));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should handle error state correctly', async () => {
    const errorMsg = 'Failed to fetch';
    (fetcherModule.localFetch as any).mockRejectedValue(new Error(errorMsg));

    const { result } = renderHook(() => useLocalFetch(url, options));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(errorMsg);
  });

  it('should revalidate when called', async () => {
    (fetcherModule.localFetch as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => useLocalFetch(url, options));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newData = { id: 2, name: 'New Data' };
    (fetcherModule.localFetch as any).mockResolvedValue(newData);

    await act(async () => {
      await result.current.revalidate();
    });

    expect(result.current.data).toEqual(newData);
    expect(fetcherModule.localFetch).toHaveBeenCalledTimes(2);
  });

  it('should re-fetch when options or URL change', async () => {
    (fetcherModule.localFetch as any).mockResolvedValue(mockData);

    const { rerender, result } = renderHook(
      ({ u, o }) => useLocalFetch(u, o),
      {
        initialProps: { u: url, o: options },
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetcherModule.localFetch).toHaveBeenCalledTimes(1);

    const newUrl = 'https://api.example.com/other';
    rerender({ u: newUrl, o: options });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetcherModule.localFetch).toHaveBeenCalledTimes(2);
    expect(fetcherModule.localFetch).toHaveBeenCalledWith(newUrl, options);
  });
});
