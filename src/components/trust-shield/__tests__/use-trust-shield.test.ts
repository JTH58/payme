import { renderHook, waitFor } from '@testing-library/react';
import { useTrustShield } from '../use-trust-shield';
import { safeGetItem, safeSetItem } from '@/lib/safe-storage';
import { STORAGE_KEY } from '@/config/storage-keys';

// Mock safe-storage
jest.mock('@/lib/safe-storage', () => ({
  safeGetItem: jest.fn(() => null),
  safeSetItem: jest.fn(() => true),
}));

const mockSafeGetItem = safeGetItem as jest.Mock;
const mockSafeSetItem = safeSetItem as jest.Mock;

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Track env values
const originalEnv = process.env;

describe('useTrustShield', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return unknown when SHA is undefined', async () => {
    delete process.env.NEXT_PUBLIC_COMMIT_SHA;
    const { result } = renderHook(() => useTrustShield());
    await waitFor(() => {
      expect(result.current.status).toBe('unknown');
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return unknown when SHA has invalid format', async () => {
    process.env.NEXT_PUBLIC_COMMIT_SHA = 'not-a-sha!';
    const { result } = renderHook(() => useTrustShield());
    await waitFor(() => {
      expect(result.current.status).toBe('unknown');
    });
  });

  it('should fetch and return verified status', async () => {
    process.env.NEXT_PUBLIC_COMMIT_SHA = 'abc1234';
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ status: 'verified' }),
    });

    const { result } = renderHook(() => useTrustShield());

    expect(result.current.status).toBe('checking');

    await waitFor(() => {
      expect(result.current.status).toBe('verified');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/verify-build?sha=abc1234');
    expect(mockSafeSetItem).toHaveBeenCalledWith(
      STORAGE_KEY.trustShieldCache,
      expect.stringContaining('"status":"verified"')
    );
  });

  it('should use cached result when available and not expired', async () => {
    process.env.NEXT_PUBLIC_COMMIT_SHA = 'abc1234';
    const cacheEntry = {
      status: 'verified',
      sha: 'abc1234',
      timestamp: Date.now(),
    };
    mockSafeGetItem.mockReturnValueOnce(JSON.stringify(cacheEntry));

    const { result } = renderHook(() => useTrustShield());

    await waitFor(() => {
      expect(result.current.status).toBe('verified');
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should ignore expired cache and re-fetch', async () => {
    process.env.NEXT_PUBLIC_COMMIT_SHA = 'abc1234';
    const expiredEntry = {
      status: 'verified',
      sha: 'abc1234',
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
    };
    mockSafeGetItem.mockReturnValueOnce(JSON.stringify(expiredEntry));
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ status: 'verified' }),
    });

    const { result } = renderHook(() => useTrustShield());

    await waitFor(() => {
      expect(result.current.status).toBe('verified');
    });

    expect(mockFetch).toHaveBeenCalled();
  });

  it('should return offline on network error without expired cache', async () => {
    process.env.NEXT_PUBLIC_COMMIT_SHA = 'abc1234';
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTrustShield());

    await waitFor(() => {
      expect(result.current.status).toBe('offline');
    });
  });

  it('should use expired cache status as fallback on network error', async () => {
    process.env.NEXT_PUBLIC_COMMIT_SHA = 'abc1234';
    const expiredEntry = {
      status: 'verified',
      sha: 'abc1234',
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
    };
    // First call (readCache) returns expired → TTL check fails → null
    // Second call (readExpiredCache) returns the expired entry
    mockSafeGetItem
      .mockReturnValueOnce(JSON.stringify(expiredEntry))
      .mockReturnValueOnce(JSON.stringify(expiredEntry));
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTrustShield());

    await waitFor(() => {
      expect(result.current.status).toBe('verified');
    });
  });

  it('should expose sha and buildTime from env', async () => {
    process.env.NEXT_PUBLIC_COMMIT_SHA = 'abc1234';
    process.env.NEXT_PUBLIC_BUILD_TIME = '2026-01-01T00:00:00Z';
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ status: 'verified' }),
    });

    const { result } = renderHook(() => useTrustShield());

    expect(result.current.sha).toBe('abc1234');
    expect(result.current.buildTime).toBe('2026-01-01T00:00:00Z');
  });
});
