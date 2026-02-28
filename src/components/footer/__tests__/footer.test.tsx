import { render, screen } from '@testing-library/react';
import { Footer } from '../index';

describe('Footer', () => {
  it('should render PayMe.tw brand text', () => {
    render(<Footer />);
    expect(screen.getByText('PayMe.tw')).toBeInTheDocument();
  });

  it('should have GitHub link with aria-label indicating new window', () => {
    render(<Footer />);
    const link = screen.getByLabelText(/在新視窗開啟/);
    expect(link).toHaveAttribute('href', expect.stringContaining('github.com'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('should have internal navigation links', () => {
    render(<Footer />);
    expect(screen.getByText(/首頁/).closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText(/支援銀行/).closest('a')).toHaveAttribute('href', '/banks');
  });

  it('should have a link to /twqr (TWQR 標準)', () => {
    render(<Footer />);
    const twqrLink = screen.getByText(/TWQR 標準/);
    expect(twqrLink.closest('a')).toHaveAttribute('href', '/twqr');
  });

  it('should have a link to /guide (使用教學)', () => {
    render(<Footer />);
    const guideLink = screen.getByText(/使用教學/);
    expect(guideLink.closest('a')).toHaveAttribute('href', '/guide');
  });

  it('should render feedback button when callback is provided', () => {
    const mockFn = jest.fn();
    render(<Footer onFeedbackClick={mockFn} />);
    expect(screen.getByText('意見回饋')).toBeInTheDocument();
  });
});
