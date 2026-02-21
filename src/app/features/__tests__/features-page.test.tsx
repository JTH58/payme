import { render, screen } from '@testing-library/react';
import featuresData from '@/data/features.json';
import FeaturesPage, { metadata } from '../page';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe('Features Page', () => {
  it('should render page title "功能特色"', () => {
    render(<FeaturesPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('功能特色');
  });

  it('should render all highlight titles from JSON', () => {
    render(<FeaturesPage />);
    for (const highlight of featuresData.highlights) {
      expect(screen.getByText(highlight.title)).toBeInTheDocument();
    }
  });

  it('should render all tutorial steps from JSON', () => {
    render(<FeaturesPage />);
    for (const step of featuresData.tutorial.steps) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });

  it('should render all FAQ questions from JSON', () => {
    render(<FeaturesPage />);
    for (const item of featuresData.faq.items) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    }
  });

  it('should have metadata with title and description', () => {
    expect(metadata.title).toContain('功能特色');
    expect(metadata.description).toBeTruthy();
  });

  it('should render JSON-LD FAQPage script tag', () => {
    const { container } = render(<FeaturesPage />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();

    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd['@type']).toBe('FAQPage');
    expect(jsonLd.mainEntity).toHaveLength(featuresData.faq.items.length);
  });

  it('should render CTA link pointing to homepage', () => {
    render(<FeaturesPage />);
    const ctaLink = screen.getByRole('link', { name: /開始使用/ });
    expect(ctaLink).toHaveAttribute('href', '/');
  });
});
