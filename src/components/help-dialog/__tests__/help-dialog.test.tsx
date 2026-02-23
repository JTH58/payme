import { render, screen, fireEvent } from '@testing-library/react';
import { HelpDialog } from '..';

// ResizeObserver (Radix Dialog 需要)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe('HelpDialog', () => {
  it('should show scenario title and description when open', () => {
    render(
      <HelpDialog open onOpenChange={() => {}} scenarioId="split-bill" />
    );
    expect(screen.getByText('分帳收款')).toBeInTheDocument();
    expect(screen.getByText(/自動計算每人應付金額/)).toBeInTheDocument();
  });

  it('should render GIF image with correct src', () => {
    render(
      <HelpDialog open onOpenChange={() => {}} scenarioId="split-bill" />
    );
    const img = screen.getByAltText('分帳收款');
    expect(img).toHaveAttribute('src', '/guide/split-bill.gif');
  });

  it('should render link to /guide#scenarioId', () => {
    render(
      <HelpDialog open onOpenChange={() => {}} scenarioId="split-bill" />
    );
    const link = screen.getByText(/查看完整教學/);
    expect(link.closest('a')).toHaveAttribute('href', '/guide#split-bill');
  });

  it('should not render when open is false', () => {
    render(
      <HelpDialog open={false} onOpenChange={() => {}} scenarioId="split-bill" />
    );
    expect(screen.queryByText('分帳收款')).not.toBeInTheDocument();
  });

  it('should show placeholder on GIF load error', () => {
    render(
      <HelpDialog open onOpenChange={() => {}} scenarioId="split-bill" />
    );
    const img = screen.getByAltText('分帳收款');
    fireEvent.error(img);
    expect(screen.getByText('圖片載入失敗')).toBeInTheDocument();
  });

  it('should render scenario description text', () => {
    render(
      <HelpDialog open onOpenChange={() => {}} scenarioId="basic-payment" />
    );
    expect(screen.getByText('基本收款')).toBeInTheDocument();
    expect(screen.getByText(/一秒產生收款 QR Code/)).toBeInTheDocument();
  });
});
