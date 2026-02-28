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

type Status = 'idle' | 'loading' | 'success' | 'error' | 'rate-limited';
type Category = 'bug' | 'suggestion' | 'other';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: Category;
  initialDescription?: string;
}

export function FeedbackModal({ open, onOpenChange, initialCategory, initialDescription }: FeedbackModalProps) {
  const [category, setCategory] = useState<Category>(initialCategory ?? 'bug');
  const [description, setDescription] = useState(initialDescription ?? '');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isDescriptionValid = description.trim().length >= 10;
  const canSubmit = isDescriptionValid && status !== 'loading';

  const resetForm = () => {
    setCategory(initialCategory ?? 'bug');
    setDescription(initialDescription ?? '');
    setContact('');
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
          type: 'feedback',
          category,
          description: description.trim(),
          ...(contact.trim() ? { contact: contact.trim() } : {}),
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
          <DialogTitle>意見回饋</DialogTitle>
          <DialogDescription>
            回報問題或提出建議，我們會儘快處理
          </DialogDescription>
        </DialogHeader>

        {status === 'success' ? (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-50 fade-in duration-300">
            <CheckCircle className="h-10 w-10 text-green-400 mx-auto" />
            <p className="text-lg font-medium">感謝您的回饋！</p>
            <p className="text-sm text-muted-foreground">視窗即將關閉</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Category */}
            <div className="space-y-1.5">
              <label htmlFor="feedback-category" className="text-sm font-medium">
                類別
              </label>
              <select
                id="feedback-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="bug">Bug 回報</option>
                <option value="suggestion">功能建議</option>
                <option value="other">其他</option>
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="feedback-description" className="text-sm font-medium">
                描述
              </label>
              <textarea
                id="feedback-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="請詳細描述您遇到的問題或建議（至少 10 字）"
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] resize-y"
              />
              {description.length > 0 && !isDescriptionValid && (
                <p className="text-xs text-destructive">至少需要 10 個字元</p>
              )}
            </div>

            {/* Contact (optional) */}
            <div className="space-y-1.5">
              <label htmlFor="feedback-contact" className="text-sm font-medium">
                聯絡方式 <span className="text-muted-foreground">（選填）</span>
              </label>
              <input
                id="feedback-contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Email、Threads 或其他聯絡方式"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
