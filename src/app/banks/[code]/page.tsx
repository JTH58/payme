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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const bank = getBankByCode(code);
  if (!bank) return {};

  return {
    title: `${bank.name} (${bank.code}) TWQR 掃碼轉帳 | PayMe.tw — 台灣通用收款碼`,
    description: `${bank.name}（代碼 ${bank.code}）TWQR 掃碼轉帳支援狀態與操作指南。使用 PayMe.tw 一鍵產生${bank.shortName}收款 QR Code。`,
    openGraph: {
      title: `${bank.name} TWQR 支援狀態 | PayMe.tw`,
      description: `查看 ${bank.shortName} 的 TWQR 掃碼轉帳支援狀態`,
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-xl mx-auto px-6 py-12">
        <BankDetail bank={bank} />
      </div>
    </>
  );
}
