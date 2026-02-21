import { render, screen } from '@testing-library/react';
import safetyData from '@/data/safety.json';
import SafetyPage, { metadata } from '../page';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe('Safety Page', () => {
  it('should render page title "防詐資訊"', () => {
    render(<SafetyPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('防詐資訊');
  });

  it('should render all section titles from JSON', () => {
    render(<SafetyPage />);
    for (const section of safetyData.sections) {
      expect(screen.getByText(section.title)).toBeInTheDocument();
    }
  });

  it('should render 165 hotline callout', () => {
    render(<SafetyPage />);
    const hotlineLink = screen.getByRole('link', { name: '165' });
    expect(hotlineLink).toHaveAttribute('href', 'tel:165');
    expect(screen.getAllByText(/反詐騙諮詢專線/).length).toBeGreaterThanOrEqual(1);
  });

  it('should have metadata with title and description', () => {
    expect(metadata.title).toContain('防詐資訊');
    expect(metadata.description).toBeTruthy();
  });

  it('should render JSON-LD FAQPage script tag', () => {
    const { container } = render(<SafetyPage />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();

    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd['@type']).toBe('FAQPage');

    const sectionsWithFaq = safetyData.sections.filter((s) => s.faq);
    expect(jsonLd.mainEntity).toHaveLength(sectionsWithFaq.length);
  });
});
