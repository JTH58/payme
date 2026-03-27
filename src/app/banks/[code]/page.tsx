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
  verified: '已有使用回報',
  reported_issues: '有問題回報',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const bank = getBankByCode(code);
  if (!bank) return {};

  const statusLabel = STATUS_META_LABELS[bank.status] ?? '未收到錯誤回報';
  const pageTitle = `${bank.name} TWQR 掃碼轉帳支援嗎？使用方式與狀態整理 | PayMe.tw`;
  const pageDescription = `${bank.seo.seoIntro} 目前狀態：${statusLabel}。${bank.seo.statusSummary}`;

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: `/banks/${bank.code}`,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
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

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: bank.seo.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${bank.name} TWQR 掃碼轉帳支援狀態`,
    url: `https://payme.tw/banks/${bank.code}`,
    dateModified: bank.seo.lastReviewedAt,
    description: bank.seo.seoIntro,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />
      <div className="max-w-xl mx-auto px-6 py-12">
        <BankDetail bank={bank} />
      </div>
    </>
  );
}
