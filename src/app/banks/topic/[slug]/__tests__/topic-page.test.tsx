import { render, screen } from '@testing-library/react';
import BankTopicPage, { generateMetadata, generateStaticParams } from '../page';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe('Bank Topic Page', () => {
  it('should expose static params for topic routes', async () => {
    const params = await generateStaticParams();
    expect(params.length).toBeGreaterThan(0);
    expect(params.some((item) => item.slug === 'popular-banks')).toBe(true);
  });

  it('should generate metadata for a topic page', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'popular-banks' }) });
    expect(metadata.title).toContain('熱門銀行');
    expect(metadata.alternates?.canonical).toBe('/banks/topic/popular-banks');
  });

  it('should render topic title, bank list and learning links', async () => {
    const Page = await BankTopicPage({ params: Promise.resolve({ slug: 'popular-banks' }) });
    const { container } = render(Page);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('熱門銀行 TWQR 使用整理');
    expect(screen.getByText('此主題下的銀行與機構')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /返回支援銀行列表/ })).toHaveAttribute('href', '/banks');
    expect(screen.getByRole('link', { name: /開始使用 PayMe.tw/ })).toHaveAttribute('href', '/');

    const scripts = Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
    expect(scripts).toHaveLength(3);
  });
});
