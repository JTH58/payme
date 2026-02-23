import { AppMode } from '@/config/routes';

/** 三種收款子模式 */
export type FormSubMode = 'personal' | 'split' | 'itemized';

/** 輸入方式 */
export type InputMethod = 'total' | 'items';

export interface FormSubModeConfig {
  label: string;
  description: string;
  appMode: AppMode;
  allowedInputMethods: InputMethod[];
  defaultInputMethod: InputMethod;
}

export const FORM_SUB_MODE_CONFIG: Record<FormSubMode, FormSubModeConfig> = {
  personal: {
    label: '個人收款',
    description: '產生個人收款 QR Code',
    appMode: 'pay',
    allowedInputMethods: ['total', 'items'],
    defaultInputMethod: 'total',
  },
  split: {
    label: '平均分帳',
    description: '輸入總金額，自動除以人數',
    appMode: 'pay',
    allowedInputMethods: ['total', 'items'],
    defaultInputMethod: 'total',
  },
  itemized: {
    label: '多人拆帳',
    description: '逐項分配，每人各付不同金額',
    appMode: 'bill',
    allowedInputMethods: ['items'],
    defaultInputMethod: 'items',
  },
};

/** 子模式 → AppMode 映射 */
export function subModeToAppMode(subMode: FormSubMode): AppMode {
  return FORM_SUB_MODE_CONFIG[subMode].appMode;
}

/** 從舊的 AppMode 推導子模式（向後相容） */
export function inferSubMode(mode: AppMode, hasSimpleData?: boolean): FormSubMode {
  if (mode === 'bill') return 'itemized';
  if (hasSimpleData) return 'split';
  return 'personal';
}

export const ALL_SUB_MODES: FormSubMode[] = ['personal', 'split', 'itemized'];
