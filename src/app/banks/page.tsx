import type { Metadata } from 'next';
import { getBanks } from '@/modules/banks/utils/get-banks';
import { BankList } from '@/modules/banks/components/bank-list';

export const metadata: Metadata = {
  title: 'TWQR 支援銀行列表 | PayMe.tw — 台灣通用收款碼',
  description: 'PayMe.tw 支援全台 266 間金融機構 TWQR 掃碼轉帳。查詢您的銀行是否支援，一鍵產生收款 QR Code，純前端運算，資料不回傳。',
  openGraph: {
    title: 'TWQR 支援銀行列表 | PayMe.tw',
    description: '全台 266 間金融機構 TWQR 掃碼轉帳支援狀態一覽',
    url: 'https://payme.tw/banks',
  },
};

export default function BanksPage() {
  const banks = getBanks();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'TWQR 支援銀行列表',
    description: '全台金融機構 TWQR 掃碼轉帳支援狀態一覽',
    numberOfItems: banks.length,
    itemListElement: banks.map((bank, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: bank.name,
      url: `https://payme.tw/banks/${bank.code}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">支援銀行列表</h1>
        <p className="text-white/60 mb-8">
          全台 {banks.length} 間金融機構 TWQR 掃碼轉帳支援狀態
        </p>

        <div className="mb-8 p-4 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 space-y-1">
          <p>🏦 未收到錯誤回報　✅ 已驗證可用　⚠️ 有問題回報</p>
          <p>如遇到掃碼問題，請開啟您的銀行 App 的「掃碼轉帳」功能後再次嘗試。</p>
        </div>

        <BankList banks={banks} />
      </div>
    </>
  );
}
