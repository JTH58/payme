import Link from 'next/link';
import { BankExtended, BankStatus } from '../types';

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

      {/* Report Issue */}
      <a
        href={`https://github.com/tinghao/tw-qr-code-maker/issues/new?title=${encodeURIComponent(`[${bank.code}] ${bank.shortName} 問題回報`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-white/40 hover:text-white/70 transition-colors text-xs"
      >
        資訊有誤？我要回報問題
      </a>

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
