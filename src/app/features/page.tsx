import type { Metadata } from 'next';
import Link from 'next/link';
import {
  EyeOff,
  Zap,
  Building2,
  Code,
  WifiOff,
  Share2,
  Calculator,
  CreditCard,
  DollarSign,
  QrCode,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import featuresData from '@/data/features.json';

const ICON_MAP: Record<string, LucideIcon> = {
  EyeOff,
  Zap,
  Building2,
  Code,
  WifiOff,
  Share2,
  Calculator,
  CreditCard,
  DollarSign,
  QrCode,
};

export const metadata: Metadata = {
  title: '功能特色 — 免費開源收款碼產生器 | PayMe.tw',
  description:
    '了解 PayMe.tw 的核心功能：隱私優先、極速產生、全台 266 間銀行支援、開源透明、PWA 離線使用、密碼保護分享、分帳功能。',
  openGraph: {
    title: '功能特色 — 免費開源收款碼產生器 | PayMe.tw',
    description:
      '隱私優先、極速產生、全台支援、開源透明的台灣通用收款碼產生器',
    url: 'https://payme.tw/features',
  },
};

export default function FeaturesPage() {
  const { hero, highlights, tutorial, faq, cta } = featuresData;

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
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <h1 className="text-3xl font-bold mb-2">{hero.title}</h1>
        <p className="text-white/60 mb-12">{hero.subtitle}</p>

        {/* Highlights Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-16">
          {highlights.map((item) => {
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

        {/* Tutorial Steps */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-2">{tutorial.title}</h2>
          <p className="text-white/60 text-sm mb-8">{tutorial.subtitle}</p>
          <div className="space-y-4">
            {tutorial.steps.map((step) => {
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
