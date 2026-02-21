/**
 * localStorage key mapping（Single Source of Truth）
 * 各模組統一從此匯入，避免散落的字串常數
 */
export const STORAGE_KEY = {
  payment: 'payme_data_payment',
  bill: 'payme_data_bill',
  billData: 'payme_data_bill_detail',
  lastMode: 'payme_last_mode',
  simpleInputs: 'payme_simple_inputs',
  accounts: 'payme_accounts',
  pwaPromptDismissed: 'pwa_prompt_dismissed',
  trustShieldCache: 'trust_shield_cache',
  hasVisited: 'payme_has_visited',
} as const;

/**
 * 使用者資料 localStorage key 常數
 * 用於備份/還原功能 — 僅包含使用者個人資料，排除裝置獨立的旗標與快取
 */
export const USER_DATA_KEYS = [
  'payme_data_payment',
  'payme_data_bill',
  'payme_data_bill_detail',
  'payme_last_mode',
  'payme_simple_inputs',
  'payme_accounts',
] as const;

export type UserDataKey = (typeof USER_DATA_KEYS)[number];
