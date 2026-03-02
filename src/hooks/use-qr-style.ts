import { useState, useCallback, useEffect } from 'react';
import type { QrStyleConfig } from '@/types/qr-style';
import { DEFAULT_QR_STYLE, THEME_PRESETS } from '@/config/qr-style';
import { STORAGE_KEY } from '@/config/storage-keys';
import { safeGetItem, safeSetItem } from '@/lib/safe-storage';

function loadStyle(): QrStyleConfig {
  const raw = safeGetItem(STORAGE_KEY.qrStyle);
  if (!raw) return DEFAULT_QR_STYLE;
  try {
    const parsed = JSON.parse(raw) as Partial<QrStyleConfig>;
    return { ...DEFAULT_QR_STYLE, ...parsed };
  } catch {
    return DEFAULT_QR_STYLE;
  }
}

function saveStyle(style: QrStyleConfig) {
  safeSetItem(STORAGE_KEY.qrStyle, JSON.stringify(style));
}

/** 找出目前 style 匹配的預設主題 ID（完全相等才算），null = dirty */
function findMatchingPreset(style: QrStyleConfig): string | null {
  return THEME_PRESETS.find(p =>
    p.style.dotStyle === style.dotStyle &&
    p.style.dotColor === style.dotColor &&
    JSON.stringify(p.style.dotGradient) === JSON.stringify(style.dotGradient) &&
    p.style.eyeStyle === style.eyeStyle &&
    p.style.eyeColor === style.eyeColor &&
    p.style.backgroundColor === style.backgroundColor &&
    p.style.centerLogo === style.centerLogo
  )?.id ?? null;
}

export function useQrStyle() {
  const [style, setStyleState] = useState<QrStyleConfig>(DEFAULT_QR_STYLE);
  const [activePresetId, setActivePresetId] = useState<string | null>('classic');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadStyle();
    setStyleState(loaded);
    setActivePresetId(findMatchingPreset(loaded));
    setIsLoaded(true);
  }, []);

  const setStyle = useCallback((next: QrStyleConfig) => {
    // R1: centerLogo === 'payme' → errorCorrection >= Q
    const enforced: QrStyleConfig = {
      ...next,
      errorCorrection: next.centerLogo === 'payme' && next.errorCorrection !== 'H'
        ? 'Q'
        : next.errorCorrection,
    };
    setStyleState(enforced);
    setActivePresetId(findMatchingPreset(enforced));
    saveStyle(enforced);
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = THEME_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setStyleState(preset.style);
    setActivePresetId(presetId);
    saveStyle(preset.style);
  }, []);

  const updateField = useCallback(<K extends keyof QrStyleConfig>(key: K, value: QrStyleConfig[K]) => {
    setStyleState(prev => {
      const next = { ...prev, [key]: value };
      // R9: dotGradient 設定時色彩由 gradient 決定；清除時還原 dotColor
      // (dotColor 保持不變，gradient 覆蓋渲染)
      // R1 enforcement
      if (next.centerLogo === 'payme' && next.errorCorrection !== 'H') {
        next.errorCorrection = 'Q';
      }
      setActivePresetId(findMatchingPreset(next));
      saveStyle(next);
      return next;
    });
  }, []);

  return {
    style,
    setStyle,
    applyPreset,
    updateField,
    activePresetId,
    isLoaded,
  };
}
