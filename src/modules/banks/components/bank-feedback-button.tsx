"use client";

import { useState } from 'react';
import { FeedbackModal } from '@/components/feedback-modal';

interface BankFeedbackButtonProps {
  bankCode: string;
  bankShortName: string;
}

export function BankFeedbackButton({ bankCode, bankShortName }: BankFeedbackButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-white/40 hover:text-white/70 transition-colors text-xs"
      >
        資訊有誤？我要回報問題
      </button>
      <FeedbackModal
        open={open}
        onOpenChange={setOpen}
        initialCategory="bug"
        initialDescription={`[${bankCode}] ${bankShortName} — `}
      />
    </>
  );
}
