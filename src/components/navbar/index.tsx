"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Github, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PwaShield } from '@/components/pwa-shield';
import { SettingsMenu } from './settings-menu';

function ThreadsIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017C1.5 8.417 2.35 5.56 3.995 3.509 5.845 1.205 8.598.024 12.179 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.278 3.257-.753.931-1.778 1.482-3.048 1.636-1.394.17-2.693-.15-3.654-.9-.88-.687-1.426-1.672-1.535-2.774-.2-2.003.939-3.57 3.12-4.298.916-.305 1.957-.467 3.089-.485.68.005 1.349.052 1.994.14-.073-.468-.194-.898-.367-1.263-.39-.823-1.07-1.263-2.027-1.308-1.263-.06-2.37.358-2.484.417l-.759-1.894c.159-.066 1.555-.62 3.324-.552 1.474.056 2.642.663 3.378 1.756.605.897.918 2.09.933 3.548l.009.052c.729.333 1.357.772 1.863 1.303 1.025 1.074 1.592 2.533 1.592 4.1-.008 2.317-1.04 4.322-2.988 5.812C17.735 23.269 15.27 23.98 12.186 24zm-.09-10.684c-.87.02-1.658.13-2.343.333-1.34.397-2.073 1.178-1.987 2.117.056.596.348 1.098.844 1.455.56.402 1.335.587 2.18.52.94-.073 1.658-.433 2.132-1.07.422-.567.713-1.39.83-2.479-.546-.1-1.1-.151-1.656-.151v.275z" />
    </svg>
  );
}

const NAV_LINK_CLASS = "relative text-xs font-medium text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-0 hover:after:w-4/5 after:h-px after:bg-white/40 after:transition-all after:duration-300 after:rounded-full";

const MOBILE_LINK_CLASS = "flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors px-4 py-3 rounded-lg hover:bg-white/5";

interface NavbarProps {
  className?: string;
  onBackupClick?: () => void;
}

export function Navbar({ className, onBackupClick }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  // Click-outside to close mobile menu
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        hamburgerRef.current && !hamburgerRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <nav className={cn(
      "relative z-50 w-full border-b border-white/5 bg-[#020617]/50 backdrop-blur-md pt-[env(safe-area-inset-top)]",
      className
    )}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10 shadow-lg shadow-blue-500/10">
            <Image
              src="/logo.png"
              alt="PayMe Logo"
              fill
              className="object-cover"
            />
          </div>
          <span className="text-white font-semibold tracking-tight text-lg">
            PayMe<span className="text-blue-400">.tw</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/banks" className={cn(NAV_LINK_CLASS, isActive('/banks') && 'text-white/90 after:w-4/5')}>
              支援銀行
            </Link>
            <Link href="/features" className={cn(NAV_LINK_CLASS, isActive('/features') && 'text-white/90 after:w-4/5')}>
              功能特色
            </Link>
            <Link href="/safety" className={cn(NAV_LINK_CLASS, isActive('/safety') && 'text-white/90 after:w-4/5')}>
              防詐資訊
            </Link>
            <a
              href="https://www.threads.net/@payme.tw"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Threads"
              className={cn(NAV_LINK_CLASS, "flex items-center gap-1.5")}
            >
              <ThreadsIcon size={14} />
              <span>Threads</span>
            </a>
            <a
              href="https://github.com/JTH58/payme"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(NAV_LINK_CLASS, "flex items-center gap-2")}
            >
              <Github size={14} />
              <span>Star on GitHub</span>
            </a>
          </div>

          {onBackupClick && <SettingsMenu onBackupClick={onBackupClick} />}

          <PwaShield />

          {/* Mobile hamburger button */}
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? '關閉選單' : '開啟選單'}
            className="md:hidden flex items-center text-white/60 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/5"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {isMenuOpen && (
        <div ref={menuRef} className="md:hidden absolute left-0 right-0 top-full border-t border-white/5 bg-[#020617]/95 backdrop-blur-md shadow-lg shadow-black/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col gap-1">
            <Link
              href="/banks"
              className={cn(MOBILE_LINK_CLASS, isActive('/banks') && 'text-white bg-white/5 border-l-2 border-blue-400')}
              onClick={() => setIsMenuOpen(false)}
            >
              支援銀行
            </Link>
            <Link
              href="/features"
              className={cn(MOBILE_LINK_CLASS, isActive('/features') && 'text-white bg-white/5 border-l-2 border-blue-400')}
              onClick={() => setIsMenuOpen(false)}
            >
              功能特色
            </Link>
            <Link
              href="/safety"
              className={cn(MOBILE_LINK_CLASS, isActive('/safety') && 'text-white bg-white/5 border-l-2 border-blue-400')}
              onClick={() => setIsMenuOpen(false)}
            >
              防詐資訊
            </Link>
            <a
              href="https://www.threads.net/@payme.tw"
              target="_blank"
              rel="noopener noreferrer"
              className={MOBILE_LINK_CLASS}
              onClick={() => setIsMenuOpen(false)}
            >
              <ThreadsIcon size={16} />
              Threads
            </a>
            <a
              href="https://github.com/JTH58/payme"
              target="_blank"
              rel="noopener noreferrer"
              className={MOBILE_LINK_CLASS}
              onClick={() => setIsMenuOpen(false)}
            >
              <Github size={16} />
              Star on GitHub
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
