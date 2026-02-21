import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BackupDialog } from '..';
import * as backupLib from '@/lib/backup';

// ResizeObserver (Radix Dialog 需要)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock backup lib
jest.mock('@/lib/backup', () => ({
  createBackupPayload: jest.fn(),
  compressBackup: jest.fn(),
  decompressBackup: jest.fn(),
  buildBackupUrl: jest.fn(),
  restoreBackup: jest.fn(),
  hasExistingUserData: jest.fn(),
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
});

const mockBackup = backupLib as jest.Mocked<typeof backupLib>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BackupDialog', () => {
  it('should render dialog when open', () => {
    render(<BackupDialog open onOpenChange={() => {}} />);
    expect(screen.getByText('備份與轉移')).toBeInTheDocument();
  });

  it('should copy export link on button click', async () => {
    mockBackup.createBackupPayload.mockReturnValue({
      v: 1,
      ts: 123,
      keys: { payme_last_mode: 'pay' },
    });
    mockBackup.buildBackupUrl.mockReturnValue('https://payme.tw/backup/#/?data=0abc');

    render(<BackupDialog open onOpenChange={() => {}} />);
    fireEvent.click(screen.getByText('複製匯出連結'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://payme.tw/backup/#/?data=0abc');
    });
  });

  it('should show error when no data to export', () => {
    mockBackup.createBackupPayload.mockReturnValue({ v: 1, ts: 123, keys: {} });

    render(<BackupDialog open onOpenChange={() => {}} />);
    fireEvent.click(screen.getByText('產生備份'));

    expect(screen.getByText('目前沒有任何資料可以匯出')).toBeInTheDocument();
  });

  it('should fill textarea with compressed backup on export', () => {
    mockBackup.createBackupPayload.mockReturnValue({
      v: 1,
      ts: 123,
      keys: { payme_last_mode: 'pay' },
    });
    mockBackup.compressBackup.mockReturnValue('compressed-text');

    render(<BackupDialog open onOpenChange={() => {}} />);
    fireEvent.click(screen.getByText('產生備份'));

    const textarea = screen.getByLabelText('備份文字') as HTMLTextAreaElement;
    expect(textarea.value).toBe('compressed-text');
  });

  it('should show error for invalid import text', () => {
    mockBackup.decompressBackup.mockReturnValue(null);

    render(<BackupDialog open onOpenChange={() => {}} />);
    const textarea = screen.getByLabelText('備份文字');
    fireEvent.change(textarea, { target: { value: 'garbage' } });
    fireEvent.click(screen.getByText('匯入'));

    expect(screen.getByText('備份資料無效或已損毀')).toBeInTheDocument();
  });

  it('should show overwrite confirmation when existing data', () => {
    const payload = { v: 1 as const, ts: 123, keys: { payme_last_mode: 'pay' } };
    mockBackup.decompressBackup.mockReturnValue(payload);
    mockBackup.hasExistingUserData.mockReturnValue(true);

    render(<BackupDialog open onOpenChange={() => {}} />);
    const textarea = screen.getByLabelText('備份文字');
    fireEvent.change(textarea, { target: { value: 'valid' } });
    fireEvent.click(screen.getByText('匯入'));

    expect(screen.getByText('本地已有資料')).toBeInTheDocument();
    expect(screen.getByText('確認覆蓋')).toBeInTheDocument();
  });

  it('should restore on confirm overwrite', async () => {
    const payload = { v: 1 as const, ts: 123, keys: { payme_last_mode: 'pay' } };
    mockBackup.decompressBackup.mockReturnValue(payload);
    mockBackup.hasExistingUserData.mockReturnValue(true);

    render(<BackupDialog open onOpenChange={() => {}} />);
    const textarea = screen.getByLabelText('備份文字');
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'valid' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText('匯入'));
    });

    // 應顯示確認覆蓋畫面
    expect(screen.getByText('確認覆蓋')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('確認覆蓋'));
    });

    expect(mockBackup.restoreBackup).toHaveBeenCalledWith(payload);
  });

  it('should restore directly when no existing data', async () => {
    const payload = { v: 1 as const, ts: 123, keys: { payme_last_mode: 'pay' } };
    mockBackup.decompressBackup.mockReturnValue(payload);
    mockBackup.hasExistingUserData.mockReturnValue(false);

    render(<BackupDialog open onOpenChange={() => {}} />);
    const textarea = screen.getByLabelText('備份文字');
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'valid' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText('匯入'));
    });

    expect(mockBackup.restoreBackup).toHaveBeenCalledWith(payload);
  });
});
