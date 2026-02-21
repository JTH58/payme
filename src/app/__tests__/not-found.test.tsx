import { render, screen } from '@testing-library/react';
import NotFound, { metadata } from '../not-found';

// Mock Navbar and Footer since they need client-side hooks
jest.mock('@/components/navbar', () => ({
  Navbar: () => <nav data-testid="navbar" />,
}));
jest.mock('@/components/footer', () => ({
  Footer: () => <footer data-testid="footer" />,
}));

describe('NotFound Page', () => {
  it('should render 404 heading', () => {
    render(<NotFound />);
    expect(screen.getByText(/404/)).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    render(<NotFound />);
    const homeLink = screen.getByText('建立收款碼');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
    const banksLink = screen.getByText('支援銀行');
    expect(banksLink.closest('a')).toHaveAttribute('href', '/banks');
    const safetyLink = screen.getByText('防詐資訊');
    expect(safetyLink.closest('a')).toHaveAttribute('href', '/safety');
  });

  it('should render Navbar and Footer', () => {
    render(<NotFound />);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('should export metadata with title and description', () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBeTruthy();
    expect(metadata.description).toBeTruthy();
  });
});
