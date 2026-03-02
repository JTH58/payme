import type { QrStyleConfig, ThemePreset } from '@/types/qr-style';

/** 預設 QR 樣式 */
export const DEFAULT_QR_STYLE: QrStyleConfig = {
  dotStyle: 'square',
  dotColor: '#000000',
  dotGradient: null,
  eyeStyle: 'square',
  eyeColor: null,
  backgroundColor: '#FFFFFF',
  centerLogo: 'payme',
  errorCorrection: 'Q',
} as const;

/** 系統內建主題預設（唯讀） */
export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: 'classic',
    name: '經典黑',
    style: {
      dotStyle: 'square',
      dotColor: '#000000',
      dotGradient: null,
      eyeStyle: 'square',
      eyeColor: null,
      backgroundColor: '#FFFFFF',
      centerLogo: 'payme',
      errorCorrection: 'Q',
    },
  },
  {
    id: 'purple',
    name: '品牌紫',
    style: {
      dotStyle: 'rounded',
      dotColor: '#7C3AED',
      dotGradient: { color1: '#7C3AED', color2: '#A78BFA', angle: 135 },
      eyeStyle: 'rounded',
      eyeColor: null,
      backgroundColor: '#FFFFFF',
      centerLogo: 'payme',
      errorCorrection: 'Q',
    },
  },
  {
    id: 'ocean',
    name: '海洋藍',
    style: {
      dotStyle: 'dots',
      dotColor: '#0369A1',
      dotGradient: { color1: '#0369A1', color2: '#38BDF8', angle: 135 },
      eyeStyle: 'rounded',
      eyeColor: null,
      backgroundColor: '#F0F9FF',
      centerLogo: 'payme',
      errorCorrection: 'Q',
    },
  },
  {
    id: 'warm',
    name: '暖陽橘',
    style: {
      dotStyle: 'rounded',
      dotColor: '#EA580C',
      dotGradient: { color1: '#EA580C', color2: '#FB923C', angle: 135 },
      eyeStyle: 'rounded',
      eyeColor: null,
      backgroundColor: '#FFF7ED',
      centerLogo: 'payme',
      errorCorrection: 'Q',
    },
  },
  {
    id: 'minimal',
    name: '極簡圓',
    style: {
      dotStyle: 'dots',
      dotColor: '#374151',
      dotGradient: null,
      eyeStyle: 'rounded',
      eyeColor: null,
      backgroundColor: '#FFFFFF',
      centerLogo: 'none',
      errorCorrection: 'Q',
    },
  },
  {
    id: 'forest',
    name: '森林綠',
    style: {
      dotStyle: 'rounded',
      dotColor: '#15803D',
      dotGradient: { color1: '#15803D', color2: '#4ADE80', angle: 135 },
      eyeStyle: 'square',
      eyeColor: null,
      backgroundColor: '#F0FDF4',
      centerLogo: 'payme',
      errorCorrection: 'Q',
    },
  },
] as const;
