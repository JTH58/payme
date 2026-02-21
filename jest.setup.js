import '@testing-library/jest-dom'

// Web Crypto API polyfill for jest-environment-jsdom
// jsdom 的 crypto.subtle 為 undefined，但 Node.js 18+ 有完整實作
const { webcrypto } = require('node:crypto');
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
});

// jsdom 不提供 TextEncoder/TextDecoder（即使 Node 18+），此 polyfill 仍必要
const { TextEncoder, TextDecoder } = require('node:util');
if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
}
if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextDecoder;
}

// matchMedia mock for jest-environment-jsdom (PWA detection)
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}
