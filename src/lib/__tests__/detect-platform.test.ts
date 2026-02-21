import { detectPlatform } from '../detect-platform';

const originalNavigator = global.navigator;

function mockUA(ua: string, maxTouchPoints = 0) {
  Object.defineProperty(global, 'navigator', {
    value: { userAgent: ua, maxTouchPoints },
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  Object.defineProperty(global, 'navigator', {
    value: originalNavigator,
    writable: true,
    configurable: true,
  });
});

describe('detectPlatform', () => {
  it('should detect iPhone as ios', () => {
    mockUA('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)');
    expect(detectPlatform()).toBe('ios');
  });

  it('should detect iPad as ios', () => {
    mockUA('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)');
    expect(detectPlatform()).toBe('ios');
  });

  it('should detect iPadOS 13+ (Macintosh + touch) as ios', () => {
    mockUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5);
    expect(detectPlatform()).toBe('ios');
  });

  it('should detect Android as android', () => {
    mockUA('Mozilla/5.0 (Linux; Android 13; Pixel 7)');
    expect(detectPlatform()).toBe('android');
  });

  it('should detect Windows as desktop', () => {
    mockUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    expect(detectPlatform()).toBe('desktop');
  });

  it('should detect Mac (no touch) as desktop', () => {
    mockUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0);
    expect(detectPlatform()).toBe('desktop');
  });

  it('should detect Linux as desktop', () => {
    mockUA('Mozilla/5.0 (X11; Linux x86_64)');
    expect(detectPlatform()).toBe('desktop');
  });

  it('should return unknown for unrecognized UA', () => {
    mockUA('SomeRandomBot/1.0');
    expect(detectPlatform()).toBe('unknown');
  });

  it('should return unknown when navigator is undefined', () => {
    Object.defineProperty(global, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(detectPlatform()).toBe('unknown');
  });
});
