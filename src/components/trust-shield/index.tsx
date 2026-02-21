'use client';

import { Fingerprint } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTrustShield, type TrustStatus } from './use-trust-shield';

const STATUS_CONFIG: Record<TrustStatus, {
  dotColor: string;
  label: string;
  description: string;
}> = {
  checking: {
    dotColor: 'bg-white/40 animate-pulse',
    label: '正在校驗版本...',
    description: '正在與開源紀錄比對中。',
  },
  verified: {
    dotColor: 'bg-emerald-400',
    label: '開源版本已校驗',
    description: '此版本與開源主分支一致，程式碼公開透明。',
  },
  offline: {
    dotColor: 'bg-blue-400',
    label: '離線模式',
    description: '目前無法連線校驗，使用上次校驗結果。',
  },
  unknown: {
    dotColor: 'bg-yellow-400',
    label: '版本尚未校驗',
    description: '此為開發版本或尚未推送至公開倉庫，無法校驗。',
  },
  tampered: {
    dotColor: 'bg-red-400',
    label: '版本與紀錄不符',
    description: '此版本與開源紀錄不符，請謹慎使用。',
  },
};

export function TrustShield() {
  const { status, sha, buildTime } = useTrustShield();
  const config = STATUS_CONFIG[status];
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;
  const commitUrl = repo && sha ? `https://github.com/${repo}/commit/${sha}` : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-[10px] text-white/50 hover:text-white/70 cursor-pointer"
          aria-label="開源透明校驗"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
          <Fingerprint size={10} />
          <span>{sha ? sha.slice(0, 7) : 'dev'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 text-xs space-y-2">
        <div className="font-medium text-white/80 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          {config.label}
        </div>
        <p className="text-white/50 leading-relaxed">{config.description}</p>
        {sha && (
          <div className="space-y-1 text-white/40">
            <div>SHA: <span className="font-mono text-white/60">{sha.slice(0, 7)}</span></div>
            {buildTime && <div>建構時間: {buildTime}</div>}
            {commitUrl && (
              <a
                href={commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                查看原始碼 →
              </a>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
