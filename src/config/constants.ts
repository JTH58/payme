/** 服務費費率 10% */
export const SERVICE_CHARGE_MULTIPLIER = 1.1;

/** 短連結服務 API (s.payme.tw) */
export const SHORTENER_API_URL = 'https://s.payme.tw';

/**
 * Z-Index Scale（文件化用途）
 * z-50: Radix UI 元件（Dialog, Popover, Navbar）— shadcn 預設，不可更動
 * z-[60]: 全頁載入遮罩（需在 Navbar 之上）
 * z-[9999]: 全螢幕 QR（需在所有元素之上）
 */
export const Z_INDEX = {
  LOADING_CURTAIN: 60,
  FULLSCREEN: 9999,
} as const;
