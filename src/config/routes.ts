export type AppMode = 'pay' | 'bill';

export interface RouteSegment {
  key: string; // 對應程式內部的參數名稱 (e.g., 'title', 'pax')
  description: string; // 欄位說明 (供文件或 AI 參考)
  isOptional?: boolean; // 是否為選填參數
}

export interface RouteConfig {
  mode: AppMode;
  label: string; // 模式顯示名稱 (中文)
  prefix: string; // URL 前綴 (pay, bill)
  segments: RouteSegment[]; // 路徑結構定義

  // 預設 OG 圖片路徑 (可各模式獨立設定)
  ogImage: string;

  // Edge 端專用的 Meta 產生器 (純邏輯，不依賴 React)
  metaGenerator: (params: Record<string, string | undefined>) => {
    title: string;
    description: string;
    image: string; // OG 圖片完整路徑
  };
}

/**
 * Segment Key 常數 (Single Source of Truth)
 * APP_ROUTES 的 segments 與 Generator 的 pathParams 都必須引用此常數，
 * 避免兩端各自硬編碼字串導致改名時不同步。
 */
export const SEG = {
  TITLE: 'title',
  PAX: 'pax',
  TEMPLATE_ID: 'templateId',
} as const;

/**
 * 全站路由定義 (Single Source of Truth)
 * 用於 Cloudflare Edge (OG Tag 注入) 與 Client (路由解析)
 */
export const APP_ROUTES: Record<string, RouteConfig> = {
  // === 收款模式 (Payment) ===
  // 範例: /pay/聚餐費/4
  pay: {
    mode: 'pay',
    label: '收款',
    prefix: 'pay',
    segments: [
      { key: SEG.TITLE, description: '收款標題', isOptional: true },
      { key: SEG.PAX, description: '分攤人數', isOptional: true }
    ],
    ogImage: '/og-simple.jpg',
    metaGenerator: (params) => {
      const title = decodeURIComponent(params[SEG.TITLE] || '');
      const pax = params[SEG.PAX] ? ` (${params[SEG.PAX]}人分攤)` : '';
      return {
        title: title ? `${title}${pax} - 收款通知` : 'PayMe.TW 收款',
        description: pax
          ? '自動計算每人應付金額，支援服務費設定。'
          : '點擊連結查看詳細金額並進行轉帳。',
        image: '/og-simple.jpg',
      };
    }
  },

  // === 分帳模式 (Bill) ===
  // 範例: /bill/KTV趴/tpl_netflix
  bill: {
    mode: 'bill',
    label: '分帳',
    prefix: 'bill',
    segments: [
      { key: SEG.TITLE, description: '帳單標題', isOptional: true },
      { key: SEG.TEMPLATE_ID, description: '模板 ID (e.g., netflix)', isOptional: true }
    ],
    ogImage: '/og-bill.jpg',
    metaGenerator: (params) => {
      const title = decodeURIComponent(params[SEG.TITLE] || '詳細帳單');
      return {
        title: `${title} - PayMe.TW 分帳`,
        description: '點擊連結查看帳單細項，認領屬於您的消費項目。',
        image: '/og-bill.jpg',
      };
    }
  }
};

export const VALID_MODES: readonly AppMode[] = ['pay', 'bill'] as const;

export type AppRoutePrefix = keyof typeof APP_ROUTES;

/** 根據 AppMode 取得對應的 RouteConfig */
export const getRouteConfig = (mode: AppMode): RouteConfig => {
  const entry = Object.values(APP_ROUTES).find(config => config.mode === mode);
  if (!entry) throw new Error(`No route config for mode: ${mode}`);
  return entry;
};
