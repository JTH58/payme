'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import guideData from '@/data/guide.json';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioId: string;
}

export function HelpDialog({ open, onOpenChange, scenarioId }: HelpDialogProps) {
  const [gifError, setGifError] = useState(false);

  const scenario = guideData.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) setGifError(false);
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{scenario.title}</DialogTitle>
          <DialogDescription>{scenario.description}</DialogDescription>
        </DialogHeader>

        {/* GIF Preview */}
        <div className="rounded-lg overflow-hidden bg-white/5">
          {gifError ? (
            <div className="flex flex-col items-center justify-center py-8 text-white/40">
              <ImageOff size={32} className="mb-2" />
              <p className="text-sm">圖片載入失敗</p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={scenario.gif}
              alt={scenario.title}
              className="w-full"
              onError={() => setGifError(true)}
            />
          )}
        </div>

        {/* Link to full guide */}
        <div className="text-center">
          <Link
            href={`/guide#${scenarioId}`}
            onClick={() => onOpenChange(false)}
            className="text-sm text-blue-400 hover:underline"
          >
            查看完整教學 →
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
