import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Generator } from '../index';

// ---------------------------------------------------------------------------
// Mock analytics module — verify calls
// ---------------------------------------------------------------------------
const mockTrackEvent = jest.fn();
const mockCleanup = jest.fn();
const mockSetupAutoFlush = jest.fn(() => mockCleanup);
jest.mock('@/lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  setupAutoFlush: () => mockSetupAutoFlush(),
}));

// ---------------------------------------------------------------------------
// Standard Generator mocks
// ---------------------------------------------------------------------------
const mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));

jest.mock('../styled-qr-code', () => ({
  StyledQrCode: ({ data }: { data: string }) => <div data-testid="qr-code">{data}</div>,
}));

jest.mock('html-to-image', () => ({
  toPng: jest.fn().mockResolvedValue('data:image/png;base64,mock'),
}));

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn(),
}));

jest.mock('../share-confirm-dialog', () => ({
  ShareConfirmDialog: ({ open, shareUrl, onConfirmShare }: {
    open: boolean; shareUrl: string;
    onConfirmShare: (url: string, pw: boolean) => void;
  }) => open ? (
    <div data-testid="share-confirm-dialog">
      <button data-testid="mock-confirm-share" onClick={() => onConfirmShare(shareUrl, false)}>confirm</button>
    </div>
  ) : null,
}));

jest.mock('../qr-brand-card', () => {
  const React = require('react');
  const Mock = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) => (
    <div ref={ref} data-testid="qr-brand-card">QrBrandCard</div>
  ));
  Mock.displayName = 'MockQrBrandCard';
  return { QrBrandCard: Mock };
});

jest.mock('../qr-style-sheet', () => ({
  QrStyleSheet: () => null,
}));

jest.mock('../preview-sheet', () => ({
  PreviewSheet: ({ open, onShare, onDownload, qrCardRef }: {
    open: boolean;
    onShare: () => void;
    onDownload: () => void;
    qrCardRef: React.Ref<HTMLDivElement>;
  }) => open ? (
    <div data-testid="preview-sheet">
      <div ref={qrCardRef} data-testid="qr-card-ref-target" />
      <button data-testid="share-btn" onClick={onShare}>分享連結</button>
      <button data-testid="download-btn" onClick={onDownload}>下載圖片</button>
    </div>
  ) : null,
}));

jest.mock('../onboarding-guide', () => ({
  OnboardingGuide: () => null,
}));

jest.mock('../onboarding-complete-dialog', () => ({
  OnboardingCompleteDialog: () => null,
}));

jest.mock('@/components/legal/first-visit-disclaimer', () => ({
  FirstVisitDisclaimer: () => null,
}));

jest.mock('@/components/template-submit-modal', () => ({
  TemplateSubmitModal: () => null,
}));

jest.mock('../account-sheet', () => ({
  AccountSheet: () => null,
}));

jest.mock('../template-sheet', () => ({
  TemplateSheet: () => null,
}));

// localStorage mock (same pattern as generator.integration.test.tsx — no jest.fn wrapper)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

/** Helper: open PreviewSheet by clicking the confirm button */
const openPreview = async (user: ReturnType<typeof userEvent.setup>) => {
  const confirmBtn = screen.getByRole('button', { name: /產生收款碼及連結/i });
  await user.click(confirmBtn);
  await waitFor(() => {
    expect(screen.getByTestId('preview-sheet')).toBeInTheDocument();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  localStorageMock.setItem('payme_has_visited', 'true');
  localStorageMock.setItem('payme_onboarding_complete', 'true');
  localStorageMock.setItem('payme_accounts', JSON.stringify([
    { id: 'acc-default', bankCode: '822', accountNumber: '123456789012', isShared: true },
  ]));
  localStorageMock.setItem('payme_data_personal', JSON.stringify({
    bankCode: '822', accountNumber: '123456789012', amount: '', comment: '',
  }));
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Generator analytics', () => {
  test('mount calls setupAutoFlush and unmount calls cleanup', async () => {
    let unmount: () => void;
    await act(async () => {
      const result = render(<Generator />);
      unmount = result.unmount;
    });
    expect(mockSetupAutoFlush).toHaveBeenCalledTimes(1);

    act(() => { unmount(); });
    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  test('clicking share button calls trackEvent("generate_link")', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<Generator />);
    });

    // Wait for form to be ready (sub-mode selector visible = past loading)
    await screen.findByRole('button', { name: /個人收款/i }, { timeout: 3000 });

    // Open PreviewSheet
    await openPreview(user);

    // Click share
    const shareBtn = screen.getByTestId('share-btn');
    await user.click(shareBtn);

    expect(mockTrackEvent).toHaveBeenCalledWith('generate_link');
  });

  test('clicking download button calls trackEvent("download_qr")', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<Generator />);
    });

    await screen.findByRole('button', { name: /個人收款/i }, { timeout: 3000 });
    await openPreview(user);

    const downloadBtn = screen.getByTestId('download-btn');
    await user.click(downloadBtn);

    expect(mockTrackEvent).toHaveBeenCalledWith('download_qr');
  });
});
