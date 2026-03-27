import Link from 'next/link';
import { BankExtended, BankStatus } from '../types';
import { BankFeedbackButton } from './bank-feedback-button';
import { getBankByCode } from '../utils/get-banks';

const STATUS_CONFIG: Record<BankStatus, { icon: string; label: string; color: string; tone: string }> = {
  no_reports: {
    icon: '🏦',
    label: '未收到錯誤回報',
    color: 'text-slate-700',
    tone: 'bg-slate-50 border-slate-200',
  },
  verified: {
    icon: '✅',
    label: '已有使用回報',
    color: 'text-green-700',
    tone: 'bg-green-50 border-green-200',
  },
  reported_issues: {
    icon: '⚠️',
    label: '有問題回報',
    color: 'text-amber-700',
    tone: 'bg-amber-50 border-amber-200',
  },
};

interface BankDetailProps {
  bank: BankExtended;
}

export function BankDetail({ bank }: BankDetailProps) {
  const status = STATUS_CONFIG[bank.status];
  const relatedBanks = bank.seo.relatedBankCodes
    .map((code) => getBankByCode(code))
    .filter((item): item is BankExtended => Boolean(item))
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm shadow-sky-100/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-slate-500 text-sm font-mono">{bank.code}</p>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {bank.name} TWQR 掃碼轉帳支援狀態
              </h1>
              <p className="text-sm leading-7 text-slate-600">
                {bank.seo.seoIntro}
              </p>
            </div>
          </div>

          <div className={`rounded-2xl border px-4 py-3 text-sm ${status.tone}`}>
            <p className={`flex items-center gap-2 font-medium ${status.color}`}>
              <span>{status.icon}</span>
              <span>{status.label}</span>
            </p>
            <p className="mt-2 text-slate-600">最後檢視：{bank.seo.lastReviewedAt}</p>
            {bank.seo.verificationDate && (
              <p className="mt-1 text-slate-600">最近驗證：{bank.seo.verificationDate}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/?bankCode=${bank.code}`}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            使用此銀行收款
          </Link>
          <Link
            href="/banks"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            返回銀行列表
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-sky-100/60">
          <h2 className="text-lg font-semibold text-slate-900">快速結論</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <dt className="text-slate-500">銀行代碼</dt>
              <dd className="font-mono text-slate-900">{bank.code}</dd>
            </div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <dt className="text-slate-500">TWQR 狀態</dt>
              <dd className={`font-medium ${status.color}`}>{status.icon} {status.label}</dd>
            </div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <dt className="text-slate-500">掃碼入口</dt>
              <dd className="max-w-[16rem] text-right text-slate-700">{bank.seo.scanFeatureHint}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-500">最後檢視</dt>
              <dd className="text-slate-900">{bank.seo.lastReviewedAt}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-sky-100/60">
          <h2 className="text-lg font-semibold text-slate-900">相關資訊</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>{bank.seo.statusSummary}</p>
            {bank.seo.issueSummary && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <p className="font-medium">已知問題摘要</p>
                <p className="mt-1">{bank.seo.issueSummary}</p>
                {bank.seo.issueUpdatedAt && (
                  <p className="mt-1 text-xs text-amber-700">更新時間：{bank.seo.issueUpdatedAt}</p>
                )}
              </div>
            )}
            {bank.customerServicePhone && (
              <p>客服電話：{bank.customerServicePhone}</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-sky-100/60">
        <h2 className="text-lg font-semibold text-slate-900">如何用 {bank.shortName} 掃 TWQR</h2>
        <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
          <li>1. 開啟 {bank.shortName} App，優先尋找掃碼轉帳、付款掃碼或 TWQR 相關入口。</li>
          <li>2. 使用該功能掃描 PayMe.tw 產生的收款 QR Code，不要直接用一般相機掃描。</li>
          <li>3. 確認收款帳戶、金額與備註資訊是否正確，再決定是否送出交易。</li>
          <li>4. 第一次使用建議先做小額測試，確認流程正常後再正式使用。</li>
        </ol>

        <ul className="mt-5 space-y-2 text-sm leading-7 text-slate-600">
          {bank.seo.usageNotes.map((note) => (
            <li key={note} className="flex gap-2">
              <span className="mt-1 text-blue-500">•</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-sky-100/60">
        <h2 className="text-lg font-semibold text-slate-900">官方資源與操作入口</h2>
        <div className="mt-4 space-y-3">
          {bank.officialGuideUrl && (
            <a
              href={bank.officialGuideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 transition-colors hover:bg-slate-50"
            >
              📖 {bank.seo.officialGuideLabel}
            </a>
          )}

          {bank.appStoreUrl && (
            <a
              href={bank.appStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 transition-colors hover:bg-slate-50"
            >
              🍎 App Store
            </a>
          )}

          {bank.playStoreUrl && (
            <a
              href={bank.playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 transition-colors hover:bg-slate-50"
            >
              🤖 Google Play
            </a>
          )}

          {!bank.officialGuideUrl && !bank.appStoreUrl && !bank.playStoreUrl && (
            <p className="text-sm text-slate-500">
              目前尚未整理到此銀行的官方教學或下載連結，後續可再補充。
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-sky-100/60">
        <h2 className="text-lg font-semibold text-slate-900">{bank.shortName} TWQR 常見問題</h2>
        <div className="mt-4 space-y-3">
          {bank.seo.faqs.map((faq) => (
            <details key={faq.question} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <summary className="cursor-pointer list-none font-medium text-slate-900">
                {faq.question}
              </summary>
              <p className="mt-2 text-sm leading-7 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5">
          <h2 className="text-sm font-semibold text-blue-700">關於 PayMe.tw</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            PayMe.tw 是免費、開源的台灣通用收款碼產生器。你可以先查詢 {bank.shortName} 的 TWQR 狀態，再用 PayMe.tw 建立專屬收款 QR Code。
          </p>
          <Link
            href="/features"
            className="mt-3 inline-block text-sm text-blue-700 transition-colors hover:text-blue-800"
          >
            了解更多功能 →
          </Link>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-5">
          <h2 className="text-sm font-semibold text-indigo-700">什麼是 TWQR？</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            TWQR 是台灣共用支付碼標準，讓不同銀行 App 能掃描同一張 QR Code 完成轉帳。若你想了解規格與使用原理，可進一步閱讀 TWQR 介紹。
          </p>
          <Link
            href="/twqr"
            className="mt-3 inline-block text-sm text-indigo-700 transition-colors hover:text-indigo-800"
          >
            了解 TWQR 標準 →
          </Link>
        </div>
      </section>

      {relatedBanks.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-sky-100/60">
          <h2 className="text-lg font-semibold text-slate-900">你也可以查看這些銀行</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {relatedBanks.map((item) => (
              <Link
                key={item.code}
                href={`/banks/${item.code}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                {item.shortName}
              </Link>
            ))}
          </div>
        </section>
      )}

      <BankFeedbackButton bankCode={bank.code} bankShortName={bank.shortName} />
    </div>
  );
}
