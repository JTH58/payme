"use client";

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { TrustShield } from '@/components/trust-shield';

interface FooterProps {
  className?: string;
  onFeedbackClick?: () => void;
}

export function Footer({ className, onFeedbackClick }: FooterProps) {
  return (
    <footer className={cn(
      "border-t border-white/5 bg-[#020617]/50 pb-[env(safe-area-inset-bottom)]",
      className
    )}>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* 品牌描述 — 爬蟲可讀 */}
        <div className="text-center space-y-2">
          <p className="text-sm text-white/50">
            <strong className="text-white/70">PayMe.tw</strong> — 開源透明的台灣通用收款碼
          </p>
          <p className="text-xs text-white/30 max-w-lg mx-auto leading-relaxed">
            由使用者瀏覽器直接運算，資料不回傳。支援全台 266 間金融機構 TWQR 掃碼轉帳，
            一鍵產生收款 QR Code，免費、開源、保護您的隱私。
          </p>
        </div>

        {/* 導航連結 — 內部連結有助 SEO */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/40">
          <Link href="/" className="hover:text-white/70 hover:translate-x-0.5 transition-all duration-150">
            首頁 — 產生收款碼
          </Link>
          <Link href="/banks" className="hover:text-white/70 hover:translate-x-0.5 transition-all duration-150">
            支援銀行列表
          </Link>
          <Link href="/safety" className="hover:text-white/70 hover:translate-x-0.5 transition-all duration-150">
            防詐資訊
          </Link>
          <a
            href="https://github.com/JTH58/payme"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub 開源專案 (在新視窗開啟)"
            className="hover:text-white/70 hover:translate-x-0.5 transition-all duration-150"
          >
            GitHub 開源專案
          </a>
          {onFeedbackClick && (
            <button
              type="button"
              onClick={onFeedbackClick}
              className="hover:text-white/70 hover:translate-x-0.5 transition-all duration-150"
            >
              意見回饋
            </button>
          )}
        </nav>

        <div className="text-center text-xs text-white/20 pt-2">
          <p>© 2026 PayMe.tw • 非官方工具，請先小額測試 • Designed for Taiwan</p>
        </div>

        <div className="flex justify-center pt-1">
          <TrustShield />
        </div>
      </div>
    </footer>
  );
}
