'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings, DatabaseBackup, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsMenuProps {
  onBackupClick: () => void;
  onQrStyleClick?: () => void;
}

export function SettingsMenu({ onBackupClick, onQrStyleClick }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        aria-label="設定"
        className="flex items-center text-white/60 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/5"
      >
        <Settings size={14} />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 w-40 rounded-xl bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50"
        >
          {onQrStyleClick && (
            <button
              type="button"
              onClick={() => { setOpen(false); onQrStyleClick(); }}
              className={MENU_ITEM_CLASS}
            >
              <Palette size={14} />
              QR Code 樣式
            </button>
          )}
          <button
            type="button"
            onClick={() => { setOpen(false); onBackupClick(); }}
            className={MENU_ITEM_CLASS}
          >
            <DatabaseBackup size={14} />
            備份與還原
          </button>
        </div>
      )}
    </div>
  );
}

const MENU_ITEM_CLASS = cn(
  "flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
);
