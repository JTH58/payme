/**
 * Safe access to window.location.hash for easier testing and SSR safety
 */
export const getWindowHash = (): string => {
  if (typeof window === 'undefined') return '';
  return window.location.hash;
};
