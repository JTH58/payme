import { render, screen } from '@testing-library/react';
import twqrData from '@/data/twqr.json';
import TwqrPage, { metadata } from '../page';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe('TWQR Page', () => {
  it('should render page title "TWQR 台灣共用支付碼"', () => {
    render(<TwqrPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('TWQR 台灣共用支付碼');
  });

  it('should render all section titles from JSON', () => {
    render(<TwqrPage />);
    for (const section of twqrData.sections) {
      expect(screen.getByText(section.title)).toBeInTheDocument();
    }
  });

  it('should render all howItWorks steps from JSON', () => {
    render(<TwqrPage />);
    for (const step of twqrData.howItWorks.steps) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });

  it('should render all feature titles from JSON', () => {
    render(<TwqrPage />);
    for (const feature of twqrData.features) {
      expect(screen.getByText(feature.title)).toBeInTheDocument();
    }
  });

  it('should render all FAQ questions from JSON', () => {
    render(<TwqrPage />);
    for (const item of twqrData.faq.items) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    }
  });

  it('should have metadata with title and description', () => {
    expect(metadata.title).toContain('TWQR');
    expect(metadata.description).toBeTruthy();
  });

  it('should render JSON-LD FAQPage script tag', () => {
    const { container } = render(<TwqrPage />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();

    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd['@type']).toBe('FAQPage');
    expect(jsonLd.mainEntity).toHaveLength(twqrData.faq.items.length);
  });

  it('should render CTA link pointing to homepage', () => {
    render(<TwqrPage />);
    const ctaLink = screen.getByRole('link', { name: /開始使用/ });
    expect(ctaLink).toHaveAttribute('href', '/');
  });
});
