import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { BankForm } from '@/modules/core/components/bank-form';
import type { AccountEntry } from '@/hooks/use-accounts';

interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountEntry[];
  primaryAccount: AccountEntry | null;
  sharedAccounts: AccountEntry[];
  onAddAccount: () => void;
  onRemoveAccount: (id: string) => void;
  onUpdateAccount: (id: string, patch: Partial<AccountEntry>) => void;
  onToggleShared: (id: string) => void;
}

export function AccountSheet({
  open,
  onOpenChange,
  accounts,
  primaryAccount,
  sharedAccounts,
  onAddAccount,
  onRemoveAccount,
  onUpdateAccount,
  onToggleShared,
}: AccountSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>帳戶管理</SheetTitle>
          <SheetDescription>勾選以加入分享連結</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <BankForm
            alwaysExpanded
            accounts={accounts}
            primaryAccount={primaryAccount}
            sharedAccounts={sharedAccounts}
            onAddAccount={onAddAccount}
            onRemoveAccount={onRemoveAccount}
            onUpdateAccount={onUpdateAccount}
            onToggleShared={onToggleShared}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
