"use client";

import React, { forwardRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

/** QR 中央品牌文字 — 向量 SVG，不模糊、不需載入外部資源 */
export const QR_CENTER_LABEL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="48">' +
  '<text x="90" y="24" dominant-baseline="central" text-anchor="middle" ' +
  'font-family="system-ui,-apple-system,sans-serif" font-size="36" font-weight="700" fill="#374151">' +
  'PayMe.TW</text></svg>'
)}`;

interface QrBrandCardProps {
  variant: 'payment' | 'share';
  qrValue: string;
  // Payment variant props
  bankName?: string;
  accountNumber?: string;
  // Share variant props
  billTitle?: string;
  billTotal?: string;
  memberCount?: number;
}

export const QrBrandCard = forwardRef<HTMLDivElement, QrBrandCardProps>(
  ({ variant, qrValue, bankName, accountNumber, billTitle, billTotal, memberCount }, ref) => {
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
      setHasAnimated(true);
    }, []);

    return (
      <div
        ref={ref}
        className={cn(
          "bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-xl",
          !hasAnimated && "animate-in fade-in zoom-in-95 duration-500"
        )}
      >
        {/* Header: variant-specific info */}
        {variant === 'payment' ? (
          <div className="text-center space-y-1">
            {bankName && (
              <p className="text-sm font-medium text-gray-700">{bankName}</p>
            )}
            {accountNumber && (
              <p className="text-xs text-gray-500 font-mono">{accountNumber}</p>
            )}
          </div>
        ) : (
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-gray-700">
              {billTitle || '分帳明細'}
            </p>
            <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
              {billTotal && <span>NT$ {billTotal}</span>}
              {memberCount != null && <span>{memberCount} 人分攤</span>}
            </div>
          </div>
        )}

        {/* QR Code */}
        <QRCodeSVG
          value={qrValue}
          size={200}
          level="Q"
          includeMargin={false}
          imageSettings={{
            src: QR_CENTER_LABEL,
            x: undefined,
            y: undefined,
            height: 16,
            width: 60,
            excavate: true,
          }}
        />

        {/* Brand footer */}
        <p className="text-[10px] text-gray-400 tracking-widest">
          PayMe.TW
        </p>
      </div>
    );
  }
);

QrBrandCard.displayName = 'QrBrandCard';
