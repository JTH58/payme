import type { Metadata } from 'next';
import Link from 'next/link';
import {
  QrCode,
  Calculator,
  Share2,
  Sparkles,
  Download,
  Smartphone,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import guideData from '@/data/guide.json';
import { GuideImage } from './guide-image';

const ICON_MAP: Record<string, LucideIcon> = {
  QrCode,
  Calculator,
  Share2,
  Sparkles,
  Download,
  Smartphone,
};

export const metadata: Metadata = {
  title: '使用教學 — 完整操作指南 | PayMe.tw',
  description:
    '從基本收款到分帳、密碼分享、模板、備份、PWA 安裝，完整圖文教學帶你上手 PayMe.tw 所有功能。',
  openGraph: {
    title: '使用教學 — 完整操作指南 | PayMe.tw',
    description:
      '從基本收款到進階功能，一步步帶你上手 PayMe.tw',
    url: 'https://payme.tw/guide',
  },
};

export default function GuidePage() {
  const { hero, scenarios, cta } = guideData;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: hero.title,
    description: hero.subtitle,
    step: scenarios.flatMap((scenario) =>
      scenario.steps.map((step, idx) => ({
        '@type': 'HowToStep' as const,
        position: idx + 1,
        name: `${scenario.title} — ${step.title}`,
        text: step.description,
      }))
    ),
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

        {/* Scenario Sections */}
        <div className="space-y-16">
          {scenarios.map((scenario) => {
            const Icon = ICON_MAP[scenario.icon];
            return (
              <section key={scenario.id} id={scenario.id}>
                <div className="flex items-center gap-3 mb-2">
                  {Icon && <Icon size={22} className={scenario.iconColor} />}
                  <h2 className="text-xl font-bold">{scenario.title}</h2>
                </div>
                <p className="text-white/50 text-sm mb-6">{scenario.description}</p>

                {/* Steps */}
                <div className="grid md:grid-cols-2 gap-4">
                  {scenario.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 border border-white/10 rounded-xl p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{step.title}</h3>
                          <p className="text-white/50 text-sm leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                      {/* Step image with error fallback */}
                      <div className="mt-3 rounded-lg overflow-hidden bg-white/5">
                        <GuideImage src={step.image} alt={step.title} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-blue-500/10 border border-blue-500/30 rounded-xl p-8 text-center">
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
