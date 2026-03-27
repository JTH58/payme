import Link from 'next/link';
import { BankExtended, BankStatus } from '../types';
import { BankFeedbackButton } from './bank-feedback-button';

const STATUS_CONFIG: Record<BankStatus, { icon: string; label: string; color: string }> = {
  no_reports: { icon: '🏦', label: '未收到錯誤回報', color: 'text-slate-600' },
  verified: { icon: '✅', label: '已驗證可用', color: 'text-green-600' },
  reported_issues: { icon: '⚠️', label: '有問題回報', color: 'text-amber-600' },
};

interface BankDetailProps {
  bank: BankExtended;
}

export function BankDetail({ bank }: BankDetailProps) {
  const status = STATUS_CONFIG[bank.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-slate-500 text-sm font-mono mb-1">{bank.code}</p>
        <h1 className="text-2xl font-bold text-slate-900">{bank.name} 搭配 PayMe.tw 使用</h1>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <div className={`flex items-center gap-2 ${status.color}`}>
          <span>TWQR 支援狀態：</span>
          <span>{status.icon}</span>
          <span>{status.label}</span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          {bank.name}（{bank.code}）用戶支援 TWQR
          掃碼轉帳，各大銀行 App
          皆可掃描付款，搭配 PayMe.tw
          免費產生專屬收款 QR Code，跨行互通、資料不回傳，還可以客製化專屬收款碼！
        </p>
      </div>

      {/* Links Section */}
      <div className="space-y-3">
        {bank.officialGuideUrl && (
          <a
            href={bank.officialGuideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 rounded-lg bg-white/80 hover:bg-white border border-slate-200 transition-colors shadow-sm shadow-sky-100/60"
          >
            📖 官方教學
          </a>
        )}

        {bank.appStoreUrl && (
          <a
            href={bank.appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 rounded-lg bg-white/80 hover:bg-white border border-slate-200 transition-colors shadow-sm shadow-sky-100/60"
          >
            🍎 App Store
          </a>
        )}

        {bank.playStoreUrl && (
          <a
            href={bank.playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 rounded-lg bg-white/80 hover:bg-white border border-slate-200 transition-colors shadow-sm shadow-sky-100/60"
          >
            🤖 Google Play
          </a>
        )}

        {bank.customerServicePhone && (
          <div className="px-4 py-3 rounded-lg bg-white/80 border border-slate-200 text-slate-600 shadow-sm shadow-sky-100/60">
            📞 客服電話：{bank.customerServicePhone}
          </div>
        )}
      </div>

      {/* PayMe.tw 介紹 */}
      <div className="marketing-card-subtle p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">關於 PayMe.tw</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          PayMe.tw 是免費、開源的台灣通用收款碼產生器。支援全台 266 間金融機構，
          隱私優先、資料不回傳，一鍵產生 TWQR 收款 QR Code。
        </p>
        <Link
          href="/features"
          className="inline-block text-xs text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200 transition-colors"
        >
          了解更多功能 →
        </Link>
      </div>

      {/* TWQR 介紹 */}
      <div className="marketing-card-subtle p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">什麼是 TWQR？</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          TWQR 是台灣共用支付碼標準，讓各家銀行 App 都能掃描同一張 QR Code 完成轉帳，
          跨行互通、安全免費。
        </p>
        <Link
          href="/twqr"
          className="inline-block text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200 transition-colors"
        >
          了解 TWQR 標準 →
        </Link>
      </div>

      {/* Report Issue */}
      <BankFeedbackButton bankCode={bank.code} bankShortName={bank.shortName} />

      {/* CTA */}
      <Link
        href={`/?bankCode=${bank.code}`}
        className="block w-full text-center px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
      >
        使用此銀行收款
      </Link>

      {/* Back link */}
      <Link
        href="/banks"
        className="block text-center text-slate-500 hover:text-slate-800 transition-colors text-sm"
      >
        ← 返回銀行列表
      </Link>
    </div>
  );
}
