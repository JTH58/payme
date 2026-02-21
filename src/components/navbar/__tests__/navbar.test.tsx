import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from '../index';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: any) => <img {...props} />,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Navbar', () => {
  it('should render PayMe.tw brand', () => {
    render(<Navbar />);
    expect(screen.getByText(/PayMe/)).toBeInTheDocument();
  });

  it('should have a link to /banks (支援銀行)', () => {
    render(<Navbar />);
    const banksLinks = screen.getAllByText(/支援銀行/);
    expect(banksLinks[0].closest('a')).toHaveAttribute('href', '/banks');
  });

  it('should have a link to /safety (防詐資訊)', () => {
    render(<Navbar />);
    const safetyLinks = screen.getAllByText(/防詐資訊/);
    expect(safetyLinks[0].closest('a')).toHaveAttribute('href', '/safety');
  });

  it('should have a GitHub link', () => {
    render(<Navbar />);
    const githubLinks = screen.getAllByText(/GitHub/i);
    expect(githubLinks[0].closest('a')).toHaveAttribute('href', expect.stringContaining('github.com'));
  });

  it('should have a Threads social link', () => {
    render(<Navbar />);
    const threadsLink = screen.getByLabelText(/Threads/i);
    expect(threadsLink).toHaveAttribute('href', expect.stringContaining('threads.net'));
  });

  it('should toggle mobile menu on hamburger click', async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    // Menu closed initially — mobile links not rendered
    expect(screen.queryByRole('button', { name: /關閉選單/ })).not.toBeInTheDocument();

    // Open menu
    await user.click(screen.getByRole('button', { name: /開啟選單/ }));
    expect(screen.getByRole('button', { name: /關閉選單/ })).toBeInTheDocument();

    // Close menu
    await user.click(screen.getByRole('button', { name: /關閉選單/ }));
    expect(screen.queryByRole('button', { name: /關閉選單/ })).not.toBeInTheDocument();
  });
});
