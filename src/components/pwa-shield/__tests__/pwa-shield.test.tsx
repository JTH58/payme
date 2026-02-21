import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PwaShield } from '../index';
import * as hook from '@/hooks/use-pwa-status';
import * as detectPlatformModule from '@/lib/detect-platform';

jest.mock('@/hooks/use-pwa-status');
jest.mock('@/lib/detect-platform');

const mockUsePwaStatus = hook.usePwaStatus as jest.MockedFunction<typeof hook.usePwaStatus>;
const mockDetectPlatform = detectPlatformModule.detectPlatform as jest.MockedFunction<typeof detectPlatformModule.detectPlatform>;

function mockHook(overrides: Partial<ReturnType<typeof hook.usePwaStatus>> = {}) {
  mockUsePwaStatus.mockReturnValue({
    isInstalled: false,
    canPromptInstall: false,
    promptInstall: jest.fn(),
    showBadge: false,
    dismissBadge: jest.fn(),
    ...overrides,
  });
}

describe('PwaShield', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDetectPlatform.mockReturnValue('desktop');
  });

  // --- Original tests ---

  it('should render not-installed state', () => {
    mockHook();
    render(<PwaShield />);
    expect(screen.getByLabelText('PWA 安裝狀態')).toBeInTheDocument();
  });

  it('should show install prompt popover when not installed', async () => {
    mockHook();
    const user = userEvent.setup();
    render(<PwaShield />);
    await user.click(screen.getByLabelText('PWA 安裝狀態'));

    expect(screen.getByText('尚未安裝')).toBeInTheDocument();
    expect(screen.getByText(/將 PayMe 加入主畫面/)).toBeInTheDocument();
  });

  it('should show install button when canPromptInstall is true', async () => {
    const mockPrompt = jest.fn();
    mockHook({ canPromptInstall: true, promptInstall: mockPrompt });

    const user = userEvent.setup();
    render(<PwaShield />);
    await user.click(screen.getByLabelText('PWA 安裝狀態'));

    const installBtn = screen.getByText('安裝 PayMe');
    expect(installBtn).toBeInTheDocument();

    await user.click(installBtn);
    expect(mockPrompt).toHaveBeenCalled();
  });

  it('should show installed state', async () => {
    mockHook({ isInstalled: true });

    const user = userEvent.setup();
    render(<PwaShield />);
    await user.click(screen.getByLabelText('PWA 安裝狀態'));

    expect(screen.getByText('已安裝 — 本地保護模式')).toBeInTheDocument();
    expect(screen.getByText(/您正在使用已安裝的本地版本/)).toBeInTheDocument();
  });

  it('should not show install button when installed', async () => {
    mockHook({ isInstalled: true });

    const user = userEvent.setup();
    render(<PwaShield />);
    await user.click(screen.getByLabelText('PWA 安裝狀態'));

    expect(screen.queryByText('安裝 PayMe')).not.toBeInTheDocument();
  });

  // --- Platform-specific install guide tests ---

  it('should show iOS guide when platform is ios', async () => {
    mockDetectPlatform.mockReturnValue('ios');
    mockHook();

    const user = userEvent.setup();
    render(<PwaShield />);
    await user.click(screen.getByLabelText('PWA 安裝狀態'));

    expect(screen.getByText(/點選底部分享按鈕/)).toBeInTheDocument();
  });

  it('should show Android guide when platform is android', async () => {
    mockDetectPlatform.mockReturnValue('android');
    mockHook();

    const user = userEvent.setup();
    render(<PwaShield />);
    await user.click(screen.getByLabelText('PWA 安裝狀態'));

    expect(screen.getByText(/點選右上角選單/)).toBeInTheDocument();
  });

  it('should show Desktop guide when platform is desktop', async () => {
    mockDetectPlatform.mockReturnValue('desktop');
    mockHook();

    const user = userEvent.setup();
    render(<PwaShield />);
    await user.click(screen.getByLabelText('PWA 安裝狀態'));

    expect(screen.getByText(/點選網址列右側安裝圖示/)).toBeInTheDocument();
  });

  it('should show generic guide when platform is unknown', async () => {
    mockDetectPlatform.mockReturnValue('unknown');
    mockHook();

    const user = userEvent.setup();
    render(<PwaShield />);
    await user.click(screen.getByLabelText('PWA 安裝狀態'));

    expect(screen.getByText(/透過瀏覽器選單/)).toBeInTheDocument();
  });

  // --- Mutual exclusion test ---

  it('should show install button and not manual guide when canPromptInstall is true', async () => {
    mockHook({ canPromptInstall: true });

    const user = userEvent.setup();
    render(<PwaShield />);
    await user.click(screen.getByLabelText('PWA 安裝狀態'));

    expect(screen.getByText('安裝 PayMe')).toBeInTheDocument();
    expect(screen.queryByText(/點選網址列右側安裝圖示/)).not.toBeInTheDocument();
    expect(screen.queryByText(/點選底部分享按鈕/)).not.toBeInTheDocument();
    expect(screen.queryByText(/點選右上角選單/)).not.toBeInTheDocument();
    expect(screen.queryByText(/透過瀏覽器選單/)).not.toBeInTheDocument();
  });

  // --- Badge tests ---

  it('should show pulse dot when showBadge is true', () => {
    mockHook({ showBadge: true });
    render(<PwaShield />);
    expect(screen.getByTestId('pwa-badge-dot')).toBeInTheDocument();
  });

  it('should not show pulse dot when showBadge is false', () => {
    mockHook({ showBadge: false });
    render(<PwaShield />);
    expect(screen.queryByTestId('pwa-badge-dot')).not.toBeInTheDocument();
  });

  it('should call dismissBadge when popover closes while badge is showing', async () => {
    const mockDismiss = jest.fn();
    mockHook({ showBadge: true, dismissBadge: mockDismiss });

    const user = userEvent.setup();
    render(<PwaShield />);

    // Open popover
    await user.click(screen.getByLabelText('PWA 安裝狀態'));
    expect(screen.getByText('尚未安裝')).toBeInTheDocument();

    // Close by pressing Escape
    await user.keyboard('{Escape}');
    expect(mockDismiss).toHaveBeenCalled();
  });

  it('should not show pulse dot when installed', () => {
    mockHook({ isInstalled: true, showBadge: false });
    render(<PwaShield />);
    expect(screen.queryByTestId('pwa-badge-dot')).not.toBeInTheDocument();
  });
});
