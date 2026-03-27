import { render, screen } from '@testing-library/react';
import BanksPage, { metadata } from '../page';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe('Banks Page', () => {
  it('should render page title and major hub sections', () => {
    render(<BanksPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('TWQR 支援銀行列表與熱門銀行查詢');
    expect(screen.getByText('熱門銀行入口')).toBeInTheDocument();
    expect(screen.getByText('銀行分類總覽')).toBeInTheDocument();
    expect(screen.getByText('完整銀行與支付機構列表')).toBeInTheDocument();
    expect(screen.getByText('常見問題')).toBeInTheDocument();
  });

  it('should render metadata with canonical-friendly title and description', () => {
    expect(metadata.title).toContain('TWQR 支援銀行列表');
    expect(metadata.description).toBeTruthy();
    expect(metadata.alternates?.canonical).toBe('/banks');
  });

  it('should render popular bank links and learning links', () => {
    render(<BanksPage />);
    const links = screen.getAllByRole('link');
    expect(links.some((link) => link.getAttribute('href') === '/banks/812')).toBe(true);
    expect(links.some((link) => link.getAttribute('href') === '/banks/822')).toBe(true);
    expect(screen.getByRole('link', { name: /了解 TWQR 標準/ })).toHaveAttribute('href', '/twqr');
    expect(screen.getByRole('link', { name: /開始使用 PayMe.tw/ })).toHaveAttribute('href', '/');
  });

  it('should render JSON-LD ItemList and FAQPage scripts', () => {
    const { container } = render(<BanksPage />);
    const scripts = Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
    expect(scripts).toHaveLength(2);

    const payloads = scripts.map((script) => JSON.parse(script.textContent || '{}'));
    expect(payloads.some((item) => item['@type'] === 'ItemList')).toBe(true);
    expect(payloads.some((item) => item['@type'] === 'FAQPage')).toBe(true);
  });
});
