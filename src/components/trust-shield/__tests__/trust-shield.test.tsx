import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrustShield } from '../index';
import * as hook from '../use-trust-shield';

// Mock the hook
jest.mock('../use-trust-shield');
const mockUseTrustShield = hook.useTrustShield as jest.MockedFunction<typeof hook.useTrustShield>;

describe('TrustShield', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_GITHUB_REPO = 'JTH58/payme';
  });

  it('should render checking state', () => {
    mockUseTrustShield.mockReturnValue({
      status: 'checking',
      sha: 'abc1234',
      buildTime: undefined,
    });

    render(<TrustShield />);
    expect(screen.getByLabelText('開源透明校驗')).toBeInTheDocument();
    expect(screen.getByText('abc1234')).toBeInTheDocument();
  });

  it('should render dev when sha is undefined', () => {
    mockUseTrustShield.mockReturnValue({
      status: 'unknown',
      sha: undefined,
      buildTime: undefined,
    });

    render(<TrustShield />);
    expect(screen.getByText('dev')).toBeInTheDocument();
  });

  it('should show popover with verified details on click', async () => {
    mockUseTrustShield.mockReturnValue({
      status: 'verified',
      sha: 'abc1234def5678',
      buildTime: '2026-01-01T00:00:00Z',
    });

    const user = userEvent.setup();
    render(<TrustShield />);

    await user.click(screen.getByLabelText('開源透明校驗'));

    expect(screen.getByText('開源版本已校驗')).toBeInTheDocument();
    expect(screen.getByText('此版本與開源主分支一致，程式碼公開透明。')).toBeInTheDocument();
    // SHA appears in both trigger and popover; verify the font-mono one in popover
    const shaElements = screen.getAllByText('abc1234');
    expect(shaElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('建構時間: 2026-01-01T00:00:00Z')).toBeInTheDocument();
    expect(screen.getByText('查看原始碼 →')).toHaveAttribute(
      'href',
      'https://github.com/JTH58/payme/commit/abc1234def5678'
    );
  });

  it('should show offline state', async () => {
    mockUseTrustShield.mockReturnValue({
      status: 'offline',
      sha: 'abc1234',
      buildTime: undefined,
    });

    const user = userEvent.setup();
    render(<TrustShield />);
    await user.click(screen.getByLabelText('開源透明校驗'));

    expect(screen.getByText('離線模式')).toBeInTheDocument();
  });

  it('should show tampered state', async () => {
    mockUseTrustShield.mockReturnValue({
      status: 'tampered',
      sha: 'abc1234',
      buildTime: undefined,
    });

    const user = userEvent.setup();
    render(<TrustShield />);
    await user.click(screen.getByLabelText('開源透明校驗'));

    expect(screen.getByText('版本與紀錄不符')).toBeInTheDocument();
    expect(screen.getByText('此版本與開源紀錄不符，請謹慎使用。')).toBeInTheDocument();
  });
});
