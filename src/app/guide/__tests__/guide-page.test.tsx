import { render, screen } from '@testing-library/react';
import guideData from '@/data/guide.json';
import GuidePage, { metadata } from '../page';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: any) => <img {...props} />,
}));

describe('Guide Page', () => {
  it('should render page title "使用教學"', () => {
    render(<GuidePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('使用教學');
  });

  it('should render all 6 scenario titles from JSON', () => {
    render(<GuidePage />);
    for (const scenario of guideData.scenarios) {
      expect(screen.getByText(scenario.title)).toBeInTheDocument();
    }
  });

  it('should have exactly 6 scenarios in guide data', () => {
    expect(guideData.scenarios.length).toBe(6);
  });

  it('should render section anchors for each scenario', () => {
    const { container } = render(<GuidePage />);
    for (const scenario of guideData.scenarios) {
      const section = container.querySelector(`section#${scenario.id}`);
      expect(section).toBeTruthy();
    }
  });

  it('should render all step titles from JSON', () => {
    render(<GuidePage />);
    for (const scenario of guideData.scenarios) {
      for (const step of scenario.steps) {
        expect(screen.getByText(step.title)).toBeInTheDocument();
      }
    }
  });

  it('should have metadata with title containing "使用教學" and og:url', () => {
    expect(metadata.title).toContain('使用教學');
    expect(metadata.description).toBeTruthy();
    expect((metadata as any).openGraph?.url).toContain('/guide');
  });

  it('should render JSON-LD HowTo script tag', () => {
    const { container } = render(<GuidePage />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();

    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd['@type']).toBe('HowTo');
    expect(jsonLd.step.length).toBeGreaterThan(0);
  });

  it('should render CTA link pointing to homepage', () => {
    render(<GuidePage />);
    const ctaLink = screen.getByRole('link', { name: /前往首頁/ });
    expect(ctaLink).toHaveAttribute('href', '/');
  });
});
