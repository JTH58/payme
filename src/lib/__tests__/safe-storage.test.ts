import { safeGetItem, safeSetItem, safeRemoveItem } from '../safe-storage';

describe('safe-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('safeGetItem', () => {
    it('should return value for existing key', () => {
      localStorage.setItem('test', 'hello');
      expect(safeGetItem('test')).toBe('hello');
    });

    it('should return null for missing key', () => {
      expect(safeGetItem('nonexistent')).toBeNull();
    });

    it('should return null when localStorage throws', () => {
      const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('SecurityError');
      });
      expect(safeGetItem('test')).toBeNull();
      spy.mockRestore();
    });
  });

  describe('safeSetItem', () => {
    it('should write value and return true', () => {
      expect(safeSetItem('key', 'val')).toBe(true);
      expect(localStorage.getItem('key')).toBe('val');
    });

    it('should return false when localStorage throws', () => {
      const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      expect(safeSetItem('key', 'val')).toBe(false);
      spy.mockRestore();
    });
  });

  describe('safeRemoveItem', () => {
    it('should remove key and return true', () => {
      localStorage.setItem('key', 'val');
      expect(safeRemoveItem('key')).toBe(true);
      expect(localStorage.getItem('key')).toBeNull();
    });

    it('should return false when localStorage throws', () => {
      const spy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new DOMException('SecurityError');
      });
      expect(safeRemoveItem('key')).toBe(false);
      spy.mockRestore();
    });
  });
});
