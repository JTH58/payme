import type { Metadata } from 'next';
import {
  AlertTriangle,
  UserX,
  QrCode,
  Shield,
  Phone,
  type LucideIcon,
} from 'lucide-react';
import safetyData from '@/data/safety.json';

const ICON_MAP: Record<string, LucideIcon> = {
  AlertTriangle,
  UserX,
  QrCode,
  Shield,
  Phone,
};

export const metadata: Metadata = {
  title: '防詐資訊 — 安全使用 QR Code 轉帳 | PayMe.tw',
  description:
    '了解常見轉帳詐騙手法、人頭帳戶法律後果、QR Code 掃碼安全守則。PayMe.tw 提醒您提高警覺，保護自身財產安全。',
  openGraph: {
    title: '防詐資訊 — 安全使用 QR Code 轉帳 | PayMe.tw',
    description:
      '了解常見轉帳詐騙手法、人頭帳戶法律後果、QR Code 掃碼安全守則',
    url: 'https://payme.tw/safety',
  },
};

export default function SafetyPage() {
  const { sections, hotline } = safetyData;

  const faqEntries = sections
    .filter((s) => s.faq)
    .map((s) => ({
      '@type': 'Question' as const,
      name: s.faq.question,
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: s.faq.answer,
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
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">防詐資訊</h1>
        <p className="text-white/60 mb-10">
          安全使用 QR Code 轉帳，保護自己也保護他人
        </p>

        <div className="space-y-8">
          {sections.map((section) => {
            const Icon = ICON_MAP[section.icon];
            return (
              <section
                key={section.id}
                className="bg-white/5 border border-white/10 rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  {Icon && <Icon size={22} className={section.iconColor} />}
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                </div>
                <p className="text-white/50 text-sm mb-4">
                  {section.description}
                </p>
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item.title}>
                      <p className="text-white/90 font-medium text-sm">
                        {item.title}
                      </p>
                      <p className="text-white/50 text-sm leading-relaxed">
                        {item.content}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* 165 專線 Callout */}
        <div className="mt-10 bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-white/60 text-sm mb-2">{hotline.description}</p>
          <a
            href={`tel:${hotline.number}`}
            className="text-4xl font-bold text-red-400 hover:text-red-300 transition-colors"
          >
            {hotline.number}
          </a>
          <p className="text-white/70 text-sm mt-2">
            {hotline.label}（{hotline.hours}）
          </p>
        </div>
      </div>
    </>
  );
}
