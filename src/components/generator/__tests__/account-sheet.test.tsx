import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountSheet } from '../account-sheet';
import type { AccountEntry } from '@/hooks/use-accounts';

// Radix Dialog requires ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

const mockAccounts: AccountEntry[] = [
  { id: 'acc-1', bankCode: '822', accountNumber: '123456789012', isShared: true },
];

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  accounts: mockAccounts,
  primaryAccount: mockAccounts[0],
  sharedAccounts: mockAccounts,
  onAddAccount: jest.fn(),
  onRemoveAccount: jest.fn(),
  onUpdateAccount: jest.fn(),
  onToggleShared: jest.fn(),
};

describe('AccountSheet', () => {
  test('should render sheet title and description', () => {
    render(<AccountSheet {...defaultProps} />);

    expect(screen.getByText('帳戶管理')).toBeInTheDocument();
    expect(screen.getByText('勾選以加入分享連結')).toBeInTheDocument();
  });

  test('should render BankForm with account data', () => {
    render(<AccountSheet {...defaultProps} />);

    // Should show the account number input
    expect(screen.getByDisplayValue('123456789012')).toBeInTheDocument();
  });

  test('should render add account button (alwaysExpanded mode)', () => {
    render(<AccountSheet {...defaultProps} />);

    expect(screen.getByText('新增其他收款帳戶')).toBeInTheDocument();
  });

  test('should not render collapse header (alwaysExpanded mode)', () => {
    render(<AccountSheet {...defaultProps} />);

    // alwaysExpanded skips the "收款帳戶管理" label and collapse controls
    expect(screen.queryByText('收款帳戶管理')).not.toBeInTheDocument();
    expect(screen.queryByText('分享帳戶')).not.toBeInTheDocument();
  });

  test('should show amber warning when no accounts have data', () => {
    const emptyAccounts: AccountEntry[] = [
      { id: 'acc-1', bankCode: '', accountNumber: '', isShared: true },
    ];

    render(
      <AccountSheet
        {...defaultProps}
        accounts={emptyAccounts}
        primaryAccount={null}
        sharedAccounts={[]}
      />
    );

    expect(screen.getByText('請先設定您的收款帳戶')).toBeInTheDocument();
  });

  test('should call onAddAccount when add button clicked', async () => {
    const user = userEvent.setup();
    const onAddAccount = jest.fn();

    render(<AccountSheet {...defaultProps} onAddAccount={onAddAccount} />);

    await user.click(screen.getByText('新增其他收款帳戶'));
    expect(onAddAccount).toHaveBeenCalledTimes(1);
  });

  test('should not render when closed', () => {
    render(<AccountSheet {...defaultProps} open={false} />);

    expect(screen.queryByText('帳戶管理')).not.toBeInTheDocument();
  });
});
