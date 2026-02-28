import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FirstVisitDisclaimer } from '../first-visit-disclaimer';

// Mock ResizeObserver (required by Radix Dialog)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('FirstVisitDisclaimer', () => {
  it('should show dialog when open is true', () => {
    render(<FirstVisitDisclaimer open={true} onAccept={jest.fn()} />);

    expect(screen.getByText('第一次使用提醒')).toBeInTheDocument();
    expect(screen.getByText(/歡迎使用/)).toBeInTheDocument();
    expect(screen.getByText('非官方工具聲明')).toBeInTheDocument();
    expect(screen.getByText('絕對隱私')).toBeInTheDocument();
    expect(screen.getByText('使用者責任')).toBeInTheDocument();
  });

  it('should NOT show dialog when open is false', () => {
    render(<FirstVisitDisclaimer open={false} onAccept={jest.fn()} />);

    expect(screen.queryByText('第一次使用提醒')).not.toBeInTheDocument();
  });

  it('should call onAccept when button is clicked', async () => {
    const onAccept = jest.fn();
    const user = userEvent.setup();

    render(<FirstVisitDisclaimer open={true} onAccept={onAccept} />);

    await user.click(screen.getByText(/接受並繼續使用/));

    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});
