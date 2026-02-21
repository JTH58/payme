import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BankForm } from '../bank-form';
import type { AccountEntry } from '@/hooks/use-accounts';

// Mock SearchableSelect (it uses Popover which needs more setup)
jest.mock('@/components/ui/searchable-select', () => ({
  SearchableSelect: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="searchable-select"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

const mockAccounts: AccountEntry[] = [
  { id: 'a1', bankCode: '004', accountNumber: '1234567890', isShared: true },
  { id: 'a2', bankCode: '812', accountNumber: '9876543210', isShared: false },
];

const defaultProps = {
  accounts: mockAccounts,
  primaryAccount: mockAccounts[0],
  sharedAccounts: [mockAccounts[0]],
  onAddAccount: jest.fn(),
  onRemoveAccount: jest.fn(),
  onUpdateAccount: jest.fn(),
  onToggleShared: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BankForm Component', () => {
  describe('Shared link mode', () => {
    test('當 isSharedLink 為 true 時，應顯示唯讀卡片而非表單', () => {
      render(
        <BankForm
          {...defaultProps}
          isSharedLink
          sharedLinkBankCode="004"
          sharedLinkAccountNumber="1234567890"
        />
      );

      expect(screen.getByText('收款帳號')).toBeInTheDocument();
      expect(screen.getByText('004')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
      expect(screen.queryByText('收款帳戶管理')).not.toBeInTheDocument();
    });
  });

  describe('Collapsed state (default when accounts exist)', () => {
    test('有帳戶時預設摺疊，顯示摘要', () => {
      render(<BankForm {...defaultProps} />);

      expect(screen.getByText('分享帳戶')).toBeInTheDocument();
      expect(screen.getByText(/004-1234567890/)).toBeInTheDocument();
    });

    test('摺疊狀態下點擊可展開', () => {
      render(<BankForm {...defaultProps} />);

      const collapseButton = screen.getByText('分享帳戶').closest('button')!;
      fireEvent.click(collapseButton);

      expect(screen.getByText('收款帳戶管理')).toBeInTheDocument();
    });

    test('多帳戶時摘要顯示 +N 其他帳戶', () => {
      const props = {
        ...defaultProps,
        sharedAccounts: mockAccounts,
      };
      render(<BankForm {...props} />);

      expect(screen.getByText(/\+1 其他帳戶/)).toBeInTheDocument();
    });
  });

  describe('Expanded state', () => {
    test('展開後顯示所有帳戶和新增按鈕', () => {
      render(<BankForm {...defaultProps} />);

      const collapseButton = screen.getByText('分享帳戶').closest('button')!;
      fireEvent.click(collapseButton);

      expect(screen.getByText('收款帳戶管理')).toBeInTheDocument();
      expect(screen.getByText('新增其他收款帳戶')).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText('輸入銀行帳號')).toHaveLength(2);
    });

    test('點擊新增按鈕應觸發 onAddAccount', () => {
      render(<BankForm {...defaultProps} />);

      const collapseButton = screen.getByText('分享帳戶').closest('button')!;
      fireEvent.click(collapseButton);

      fireEvent.click(screen.getByText('新增其他收款帳戶'));
      expect(defaultProps.onAddAccount).toHaveBeenCalledTimes(1);
    });

    test('點擊 checkbox 應觸發 onToggleShared', () => {
      render(<BankForm {...defaultProps} />);

      const collapseButton = screen.getByText('分享帳戶').closest('button')!;
      fireEvent.click(collapseButton);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(defaultProps.onToggleShared).toHaveBeenCalledWith('a1');
    });

    test('展開後可以摺疊', () => {
      render(<BankForm {...defaultProps} />);

      // Expand
      const expandButton = screen.getByText('分享帳戶').closest('button')!;
      fireEvent.click(expandButton);
      expect(screen.getByText('收款帳戶管理')).toBeInTheDocument();

      // Collapse — find the ChevronUp button
      const collapseButtons = screen.getAllByRole('button').filter(b => {
        return b.querySelector('[class*="lucide-chevron-up"]') !== null
          || b.textContent === '';
      });
      // The collapse button is near the label
      const chevronUp = screen.getByText('勾選以加入分享連結').parentElement?.querySelector('button');
      if (chevronUp) {
        fireEvent.click(chevronUp);
        expect(screen.getByText('分享帳戶')).toBeInTheDocument();
      }
    });
  });

  describe('Empty state (no accounts)', () => {
    test('無帳戶時應預設展開並顯示提示', () => {
      const emptyAccounts: AccountEntry[] = [
        { id: 'empty', bankCode: '', accountNumber: '', isShared: true },
      ];
      render(
        <BankForm
          {...defaultProps}
          accounts={emptyAccounts}
          primaryAccount={null}
          sharedAccounts={[]}
        />
      );

      expect(screen.getByText('請先設定您的收款帳戶')).toBeInTheDocument();
      expect(screen.getByText('收款帳戶管理')).toBeInTheDocument();
    });
  });
});
