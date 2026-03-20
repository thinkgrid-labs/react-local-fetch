import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { saveToStorage, getFromStorage, removeFromStorage, clearAllStorage } from './storage';

describe('storage utility', () => {
  const testKey = 'test-key';
  const testData = { id: 1, name: 'Sample Data' };
  const testEntry = {
    data: testData,
    metadata: {
      timestamp: Date.now(),
      version: 1,
      isEncrypted: false,
    },
  };

  beforeEach(async () => {
    await clearAllStorage();
  });

  it(' should save and retrieve data correctly', async () => {
    await saveToStorage(testKey, testEntry);
    const retrieved = await getFromStorage(testKey);
    expect(retrieved).toEqual(testEntry);
  });

  it('should return undefined for non-existent key', async () => {
    const retrieved = await getFromStorage('non-existent');
    expect(retrieved).toBeUndefined();
  });

  it('should remove data correctly', async () => {
    await saveToStorage(testKey, testEntry);
    await removeFromStorage(testKey);
    const retrieved = await getFromStorage(testKey);
    expect(retrieved).toBeUndefined();
  });

  it('should clear all data', async () => {
    await saveToStorage('key1', testEntry);
    await saveToStorage('key2', testEntry);
    await clearAllStorage();
    
    expect(await getFromStorage('key1')).toBeUndefined();
    expect(await getFromStorage('key2')).toBeUndefined();
  });

  it('should handle undefined window gracefully (SSR simulation)', async () => {
    // This is a bit tricky to test because vitest/jsdom might already have window defined.
    // But we can check if the functions don't throw if we temporarily "hide" window if possible.
    // Or just rely on the code check if (typeof window === 'undefined') return;
    
    const originalWindow = globalThis.window;
    // @ts-ignore
    delete globalThis.window;
    
    expect(await getFromStorage(testKey)).toBeUndefined();
    await saveToStorage(testKey, testEntry); // should not throw
    
    // Restore window
    globalThis.window = originalWindow;
  });
});
