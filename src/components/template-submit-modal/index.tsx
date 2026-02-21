"use client";

import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TemplateFormState } from '@/modules/feedback/schemas/submit-schema';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'rate-limited';

interface TemplateSubmitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formState: TemplateFormState;
}

export function TemplateSubmitModal({ open, onOpenChange, formState }: TemplateSubmitModalProps) {
  const [authorName, setAuthorName] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const canSubmit = authorName.trim().length > 0 && status !== 'loading';

  const resetForm = () => {
    setAuthorName('');
    setNotes('');
    setStatus('idle');
    setErrorMessage('');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'template',
          authorName: authorName.trim(),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          formState,
          userAgent: navigator.userAgent,
        }),
      });

      if (res.ok) {
        setStatus('success');
        setTimeout(() => {
          resetForm();
          onOpenChange(false);
        }, 2000);
        return;
      }

      const body = await res.json() as { error?: string };

      if (res.status === 429) {
        setStatus('rate-limited');
        setErrorMessage(body.error || '請稍候再試');
        return;
      }

      setStatus('error');
      setErrorMessage(body.error || '送出失敗');
    } catch {
      setStatus('error');
      setErrorMessage('網路錯誤，請檢查連線後重試');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) resetForm();
      onOpenChange(v);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>投稿模板</DialogTitle>
          <DialogDescription>
            分享您設計的消費模板，讓更多人使用
          </DialogDescription>
        </DialogHeader>

        {status === 'success' ? (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-50 fade-in duration-300">
            <CheckCircle className="h-10 w-10 text-green-400 mx-auto" />
            <p className="text-lg font-medium">感謝投稿！</p>
            <p className="text-sm text-muted-foreground">我們會儘快審核您的模板</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Author Name */}
            <div className="space-y-1.5">
              <label htmlFor="template-author" className="text-sm font-medium">
                投稿人名稱
              </label>
              <input
                id="template-author"
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="您的暱稱或名字"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Notes (optional) */}
            <div className="space-y-1.5">
              <label htmlFor="template-notes" className="text-sm font-medium">
                備註 <span className="text-muted-foreground">（選填）</span>
              </label>
              <textarea
                id="template-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="補充說明此模板的使用場景"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
              />
            </div>

            {/* Error messages */}
            {status === 'error' && (
              <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">{errorMessage}</p>
            )}
            {status === 'rate-limited' && (
              <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">{errorMessage || '請稍候再試'}</p>
            )}

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full"
            >
              {status === 'loading' ? '送出中...' : '送出'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
