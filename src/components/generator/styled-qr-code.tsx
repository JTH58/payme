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

  // Dynamic import + initial render
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const QRCodeStyling = (await import('qr-code-styling')).default;
      if (cancelled) return;

      const opts = buildOptions(data, style, size);
      const qr = new QRCodeStyling(opts);
      qrRef.current = qr;

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        qr.append(containerRef.current);
      }
      setReady(true);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  // Update on prop changes (after initial mount)
  useEffect(() => {
    if (!ready || !qrRef.current) return;

    const opts = buildOptions(data, style, size);
    qrRef.current.update(opts);
  }, [data, style, size, ready]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size, lineHeight: 0 }}
    />
  );
}
