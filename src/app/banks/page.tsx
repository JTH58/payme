import type { Metadata } from 'next';
import Link from 'next/link';
import { getBanks } from '@/modules/banks/utils/get-banks';
import { BankList } from '@/modules/banks/components/bank-list';

export const metadata: Metadata = {
  title: 'TWQR 支援銀行列表與熱門銀行查詢 | PayMe.tw',
  description: '查詢全台 266 間金融機構與支付機構的 TWQR 掃碼轉帳支援狀態，快速查看熱門銀行、銀行分類與常見問題，並延伸閱讀各銀行的 TWQR 使用頁。',
  alternates: {
    canonical: '/banks',
  },
  openGraph: {
    title: 'TWQR 支援銀行列表與熱門銀行查詢 | PayMe.tw',
    description: '全台 266 間金融機構與支付機構的 TWQR 掃碼轉帳支援狀態、熱門銀行入口與常見問題',
    url: 'https://payme.tw/banks',
  },
};

const POPULAR_BANK_CODES = ['004', '007', '012', '013', '017', '812', '822', '803'];

const FAQ_ITEMS = [
  {
    question: '哪些銀行可以掃 PayMe.tw 產生的 TWQR 收款碼？',
    answer: '你可以先從這個頁面的熱門銀行與銀行列表進入，查看各銀行的 TWQR 狀態頁。若頁面顯示未收到錯誤回報或已有使用回報，通常代表較適合先測試使用。',
  },
  {
    question: '如果我的銀行不在熱門銀行裡，還能用 PayMe.tw 嗎？',
    answer: '可以。熱門銀行只是常見查詢入口，完整列表仍包含全台 266 間金融機構與支付機構。你可以直接搜尋銀行名稱或代碼進入對應頁面。',
  },
  {
    question: '銀行頁顯示「未收到錯誤回報」代表官方保證支援嗎？',
    answer: '不是。這代表目前 PayMe.tw 尚未整理到該銀行的明確錯誤回報，但仍建議你首次使用時先用小額轉帳測試一次。',
  },
  {
    question: '為什麼要從銀行頁再進入 PayMe.tw 收款工具？',
    answer: '銀行頁主要回答「這家銀行能不能掃 TWQR、怎麼掃、要注意什麼」，而 PayMe.tw 首頁則是實際建立收款碼與分帳連結的工具入口。',
  },
];

export default function BanksPage() {
  const banks = getBanks();
  const popularBanks = POPULAR_BANK_CODES
    .map((code) => banks.find((bank) => bank.code === code))
    .filter((bank): bank is (typeof banks)[number] => Boolean(bank));
  const verifiedCount = banks.filter((bank) => bank.status === 'verified').length;
  const reportedCount = banks.filter((bank) => bank.status === 'reported_issues').length;

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'TWQR 支援銀行列表',
    description: '全台金融機構與支付機構 TWQR 掃碼轉帳支援狀態一覽',
    numberOfItems: banks.length,
    itemListElement: banks.map((bank, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: bank.name,
      url: `https://payme.tw/banks/${bank.code}`,
    })),
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <header className="mb-12">
          <h1 className="text-3xl font-bold mb-3">TWQR 支援銀行列表與熱門銀行查詢</h1>
          <p className="marketing-muted max-w-3xl leading-relaxed">
            想查哪家銀行可以掃 TWQR、該從哪裡開始測試，先從這個頁面找熱門銀行與完整支援列表。
            你可以直接進入各銀行頁查看 TWQR 狀態、FAQ 與使用方向，再回到 PayMe.tw 建立收款碼。
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3 mb-10">
          <div className="marketing-card-subtle p-5">
            <p className="text-sm text-slate-500">支援對象總數</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{banks.length}</p>
            <p className="mt-2 text-sm text-slate-600">涵蓋銀行、支付機構、農漁會與地方金融機構</p>
          </div>
          <div className="marketing-card-subtle p-5">
            <p className="text-sm text-slate-500">{verifiedCount > 0 ? '已有使用回報' : '使用回報整理中'}</p>
            <p className="mt-2 text-3xl font-bold text-green-700">{verifiedCount > 0 ? verifiedCount : '—'}</p>
            <p className="mt-2 text-sm text-slate-600">
              {verifiedCount > 0
                ? '代表目前整理到相對正向的 TWQR 使用訊號'
                : '目前仍在累積成功回報，建議先從熱門銀行與未收到錯誤回報的銀行開始小額測試'}
            </p>
          </div>
          <div className="marketing-card-subtle p-5">
            <p className="text-sm text-slate-500">有問題回報</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">{reportedCount}</p>
            <p className="mt-2 text-sm text-slate-600">建議先查看注意事項並以小額轉帳測試</p>
          </div>
        </section>

        <section className="mb-10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold">熱門銀行入口</h2>
              <p className="marketing-muted text-sm mt-1">先從高搜尋量銀行開始，看狀態與常見問題，再進到完整列表搜尋其他銀行。</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {popularBanks.map((bank) => (
              <Link
                key={bank.code}
                href={`/banks/${bank.code}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm shadow-sky-100/60 transition-colors hover:bg-slate-50"
              >
                <span>{bank.shortName}</span>
                <span className="text-slate-400 font-mono">{bank.code}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="marketing-card-subtle mb-8 p-4 text-sm text-slate-600 space-y-1">
          <p>🏦 未收到錯誤回報　✅ 已有使用回報　⚠️ 有問題回報</p>
          <p>如遇到掃碼問題，請先從銀行 App 的「掃碼轉帳」或 TWQR 相關功能進入，再重新測試。</p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">完整銀行與支付機構列表</h2>
          <BankList banks={banks} />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">常見問題</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="marketing-card group">
                <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-slate-900 list-none flex items-center justify-between">
                  {item.question}
                  <span className="text-slate-400 group-open:rotate-45 transition-transform duration-200 text-lg">+</span>
                </summary>
                <div className="px-6 pb-4 text-sm text-slate-600 leading-relaxed">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900">延伸閱讀：TWQR 是什麼？</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              如果你想先理解 TWQR 的原理、為什麼不同銀行可以掃同一張 QR Code，以及這種標準怎麼運作，可以先看 TWQR 介紹頁。
            </p>
            <Link
              href="/twqr"
              className="mt-4 inline-block text-sm font-medium text-indigo-700 transition-colors hover:text-indigo-800"
            >
              了解 TWQR 標準 →
            </Link>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900">下一步：建立收款碼或分帳連結</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              查完銀行狀態後，就可以直接回到 PayMe.tw 產生收款 QR Code、平均分帳或多人拆帳連結。
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-blue-700 transition-colors hover:text-blue-800"
            >
              開始使用 PayMe.tw →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
