/** 點陣模組形狀 */
export type DotStyle = 'square' | 'rounded' | 'dots';

/** 定位圖形形狀 */
export type EyeStyle = 'square' | 'rounded';

/** 中央標誌模式 */
export type CenterLogo = 'payme' | 'none';

/** 點陣漸層色（null = 純色） */
export interface DotGradient {
  color1: string;
  color2: string;
  angle: number;
}

/** QR Code 視覺外觀的完整設定值（Aggregate Root） */
export interface QrStyleConfig {
  dotStyle: DotStyle;
  dotColor: string;
  dotGradient: DotGradient | null;
  eyeStyle: EyeStyle;
  eyeColor: string | null;
  backgroundColor: string;
  centerLogo: CenterLogo;
  errorCorrection: 'Q' | 'H';
}

/** 系統內建主題預設 */
export interface ThemePreset {
  id: string;
  name: string;
  style: QrStyleConfig;
}
