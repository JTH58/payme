import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import banks from '@/data/banks.json';
import { cn } from '@/lib/utils';
import type { AccountEntry } from '@/hooks/use-accounts';
import { isAccountComplete } from '@/modules/core/utils/validators';

interface BankFormProps {
  accounts: AccountEntry[];
  primaryAccount: AccountEntry | null;
  sharedAccounts: AccountEntry[];
  onAddAccount: () => void;
  onRemoveAccount: (id: string) => void;
  onUpdateAccount: (id: string, patch: Partial<AccountEntry>) => void;
  onToggleShared: (id: string) => void;
  isSharedLink?: boolean;
  sharedLinkBankCode?: string;
  sharedLinkAccountNumber?: string;
  alwaysExpanded?: boolean;
}

export function BankForm({
  accounts,
  primaryAccount,
  sharedAccounts,
  onAddAccount,
  onRemoveAccount,
  onUpdateAccount,
  onToggleShared,
  isSharedLink = false,
  sharedLinkBankCode,
  sharedLinkAccountNumber,
  alwaysExpanded = false,
}: BankFormProps) {
  const hasAccounts = accounts.some(acc => isAccountComplete(acc.bankCode, acc.accountNumber));
  const [isExpanded, setIsExpanded] = useState(!hasAccounts);

  // 分享連結模式 — 唯讀卡片
  if (isSharedLink) {
    const bankCode = sharedLinkBankCode || '';
    const accountNumber = sharedLinkAccountNumber || '';
    const bankName = banks.find(b => b.code === bankCode)?.name || '';

    return (
      <Card className="bg-white/85 border-slate-200 shadow-sm shadow-sky-100/80">
        <CardContent className="p-4 flex flex-col gap-1">
          <div className="text-xs text-slate-600">收款帳號</div>
          <div className="text-lg font-mono text-slate-900 flex items-center gap-2">
            <span className="bg-blue-100 px-2 py-0.5 rounded text-blue-700 text-sm font-bold">{bankCode}</span>
            <span>{accountNumber}</span>
          </div>
          <div className="text-sm text-slate-500">{bankName}</div>
        </CardContent>
      </Card>
    );
  }

  // alwaysExpanded 模式：直接渲染帳戶列表（用於 Sheet 內）
  if (alwaysExpanded) {
    return (
      <div className="space-y-3">
        {!hasAccounts && (
          <div className="text-sm text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            請先設定您的收款帳戶
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={onAddAccount}
          className="w-full border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 h-12 gap-2"
        >
          <Plus size={16} />
          新增其他收款帳戶
        </Button>

        <div className="space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="group relative flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 transition-all hover:bg-slate-50">
              <div className="pt-3">
                <Checkbox
                  checked={account.isShared}
                  onCheckedChange={() => onToggleShared(account.id)}
                  className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Bank Code</Label>
                  <SearchableSelect
                    options={banks.map(b => ({ value: b.code, label: `${b.code} ${b.name}` }))}
                    value={account.bankCode}
                    onChange={(val) => onUpdateAccount(account.id, { bankCode: val })}
                    placeholder="搜尋銀行..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Account No.</Label>
                  <Input
                    placeholder="輸入銀行帳號"
                    maxLength={16}
                    inputMode="numeric"
                    value={account.accountNumber}
                    onChange={(e) => onUpdateAccount(account.id, { accountNumber: e.target.value })}
                    className={cn("font-mono tracking-wide h-10")}
                  />
                  {account.accountNumber && !/^\d{10,16}$/.test(account.accountNumber) && (
                    <p className="text-xs text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
                      帳號必須為 10-16 碼數字
                    </p>
                  )}
                </div>
              </div>
              <div className="pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  onClick={() => onRemoveAccount(account.id)}
                  disabled={accounts.length <= 1}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 摺疊摘要
  const summaryText = (() => {
    if (!primaryAccount || !primaryAccount.bankCode) return '';
    const bankName = banks.find(b => b.code === primaryAccount.bankCode)?.shortName
      || banks.find(b => b.code === primaryAccount.bankCode)?.name
      || primaryAccount.bankCode;
    const accountDisplay = `${primaryAccount.bankCode}-${primaryAccount.accountNumber}`;
    const otherCount = sharedAccounts.length - 1;
    const suffix = otherCount > 0 ? ` (+${otherCount} 其他帳戶)` : '';
    return `${bankName} ${accountDisplay}${suffix}`;
  })();

  // 無帳戶（首次）→ 強制展開
  if (!hasAccounts && !isExpanded) {
    setIsExpanded(true);
  }

  return (
    <div className="space-y-3">
      {/* 摺疊標題列 */}
      {hasAccounts && !isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/85 border border-slate-200 hover:bg-white transition-all cursor-pointer shadow-sm shadow-sky-100/60"
        >
          <div className="flex items-center gap-2 text-left">
            <span className="text-sm text-slate-600">分享帳戶</span>
            <span className="text-sm text-slate-900 font-mono">{summaryText}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Label className="text-slate-800">收款帳戶管理</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">勾選以加入分享連結</span>
              {hasAccounts && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {!hasAccounts && (
            <div className="text-sm text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              請先設定您的收款帳戶
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={onAddAccount}
            className="w-full border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 h-12 gap-2"
          >
            <Plus size={16} />
            新增其他收款帳戶
          </Button>

          <div className="space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="group relative flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 transition-all hover:bg-slate-50">
                {/* 1. Checkbox (Share Toggle) */}
                <div className="pt-3">
                  <Checkbox
                    checked={account.isShared}
                    onCheckedChange={() => onToggleShared(account.id)}
                    className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                </div>

                {/* 2. Inputs */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Bank Code</Label>
                    <SearchableSelect
                      options={banks.map(b => ({ value: b.code, label: `${b.code} ${b.name}` }))}
                      value={account.bankCode}
                      onChange={(val) => onUpdateAccount(account.id, { bankCode: val })}
                      placeholder="搜尋銀行..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Account No.</Label>
                    <Input
                      placeholder="輸入銀行帳號"
                      maxLength={16}
                      inputMode="numeric"
                      value={account.accountNumber}
                      onChange={(e) => onUpdateAccount(account.id, { accountNumber: e.target.value })}
                      className={cn("font-mono tracking-wide h-10")}
                    />
                    {account.accountNumber && !/^\d{10,16}$/.test(account.accountNumber) && (
                      <p className="text-xs text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
                        帳號必須為 10-16 碼數字
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Delete Button */}
                <div className="pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    onClick={() => onRemoveAccount(account.id)}
                    disabled={accounts.length <= 1}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
