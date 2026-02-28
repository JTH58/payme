import Link from 'next/link';
import { BankExtended, BankStatus } from '../types';
import { BankFeedbackButton } from './bank-feedback-button';

const STATUS_CONFIG: Record<BankStatus, { icon: string; label: string; color: string }> = {
  no_reports: { icon: '🏦', label: '未收到錯誤回報', color: 'text-white/60' },
  verified: { icon: '✅', label: '已驗證可用', color: 'text-green-400' },
  reported_issues: { icon: '⚠️', label: '有問題回報', color: 'text-yellow-400' },
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
        <p className="text-white/50 text-sm font-mono mb-1">{bank.code}</p>
        <h1 className="text-2xl font-bold">{bank.name}</h1>
      </div>

      {/* Status */}
      <div className={`flex items-center gap-2 ${status.color}`}>
        <span>{status.icon}</span>
        <span>{status.label}</span>
      </div>

      {/* Links Section */}
      <div className="space-y-3">
        {bank.officialGuideUrl && (
          <a
            href={bank.officialGuideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            📖 官方教學
          </a>
        )}

        {bank.appStoreUrl && (
          <a
            href={bank.appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            🍎 App Store
          </a>
        )}

        {bank.playStoreUrl && (
          <a
            href={bank.playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            🤖 Google Play
          </a>
        )}

        {bank.customerServicePhone && (
          <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white/70">
            📞 客服電話：{bank.customerServicePhone}
          </div>
        )}
      </div>

      {/* PayMe.tw 介紹 */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-blue-400">關於 PayMe.tw</h2>
        <p className="text-xs text-white/50 leading-relaxed">
          PayMe.tw 是免費、開源的台灣通用收款碼產生器。支援全台 266 間金融機構，
          隱私優先、資料不回傳，一鍵產生 TWQR 收款 QR Code。
        </p>
        <Link
          href="/features"
          className="inline-block text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          了解更多功能 →
        </Link>
      </div>

      {/* TWQR 介紹 */}
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-purple-400">什麼是 TWQR？</h2>
        <p className="text-xs text-white/50 leading-relaxed">
          TWQR 是台灣共用支付碼標準，讓各家銀行 App 都能掃描同一張 QR Code 完成轉帳，
          跨行互通、安全免費。
        </p>
        <Link
          href="/twqr"
          className="inline-block text-xs text-purple-400 hover:text-purple-300 transition-colors"
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
        className="block text-center text-white/50 hover:text-white/80 transition-colors text-sm"
      >
        ← 返回銀行列表
      </Link>
    </div>
  );
}
