import { renderHook, act } from '@testing-library/react';
import { usePwaStatus } from '../use-pwa-status';

// Track event listeners
const eventListeners: Record<string, Function[]> = {};

// Mock matchMedia
const mockMatches = jest.fn(() => false);
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: mockMatches(),
    media: query,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Override addEventListener/removeEventListener to capture handlers
window.addEventListener = jest.fn((event: string, handler: any) => {
  if (!eventListeners[event]) eventListeners[event] = [];
  eventListeners[event].push(handler);
}) as any;

window.removeEventListener = jest.fn((event: string, handler: any) => {
  if (eventListeners[event]) {
    eventListeners[event] = eventListeners[event].filter(h => h !== handler);
  }
}) as any;

function fireEvent(name: string, detail?: any) {
  const handlers = eventListeners[name] || [];
  const event = { ...new Event(name), ...detail, preventDefault: jest.fn() };
  handlers.forEach(h => h(event));
}

// Mock safe-storage
const mockStorage: Record<string, string> = {};
jest.mock('@/lib/safe-storage', () => ({
  safeGetItem: jest.fn((key: string) => mockStorage[key] ?? null),
  safeSetItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return true;
  }),
}));

describe('usePwaStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(eventListeners).forEach(key => delete eventListeners[key]);
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    mockMatches.mockReturnValue(false);
    (navigator as any).standalone = undefined;
  });

  it('should detect non-installed state by default', () => {
    const { result } = renderHook(() => usePwaStatus());
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.canPromptInstall).toBe(false);
  });

  it('should detect standalone mode via matchMedia', () => {
    mockMatches.mockReturnValue(true);
    const { result } = renderHook(() => usePwaStatus());
    expect(result.current.isInstalled).toBe(true);
  });

  it('should detect iOS standalone mode', () => {
    (navigator as any).standalone = true;
    const { result } = renderHook(() => usePwaStatus());
    expect(result.current.isInstalled).toBe(true);
  });

  it('should capture beforeinstallprompt event', () => {
    const { result } = renderHook(() => usePwaStatus());
    expect(result.current.canPromptInstall).toBe(false);

    act(() => {
      fireEvent('beforeinstallprompt');
    });

    expect(result.current.canPromptInstall).toBe(true);
  });

  it('should handle appinstalled event', () => {
    const { result } = renderHook(() => usePwaStatus());

    act(() => {
      fireEvent('appinstalled');
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canPromptInstall).toBe(false);
  });

  it('should call prompt on promptInstall', async () => {
    const mockPrompt = jest.fn();
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const });

    const { result } = renderHook(() => usePwaStatus());

    // Simulate beforeinstallprompt with prompt/userChoice
    act(() => {
      const handlers = eventListeners['beforeinstallprompt'] || [];
      const event = {
        preventDefault: jest.fn(),
        prompt: mockPrompt,
        userChoice: mockUserChoice,
      };
      handlers.forEach(h => h(event));
    });

    expect(result.current.canPromptInstall).toBe(true);

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(mockPrompt).toHaveBeenCalled();
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canPromptInstall).toBe(false);
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() => usePwaStatus());
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalled();
  });

  // --- Badge tests ---

  it('should show badge when not installed and not dismissed', () => {
    const { result } = renderHook(() => usePwaStatus());
    expect(result.current.showBadge).toBe(true);
  });

  it('should hide badge when dismissed within 7 days', () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    mockStorage['pwa_prompt_dismissed'] = String(threeDaysAgo);

    const { result } = renderHook(() => usePwaStatus());
    expect(result.current.showBadge).toBe(false);
  });

  it('should show badge when dismiss expired (8 days ago)', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    mockStorage['pwa_prompt_dismissed'] = String(eightDaysAgo);

    const { result } = renderHook(() => usePwaStatus());
    expect(result.current.showBadge).toBe(true);
  });

  it('should hide badge when already installed', () => {
    mockMatches.mockReturnValue(true);
    const { result } = renderHook(() => usePwaStatus());
    expect(result.current.showBadge).toBe(false);
  });

  it('should dismiss badge and write to localStorage', () => {
    const { safeSetItem } = require('@/lib/safe-storage');
    const { result } = renderHook(() => usePwaStatus());
    expect(result.current.showBadge).toBe(true);

    act(() => {
      result.current.dismissBadge();
    });

    expect(result.current.showBadge).toBe(false);
    expect(safeSetItem).toHaveBeenCalledWith('pwa_prompt_dismissed', expect.any(String));
  });

  it('should hide badge on appinstalled event', () => {
    const { result } = renderHook(() => usePwaStatus());
    expect(result.current.showBadge).toBe(true);

    act(() => {
      fireEvent('appinstalled');
    });

    expect(result.current.showBadge).toBe(false);
  });
});
