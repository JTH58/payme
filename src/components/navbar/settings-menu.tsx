'use client';

import { Settings } from 'lucide-react';

interface SettingsMenuProps {
  onBackupClick: () => void;
}

export function SettingsMenu({ onBackupClick }: SettingsMenuProps) {
  return (
    <button
      onClick={onBackupClick}
      aria-label="設定"
      className="flex items-center text-white/60 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/5"
    >
      <Settings size={14} />
    </button>
  );
}
