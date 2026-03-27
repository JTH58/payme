import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BankList } from '@/modules/banks/components/bank-list';
import { getBankTopicBySlug, getBankTopics, getBanksForTopic } from '@/modules/banks/utils/get-bank-topics';

interface TopicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getBankTopics().map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = getBankTopicBySlug(slug);
  if (!topic) return {};

  return {
    title: `${topic.title} | PayMe.tw`,
    description: topic.description,
    alternates: {
      canonical: `/banks/topic/${topic.slug}`,
    },
    openGraph: {
      title: `${topic.title} | PayMe.tw`,
      description: topic.description,
      url: `https://payme.tw/banks/topic/${topic.slug}`,
    },
  };
}

export default async function BankTopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const topic = getBankTopicBySlug(slug);
  if (!topic) notFound();

  const banks = getBanksForTopic(topic);

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: topic.title,
    description: topic.description,
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
    mainEntity: topic.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://payme.tw/' },
      { '@type': 'ListItem', position: 2, name: '支援銀行列表', item: 'https://payme.tw/banks' },
      { '@type': 'ListItem', position: 3, name: topic.title, item: `https://payme.tw/banks/topic/${topic.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <header className="mb-10">
          <Link href="/banks" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
            ← 返回支援銀行列表
          </Link>
          <h1 className="text-3xl font-bold mt-4 mb-3">{topic.title}</h1>
          <p className="marketing-muted max-w-3xl leading-relaxed">{topic.intro}</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3 mb-10">
          <div className="marketing-card-subtle p-5">
            <p className="text-sm text-slate-500">此主題頁收錄</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{banks.length}</p>
            <p className="mt-2 text-sm text-slate-600">方便你先縮小範圍，再進入個別銀行頁看細節</p>
          </div>
          <div className="marketing-card-subtle p-5">
            <p className="text-sm text-slate-500">閱讀建議</p>
            <p className="mt-2 text-base font-semibold text-slate-900">先看分類，再看單一銀行頁</p>
            <p className="mt-2 text-sm text-slate-600">分類頁適合快速比較，細節仍以個別銀行頁為主</p>
          </div>
          <div className="marketing-card-subtle p-5">
            <p className="text-sm text-slate-500">下一步</p>
            <p className="mt-2 text-base font-semibold text-slate-900">確認狀態後回工具頁</p>
            <p className="mt-2 text-sm text-slate-600">查完銀行狀態，就能直接回到 PayMe.tw 產生收款碼</p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">此主題下的銀行與機構</h2>
          <BankList banks={banks} />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">主題 FAQ</h2>
          <div className="space-y-4">
            {topic.faq.map((item) => (
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
            <h2 className="text-lg font-semibold text-slate-900">延伸閱讀：所有銀行列表</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              如果你要回到完整 266 間金融機構與支付機構列表，可以從支援銀行列表頁直接搜尋名稱或代碼。
            </p>
            <Link href="/banks" className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:text-indigo-800 transition-colors">
              回到支援銀行列表 →
            </Link>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900">下一步：開始建立收款碼</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              看完主題整理後，你可以回到 PayMe.tw 建立收款 QR Code、平均分帳或多人拆帳連結。
            </p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors">
              開始使用 PayMe.tw →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
