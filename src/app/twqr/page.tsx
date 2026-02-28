import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Smartphone,
  ScanLine,
  CheckCircle,
  Globe,
  ArrowLeftRight,
  Shield,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import twqrData from '@/data/twqr.json';

const ICON_MAP: Record<string, LucideIcon> = {
  Smartphone,
  ScanLine,
  CheckCircle,
  Globe,
  ArrowLeftRight,
  Shield,
};

export const metadata: Metadata = {
  title: 'TWQR 台灣共用支付碼 — 一碼通用跨行轉帳 | PayMe.tw',
  description:
    '了解 TWQR 台灣共用支付碼標準：由財金資訊公司制定，支援全台銀行 App 掃碼轉帳，一碼通用、跨行互通、安全免費。',
  openGraph: {
    title: 'TWQR 台灣共用支付碼 — 一碼通用跨行轉帳 | PayMe.tw',
    description:
      '了解 TWQR 台灣共用支付碼：一碼通用、跨行互通、安全可靠的掃碼轉帳標準',
    url: 'https://payme.tw/twqr',
  },
};

export default function TwqrPage() {
  const { hero, sections, howItWorks, features, faq, cta } = twqrData;

  const faqEntries = faq.items.map((item) => ({
    '@type': 'Question' as const,
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer' as const,
      text: item.answer,
    },
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntries,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero */}
        <h1 className="text-3xl font-bold mb-2">{hero.title}</h1>
        <p className="text-white/60 mb-12">{hero.subtitle}</p>

        {/* Sections */}
        <div className="space-y-8 mb-16">
          {sections.map((section) => (
            <section key={section.id}>
              <h2 className="text-2xl font-bold mb-3">{section.title}</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        {/* Video */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-2">官方介紹影片</h2>
          <p className="text-white/60 text-sm mb-6">金管會製作的 TWQR 台灣共用支付碼介紹</p>
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10">
            <iframe
              src="https://www.youtube-nocookie.com/embed/NLTNt8Z0lFQ"
              title="TWQR 台灣共用支付碼介紹 — 金管會"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </section>

        {/* How It Works Steps */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-2">{howItWorks.title}</h2>
          <p className="text-white/60 text-sm mb-8">{howItWorks.subtitle}</p>
          <div className="space-y-4">
            {howItWorks.steps.map((step) => {
              const Icon = ICON_MAP[step.icon];
              return (
                <div
                  key={step.step}
                  className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-xl p-5"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {Icon && <Icon size={16} className="text-white/40" />}
                      <h3 className="font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-white/50 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-16">
          {features.map((item) => {
            const Icon = ICON_MAP[item.icon];
            return (
              <div
                key={item.id}
                className="bg-white/5 border border-white/10 rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  {Icon && <Icon size={22} className={item.iconColor} />}
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                </div>
                <p className="text-white/50 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">{faq.title}</h2>
          <div className="space-y-4">
            {faq.items.map((item, idx) => (
              <details
                key={idx}
                className="group bg-white/5 border border-white/10 rounded-xl"
              >
                <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-white/90 list-none flex items-center justify-between">
                  {item.question}
                  <span className="text-white/30 group-open:rotate-45 transition-transform duration-200 text-lg">+</span>
                </summary>
                <div className="px-6 pb-4 text-sm text-white/50 leading-relaxed">
                  {item.answer}
                  {'linkHref' in item && (
                    <>
                      {' '}
                      <Link
                        href={(item as { linkHref: string }).linkHref}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {(item as { linkText: string }).linkText}
                      </Link>
                    </>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">{cta.title}</h2>
          <p className="text-white/60 text-sm mb-6">{cta.description}</p>
          <Link
            href={cta.buttonHref}
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-medium px-6 py-3 rounded-full transition-colors"
          >
            {cta.buttonText}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </>
  );
}
