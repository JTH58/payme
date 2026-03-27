import { render, screen } from '@testing-library/react';
import { BankDetail } from '../bank-detail';
import { BankExtended } from '../../types';

// Mock ResizeObserver for Radix Dialog (BankFeedbackButton)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

const verifiedBank: BankExtended = {
  code: '812',
  name: '台新國際商業銀行',
  shortName: '台新銀行',
  status: 'verified',
  officialGuideUrl: 'https://example.com/guide',
  appStoreUrl: 'https://apps.apple.com/example',
  playStoreUrl: 'https://play.google.com/example',
  customerServicePhone: '0800-000-123',
};

const noReportsBank: BankExtended = {
  code: '004',
  name: '臺灣銀行',
  shortName: '臺灣銀行',
  status: 'no_reports',
};

const reportedBank: BankExtended = {
  code: '822',
  name: '中國信託商業銀行',
  shortName: '中國信託',
  status: 'reported_issues',
};

describe('BankDetail', () => {
  it('should display bank name and code', () => {
    render(<BankDetail bank={verifiedBank} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('台新國際商業銀行');
    expect(screen.getByText('812')).toBeInTheDocument();
  });

  it('should display correct status indicator for verified bank', () => {
    render(<BankDetail bank={verifiedBank} />);
    expect(screen.getByText('✅')).toBeInTheDocument();
    expect(screen.getByText(/已驗證/)).toBeInTheDocument();
  });

  it('should display correct status indicator for no_reports bank', () => {
    render(<BankDetail bank={noReportsBank} />);
    expect(screen.getByText('🏦')).toBeInTheDocument();
    expect(screen.getByText(/未收到錯誤回報/)).toBeInTheDocument();
  });

  it('should display correct status indicator for reported_issues bank', () => {
    render(<BankDetail bank={reportedBank} />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();
    expect(screen.getByText(/有問題回報/)).toBeInTheDocument();
  });

  it('should show official guide link when available', () => {
    render(<BankDetail bank={verifiedBank} />);
    const guideLink = screen.getByText(/官方教學/);
    expect(guideLink.closest('a')).toHaveAttribute('href', 'https://example.com/guide');
  });

  it('should NOT show official guide link when not available', () => {
    render(<BankDetail bank={noReportsBank} />);
    expect(screen.queryByText(/官方教學/)).not.toBeInTheDocument();
  });

  it('should show app download links when available', () => {
    render(<BankDetail bank={verifiedBank} />);
    const appStoreLink = screen.getByText(/App Store/);
    expect(appStoreLink.closest('a')).toHaveAttribute('href', 'https://apps.apple.com/example');
    const playStoreLink = screen.getByText(/Google Play/);
    expect(playStoreLink.closest('a')).toHaveAttribute('href', 'https://play.google.com/example');
  });

  it('should render "使用此銀行收款" button linking to /?bankCode={code}', () => {
    render(<BankDetail bank={verifiedBank} />);
    const ctaLink = screen.getByText(/使用此銀行收款/);
    expect(ctaLink.closest('a')).toHaveAttribute('href', '/?bankCode=812');
  });

  it('should render "返回銀行列表" link', () => {
    render(<BankDetail bank={verifiedBank} />);
    const backLink = screen.getByText(/返回銀行列表/);
    expect(backLink.closest('a')).toHaveAttribute('href', '/banks');
  });

  it('should show customer service phone when available', () => {
    render(<BankDetail bank={verifiedBank} />);
    expect(screen.getByText(/0800-000-123/)).toBeInTheDocument();
  });

  it('should render "我要回報問題" as a button (not external link)', () => {
    render(<BankDetail bank={verifiedBank} />);
    const reportButton = screen.getByText(/資訊有誤？我要回報問題/);
    expect(reportButton.tagName).toBe('BUTTON');
  });

  it('should render PayMe.tw 介紹 card with /features link', () => {
    render(<BankDetail bank={verifiedBank} />);
    expect(screen.getByText('關於 PayMe.tw')).toBeInTheDocument();
    const link = screen.getByText('了解更多功能 →');
    expect(link.closest('a')).toHaveAttribute('href', '/features');
  });

  it('should render TWQR 介紹 card with /twqr link and bank name', () => {
    render(<BankDetail bank={verifiedBank} />);
    expect(screen.getByText('什麼是 TWQR？')).toBeInTheDocument();
    expect(screen.getByText(/讓各家銀行 App 都能掃描/)).toBeInTheDocument();
    const link = screen.getByText('了解 TWQR 標準 →');
    expect(link.closest('a')).toHaveAttribute('href', '/twqr');
  });
});
