"use client";

import React, { useEffect, useRef, useState } from 'react';
import type { QrStyleConfig } from '@/types/qr-style';
import type { Options, DotType, CornerSquareType, CornerDotType } from 'qr-code-styling';
import { QR_CENTER_LABEL } from './qr-brand-card';

/** Map our DotStyle to qr-code-styling DotType */
function mapDotType(s: QrStyleConfig['dotStyle']): DotType {
  switch (s) {
    case 'rounded': return 'rounded';
    case 'dots': return 'dots';
    default: return 'square';
  }
}

/** Map our EyeStyle to qr-code-styling corner types */
function mapCornerSquareType(s: QrStyleConfig['eyeStyle']): CornerSquareType {
  return s === 'rounded' ? 'extra-rounded' : 'square';
}
function mapCornerDotType(s: QrStyleConfig['eyeStyle']): CornerDotType {
  return s === 'rounded' ? 'dot' : 'square';
}

/** Build qr-code-styling Options from our QrStyleConfig */
function buildOptions(data: string, style: QrStyleConfig, size: number): Options {
  const dotColor = style.dotGradient ? style.dotGradient.color1 : style.dotColor;
  const eyeColor = style.eyeColor ?? dotColor;

  const opts: Options = {
    type: 'canvas',
    width: size,
    height: size,
    margin: 0,
    data,
    qrOptions: {
      errorCorrectionLevel: style.errorCorrection,
    },
    dotsOptions: {
      type: mapDotType(style.dotStyle),
      color: dotColor,
    },
    cornersSquareOptions: {
      type: mapCornerSquareType(style.eyeStyle),
      color: eyeColor,
    },
    cornersDotOptions: {
      type: mapCornerDotType(style.eyeStyle),
      color: eyeColor,
    },
    backgroundOptions: {
      color: style.backgroundColor,
    },
  };

  // Gradient
  if (style.dotGradient) {
    const rad = (style.dotGradient.angle * Math.PI) / 180;
    opts.dotsOptions!.gradient = {
      type: 'linear',
      rotation: rad,
      colorStops: [
        { offset: 0, color: style.dotGradient.color1 },
        { offset: 1, color: style.dotGradient.color2 },
      ],
    };
  }

  // Center logo
  if (style.centerLogo === 'payme') {
    opts.image = QR_CENTER_LABEL;
    opts.imageOptions = {
      hideBackgroundDots: true,
      imageSize: 0.35,
      margin: 2,
      saveAsBlob: false,
    };
  }

  return opts;
}

interface StyledQrCodeProps {
  data: string;
  style: QrStyleConfig;
  size?: number;
  className?: string;
}

export function StyledQrCode({ data, style, size = 200, className }: StyledQrCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<InstanceType<typeof import('qr-code-styling').default> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  // Dynamic import + initial render
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const mod = await import('qr-code-styling');
        const QRCodeStyling = mod.default;
        if (cancelled) return;

        if (!QRCodeStyling) {
          console.error('[StyledQrCode] qr-code-styling default export is undefined');
          setError(true);
          return;
        }

        const opts = buildOptions(data, style, size);
        const qr = new QRCodeStyling(opts);
        qrRef.current = qr;

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          qr.append(containerRef.current);
        }
        setReady(true);
      } catch (err) {
        console.error('[StyledQrCode] Failed to initialize:', err);
        if (!cancelled) setError(true);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  // Update on prop changes (after initial mount)
  useEffect(() => {
    if (!ready || !qrRef.current) return;

    try {
      const opts = buildOptions(data, style, size);
      qrRef.current.update(opts);
    } catch (err) {
      console.error('[StyledQrCode] Failed to update:', err);
    }
  }, [data, style, size, ready]);

  if (error) {
    // Fallback: plain text indication for debugging
    return (
      <div
        className={className}
        style={{ width: size, height: size, lineHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: 8 }}
      >
        <span style={{ fontSize: 12, color: '#9ca3af' }}>QR 載入失敗</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size, lineHeight: 0 }}
    />
  );
}
