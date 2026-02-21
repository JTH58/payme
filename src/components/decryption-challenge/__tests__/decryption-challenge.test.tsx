import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LZString from 'lz-string';
import { encrypt } from '@/lib/crypto';
import { DecryptionChallenge } from '../index';

// Helper: 產生加密 blob（模擬 buildShareUrl 的加密流程）
async function createEncryptedBlob(data: any, password: string): Promise<string> {
  const json = JSON.stringify(data);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return encrypt(password, compressed);
}

const SAMPLE_DATA = { bankCode: '004', accountNumber: '1234567890', amount: 100 };
const CORRECT_PASSWORD = 'test-password-123';

describe('DecryptionChallenge', () => {
  const defaultProps = {
    encryptedBlob: '', // will be set per test
    mode: null as any,
    pathParams: {},
    onDecrypted: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render lock screen with password input', () => {
    render(<DecryptionChallenge {...defaultProps} encryptedBlob="dummy" />);

    expect(screen.getByText('此收款連結受密碼保護')).toBeInTheDocument();
    expect(screen.getByText('請輸入分享者提供的密碼')).toBeInTheDocument();
    expect(screen.getByLabelText('密碼')).toBeInTheDocument();
    expect(screen.getByText('解鎖收款單')).toBeInTheDocument();
    expect(screen.getByText('建立我的收款碼')).toBeInTheDocument();
  });

  it('should decrypt and call onDecrypted with correct password', async () => {
    const blob = await createEncryptedBlob(SAMPLE_DATA, CORRECT_PASSWORD);
    const onDecrypted = jest.fn();
    const user = userEvent.setup();

    render(
      <DecryptionChallenge
        {...defaultProps}
        encryptedBlob={blob}
        onDecrypted={onDecrypted}
      />
    );

    await user.type(screen.getByLabelText('密碼'), CORRECT_PASSWORD);
    await user.click(screen.getByText('解鎖收款單'));

    await waitFor(() => {
      expect(onDecrypted).toHaveBeenCalledTimes(1);
      expect(onDecrypted).toHaveBeenCalledWith(SAMPLE_DATA);
    });
  });

  it('should show error message for wrong password', async () => {
    const blob = await createEncryptedBlob(SAMPLE_DATA, CORRECT_PASSWORD);
    const onDecrypted = jest.fn();
    const user = userEvent.setup();

    render(
      <DecryptionChallenge
        {...defaultProps}
        encryptedBlob={blob}
        onDecrypted={onDecrypted}
      />
    );

    await user.type(screen.getByLabelText('密碼'), 'wrong-password');
    await user.click(screen.getByText('解鎖收款單'));

    await waitFor(() => {
      expect(screen.getByText('密碼錯誤，請重新輸入')).toBeInTheDocument();
    });

    expect(onDecrypted).not.toHaveBeenCalled();
    expect(screen.getByLabelText('密碼')).toHaveValue('');
  });

  it('should show loading state during decryption', async () => {
    const blob = await createEncryptedBlob(SAMPLE_DATA, CORRECT_PASSWORD);
    const user = userEvent.setup();

    render(
      <DecryptionChallenge
        {...defaultProps}
        encryptedBlob={blob}
        onDecrypted={jest.fn()}
      />
    );

    await user.type(screen.getByLabelText('密碼'), CORRECT_PASSWORD);
    await user.click(screen.getByText('解鎖收款單'));

    // Loading state should appear (progress text + button label)
    const matches = screen.getAllByText('解密中...');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('should submit on Enter key press', async () => {
    const blob = await createEncryptedBlob(SAMPLE_DATA, CORRECT_PASSWORD);
    const onDecrypted = jest.fn();
    const user = userEvent.setup();

    render(
      <DecryptionChallenge
        {...defaultProps}
        encryptedBlob={blob}
        onDecrypted={onDecrypted}
      />
    );

    await user.type(screen.getByLabelText('密碼'), CORRECT_PASSWORD);
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(onDecrypted).toHaveBeenCalledTimes(1);
      expect(onDecrypted).toHaveBeenCalledWith(SAMPLE_DATA);
    });
  });

  it('should not submit when password is empty', async () => {
    const onDecrypted = jest.fn();
    const user = userEvent.setup();

    render(
      <DecryptionChallenge
        {...defaultProps}
        encryptedBlob="dummy"
        onDecrypted={onDecrypted}
      />
    );

    // Click unlock with empty password
    await user.click(screen.getByText('解鎖收款單'));

    expect(onDecrypted).not.toHaveBeenCalled();
    // No error message should appear
    expect(screen.queryByText('密碼錯誤，請重新輸入')).not.toBeInTheDocument();
  });
});
