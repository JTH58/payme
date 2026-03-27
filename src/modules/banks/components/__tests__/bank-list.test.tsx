import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BankList } from '../bank-list';
import { BankExtended, BankSeoContent } from '../../types';

const baseSeo: BankSeoContent = {
  seoIntro: '測試摘要',
  usageNotes: ['提示 1'],
  faqs: [{ question: 'FAQ？', answer: '答案' }],
  relatedBankCodes: ['004', '012', '013'],
  lastReviewedAt: '2026-03-27',
  statusSummary: '測試狀態摘要',
  scanFeatureHint: '掃碼轉帳',
  officialGuideLabel: '官方教學',
};

const mockBanks: BankExtended[] = [
  { code: '004', name: '臺灣銀行', shortName: '臺灣銀行', status: 'no_reports', seo: baseSeo },
  { code: '012', name: '台北富邦商業銀行', shortName: '富邦銀行', status: 'verified', seo: baseSeo },
  { code: '013', name: '國泰世華商業銀行', shortName: '國泰世華', status: 'no_reports', seo: baseSeo },
  { code: '812', name: '台新國際商業銀行', shortName: '台新銀行', status: 'verified', seo: baseSeo },
  { code: '822', name: '中國信託商業銀行', shortName: '中國信託', status: 'reported_issues', seo: baseSeo },
];

describe('BankList', () => {
  it('should render search input', () => {
    render(<BankList banks={mockBanks} />);
    expect(screen.getByPlaceholderText(/搜尋/)).toBeInTheDocument();
  });

  it('should render all banks initially', () => {
    render(<BankList banks={mockBanks} />);
    expect(screen.getByText('臺灣銀行')).toBeInTheDocument();
    expect(screen.getByText('富邦銀行')).toBeInTheDocument();
    expect(screen.getByText('國泰世華')).toBeInTheDocument();
    expect(screen.getByText('台新銀行')).toBeInTheDocument();
    expect(screen.getByText('中國信託')).toBeInTheDocument();
  });

  it('should filter banks by name when typing in search', async () => {
    const user = userEvent.setup();
    render(<BankList banks={mockBanks} />);

    await user.type(screen.getByPlaceholderText(/搜尋/), '台新');

    expect(screen.getByText('台新銀行')).toBeInTheDocument();
    expect(screen.queryByText('臺灣銀行')).not.toBeInTheDocument();
    expect(screen.queryByText('富邦銀行')).not.toBeInTheDocument();
  });

  it('should filter banks by code when typing in search', async () => {
    const user = userEvent.setup();
    render(<BankList banks={mockBanks} />);

    await user.type(screen.getByPlaceholderText(/搜尋/), '812');

    expect(screen.getByText('台新銀行')).toBeInTheDocument();
    expect(screen.queryByText('臺灣銀行')).not.toBeInTheDocument();
  });

  it('should show empty state when no results match', async () => {
    const user = userEvent.setup();
    render(<BankList banks={mockBanks} />);

    await user.type(screen.getByPlaceholderText(/搜尋/), 'xyz123');

    expect(screen.getByText(/查無符合的銀行/)).toBeInTheDocument();
  });

  it('should display bank code alongside shortName', () => {
    render(<BankList banks={mockBanks} />);
    expect(screen.getByText('004')).toBeInTheDocument();
    expect(screen.getByText('812')).toBeInTheDocument();
  });

  it('should render bank items as links to detail pages', () => {
    render(<BankList banks={mockBanks} />);
    const links = screen.getAllByRole('link');
    const bankLinks = links.filter((link) => link.getAttribute('href')?.startsWith('/banks/'));
    expect(bankLinks.length).toBe(5);
    expect(bankLinks[0]).toHaveAttribute('href', '/banks/004');
  });

  it('should display status indicator for each bank', () => {
    render(<BankList banks={mockBanks} />);
    // verified banks should show ✅, reported_issues should show ⚠️
    expect(screen.getAllByText('✅').length).toBe(2); // 012, 812
    expect(screen.getAllByText('⚠️').length).toBe(1); // 822
    expect(screen.getAllByText('🏦').length).toBe(2); // 004, 013
  });
});
