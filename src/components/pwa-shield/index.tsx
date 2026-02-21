'use client';

import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, Share, MoreVertical, Monitor } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePwaStatus } from '@/hooks/use-pwa-status';
import { detectPlatform, type Platform } from '@/lib/detect-platform';

function InstallGuide({ platform }: { platform: Platform }) {
  const guides: Record<Platform, { icon: typeof Share; text: string }> = {
    ios: { icon: Share, text: '點選底部分享按鈕 →「加入主畫面」' },
    android: { icon: MoreVertical, text: '點選右上角選單 →「加入主畫面」' },
    desktop: { icon: Monitor, text: '點選網址列右側安裝圖示或選單 →「安裝應用程式」' },
    unknown: { icon: Monitor, text: '透過瀏覽器選單將此網站加入主畫面或安裝為應用程式' },
  };

  const { icon: Icon, text } = guides[platform];

  return (
    <div className="bg-white/5 border border-white/5 rounded-lg p-2 flex items-start gap-2">
      <Icon size={14} className="text-white/40 mt-0.5 shrink-0" />
      <span className="text-white/50 leading-relaxed">{text}</span>
    </div>
  );
}

export function PwaShield() {
  const { isInstalled, canPromptInstall, promptInstall, showBadge, dismissBadge } = usePwaStatus();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>('unknown');

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && showBadge) {
      dismissBadge();
    }
    setOpen(nextOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center text-white/60 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/5"
          aria-label="PWA 安裝狀態"
        >
          {isInstalled ? (
            <ShieldCheck size={14} className="text-emerald-400" />
          ) : (
            <Shield size={14} />
          )}
          {showBadge && !isInstalled && (
            <span
              data-testid="pwa-badge-dot"
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-400 animate-pulse"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" className="w-64 text-xs space-y-2">
        {isInstalled ? (
          <>
            <div className="font-medium text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck size={12} />
              已安裝 — 本地保護模式
            </div>
            <p className="text-white/50 leading-relaxed">
              您正在使用已安裝的本地版本，享有離線存取與更快的啟動速度。
            </p>
          </>
        ) : (
          <>
            <div className="font-medium text-white/70 flex items-center gap-1.5">
              <Shield size={12} />
              尚未安裝
            </div>
            <p className="text-white/50 leading-relaxed">
              將 PayMe.TW 加入主畫面，獲得離線保護與更快的啟動體驗。
            </p>
            {canPromptInstall ? (
              <button
                onClick={promptInstall}
                className="w-full mt-1 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors font-medium"
              >
                安裝 PayMe.TW
              </button>
            ) : (
              <InstallGuide platform={platform} />
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
