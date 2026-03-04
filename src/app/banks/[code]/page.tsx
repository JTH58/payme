import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBanks, getBankByCode } from '@/modules/banks/utils/get-banks';
import { BankDetail } from '@/modules/banks/components/bank-detail';

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateStaticParams() {
  return getBanks().map((bank) => ({ code: bank.code }));
}

const STATUS_META_LABELS: Record<string, string> = {
  no_reports: '未收到錯誤回報',
  verified: '已驗證可用',
  reported_issues: '有問題回報',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const bank = getBankByCode(code);
  if (!bank) return {};

  const statusLabel = STATUS_META_LABELS[bank.status] ?? '未收到錯誤回報';

  return {
    title: `${bank.name} (${bank.code}) TWQR 掃碼轉帳 | PayMe.tw — 台灣通用收款碼`,
    description: `${bank.name}（${bank.code}）用戶支援 TWQR 掃碼轉帳，各大銀行 App 皆可掃描付款。目前支援狀態：${statusLabel}。搭配 PayMe.tw 免費客製化您的專屬 TWQR 收款碼，收款分帳都方便！`,
    openGraph: {
      title: `${bank.name} (${bank.code}) TWQR 掃碼轉帳 | PayMe.tw`,
      description: `${bank.shortName}（${bank.code}）支援 TWQR 掃碼轉帳，搭配 PayMe.tw 免費產生專屬收款 QR Code，跨行互通、資料不回傳。`,
      url: `https://payme.tw/banks/${bank.code}`,
    },
  };
}

export default async function BankDetailPage({ params }: PageProps) {
  const { code } = await params;
  const bank = getBankByCode(code);

  if (!bank) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FinancialService',
    name: bank.name,
    alternateName: bank.shortName,
    identifier: bank.code,
    url: `https://payme.tw/banks/${bank.code}`,
    areaServed: {
      '@type': 'Country',
      name: 'Taiwan',
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://payme.tw/' },
      { '@type': 'ListItem', position: 2, name: '支援銀行列表', item: 'https://payme.tw/banks' },
      { '@type': 'ListItem', position: 3, name: bank.name },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div className="max-w-xl mx-auto px-6 py-12">
        <BankDetail bank={bank} />
      </div>
    </>
  );
}
