import {
  trackEvent,
  getEvents,
  clearEvents,
  serializeEvents,
  deserializeEvents,
  flushEventsToCookie,
  setupAutoFlush,
  ANALYTICS_EVENTS,
} from '../analytics';

// ---------------------------------------------------------------------------
// localStorage mock (same pattern as backup.test.ts)
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// document.cookie mock
let cookieStore = '';
Object.defineProperty(document, 'cookie', {
  get: () => cookieStore,
  set: (v: string) => { cookieStore = v; },
  configurable: true,
});

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
  cookieStore = '';
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// trackEvent
// ---------------------------------------------------------------------------
describe('trackEvent', () => {
  test('stores event in localStorage', () => {
    trackEvent('generate_link');
    const events = getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].e).toBe('generate_link');
    expect(typeof events[0].t).toBe('number');
  });

  test('stores event with data', () => {
    trackEvent('share', { method: 'native' });
    const events = getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].d).toEqual({ method: 'native' });
  });

  test('accumulates multiple events', () => {
    trackEvent('generate_link');
    trackEvent('copy_link');
    trackEvent('share');
    expect(getEvents()).toHaveLength(3);
  });

  test('FIFO: removes oldest when exceeding MAX_EVENTS (50)', () => {
    for (let i = 0; i < 55; i++) {
      trackEvent('generate_link');
    }
    expect(getEvents()).toHaveLength(50);
  });

  test('ignores unknown event names', () => {
    trackEvent('unknown_event');
    expect(getEvents()).toHaveLength(0);
  });

  test('does not throw when localStorage fails', () => {
    localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
    expect(() => trackEvent('generate_link')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getEvents
// ---------------------------------------------------------------------------
describe('getEvents', () => {
  test('returns [] when no events', () => {
    expect(getEvents()).toEqual([]);
  });

  test('returns stored events', () => {
    trackEvent('generate_link');
    trackEvent('copy_link');
    const events = getEvents();
    expect(events).toHaveLength(2);
  });

  test('corrupt JSON returns [] and clears storage', () => {
    localStorageMock.setItem('payme_analytics', 'not-json');
    expect(getEvents()).toEqual([]);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('payme_analytics');
  });
});

// ---------------------------------------------------------------------------
// clearEvents
// ---------------------------------------------------------------------------
describe('clearEvents', () => {
  test('clears all events', () => {
    trackEvent('generate_link');
    clearEvents();
    expect(getEvents()).toEqual([]);
  });

  test('removes localStorage key', () => {
    trackEvent('generate_link');
    clearEvents();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('payme_analytics');
  });
});

// ---------------------------------------------------------------------------
// serializeEvents / deserializeEvents
// ---------------------------------------------------------------------------
describe('serializeEvents / deserializeEvents', () => {
  test('empty array returns empty string', () => {
    expect(serializeEvents([])).toBe('');
  });

  test('single event round-trip', () => {
    const events = [{ e: 'generate_link', t: 1234567890 }];
    const encoded = serializeEvents(events);
    expect(encoded.length).toBeGreaterThan(0);
    expect(deserializeEvents(encoded)).toEqual(events);
  });

  test('multiple events with data round-trip', () => {
    const events = [
      { e: 'generate_link', t: 100 },
      { e: 'share', t: 200, d: { method: 'native' } },
    ];
    const encoded = serializeEvents(events);
    expect(deserializeEvents(encoded)).toEqual(events);
  });

  test('deserialize empty string returns []', () => {
    expect(deserializeEvents('')).toEqual([]);
  });

  test('deserialize corrupt string returns []', () => {
    expect(deserializeEvents('not-valid!!!')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// flushEventsToCookie
// ---------------------------------------------------------------------------
describe('flushEventsToCookie', () => {
  test('sets cookie when events exist', () => {
    trackEvent('generate_link');
    flushEventsToCookie();
    expect(cookieStore).toContain('_pa=');
    expect(cookieStore).toContain('Path=/');
    expect(cookieStore).toContain('SameSite=Lax');
  });

  test('does not set cookie when no events', () => {
    flushEventsToCookie();
    expect(cookieStore).toBe('');
  });

  test('clears localStorage after flush', () => {
    trackEvent('generate_link');
    flushEventsToCookie();
    expect(getEvents()).toEqual([]);
  });

  test('truncates oldest events when exceeding 3.5KB', () => {
    // Create events with large data to exceed cookie limit
    for (let i = 0; i < 50; i++) {
      trackEvent('generate_link', { bigData: 'x'.repeat(100) });
    }
    flushEventsToCookie();
    // Cookie was set (truncated)
    expect(cookieStore).toContain('_pa=');
    // Verify the serialized payload is within limit
    const paValue = cookieStore.split('_pa=')[1].split(';')[0];
    expect(paValue.length).toBeLessThanOrEqual(3500);
  });
});

// ---------------------------------------------------------------------------
// setupAutoFlush
// ---------------------------------------------------------------------------
describe('setupAutoFlush', () => {
  test('adds visibilitychange listener', () => {
    const addSpy = jest.spyOn(document, 'addEventListener');
    const cleanup = setupAutoFlush();
    expect(addSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    cleanup();
    addSpy.mockRestore();
  });

  test('triggers flush when document becomes hidden', () => {
    trackEvent('generate_link');
    const cleanup = setupAutoFlush();
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cookieStore).toContain('_pa=');
    cleanup();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  test('does not flush when document becomes visible', () => {
    trackEvent('generate_link');
    const cleanup = setupAutoFlush();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cookieStore).toBe('');
    cleanup();
  });

  test('cleanup removes listener', () => {
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    const cleanup = setupAutoFlush();
    cleanup();
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    removeSpy.mockRestore();
  });
});
