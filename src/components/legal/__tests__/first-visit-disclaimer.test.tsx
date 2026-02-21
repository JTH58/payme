import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FirstVisitDisclaimer } from '../first-visit-disclaimer';

// Mock ResizeObserver (required by Radix Dialog)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('FirstVisitDisclaimer', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should show dialog after delay when user has not visited', async () => {
    render(<FirstVisitDisclaimer />);

    // Dialog should not be open yet
    expect(screen.queryByText('安全使用協議')).not.toBeInTheDocument();

    // Advance past the 800ms delay
    act(() => {
      jest.advanceTimersByTime(900);
    });

    expect(screen.getByText('安全使用協議')).toBeInTheDocument();
  });

  it('should NOT show dialog if user has already visited', () => {
    localStorage.setItem('payme_has_visited', 'true');

    render(<FirstVisitDisclaimer />);

    act(() => {
      jest.advanceTimersByTime(900);
    });

    expect(screen.queryByText('安全使用協議')).not.toBeInTheDocument();
  });

  it('should close dialog and set storage on agree', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<FirstVisitDisclaimer />);

    act(() => {
      jest.advanceTimersByTime(900);
    });

    const button = screen.getByText(/接受協議/);
    await user.click(button);

    expect(localStorage.getItem('payme_has_visited')).toBe('true');
  });

  it('should still work when localStorage throws on read', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });

    // Should not crash — safeGetItem returns null, so dialog will show
    render(<FirstVisitDisclaimer />);

    act(() => {
      jest.advanceTimersByTime(900);
    });

    expect(screen.getByText('安全使用協議')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('should still work when localStorage throws on write', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<FirstVisitDisclaimer />);

    act(() => {
      jest.advanceTimersByTime(900);
    });

    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    const button = screen.getByText(/接受協議/);
    // Should not crash
    await user.click(button);

    spy.mockRestore();
  });
});
