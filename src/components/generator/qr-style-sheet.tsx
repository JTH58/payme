"use client";

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { THEME_PRESETS } from '@/config/qr-style';
import type { QrStyleConfig, DotStyle, EyeStyle, DotGradient } from '@/types/qr-style';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StyledQrCode } from './styled-qr-code';

interface QrStyleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  style: QrStyleConfig;
  activePresetId: string | null;
  qrPreviewData: string;
  onApplyPreset: (presetId: string) => void;
  onUpdateField: <K extends keyof QrStyleConfig>(key: K, value: QrStyleConfig[K]) => void;
}

const DOT_STYLE_OPTIONS: { value: DotStyle; label: string }[] = [
  { value: 'square', label: '方形' },
  { value: 'rounded', label: '圓角' },
  { value: 'dots', label: '圓點' },
];

const EYE_STYLE_OPTIONS: { value: EyeStyle; label: string }[] = [
  { value: 'square', label: '方形' },
  { value: 'rounded', label: '圓角' },
];

/** 小型 QR 預覽（主題 Grid 用） */
function ThemePreviewDot({ preset }: { preset: typeof THEME_PRESETS[number] }) {
  const s = preset.style;
  const dotColor = s.dotGradient ? s.dotGradient.color1 : s.dotColor;
  const gradientEnd = s.dotGradient?.color2;

  return (
    <div
      className="w-full aspect-square rounded-lg border border-white/10 flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: s.backgroundColor }}
    >
      {/* Simplified visual representation */}
      <div className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 9 }).map((_, i) => {
          const isCorner = i === 0 || i === 2 || i === 6;
          const isCenter = i === 4;
          const borderRadius = s.dotStyle === 'dots' ? '50%' : s.dotStyle === 'rounded' ? '2px' : '0';
          return (
            <div
              key={i}
              className="w-2.5 h-2.5"
              style={{
                borderRadius: isCorner ? (s.eyeStyle === 'rounded' ? '2px' : '0') : borderRadius,
                background: isCenter && s.centerLogo === 'payme'
                  ? s.backgroundColor
                  : gradientEnd
                    ? `linear-gradient(${s.dotGradient!.angle}deg, ${dotColor}, ${gradientEnd})`
                    : dotColor,
                border: isCorner ? `1.5px solid ${s.eyeColor ?? dotColor}` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function QrStyleSheet({
  open,
  onOpenChange,
  style,
  activePresetId,
  qrPreviewData,
  onApplyPreset,
  onUpdateField,
}: QrStyleSheetProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>自訂 QR Code 樣式</SheetTitle>
          <SheetDescription>選擇主題或自訂細節</SheetDescription>
        </SheetHeader>

        {/* Live Preview — 固定在頂部不捲動 */}
        {qrPreviewData && (
          <div className="flex-shrink-0 flex justify-center py-4 border-b border-white/10">
            <div className="bg-white rounded-xl p-2.5 shadow-lg">
              <StyledQrCode data={qrPreviewData} style={style} size={140} />
            </div>
          </div>
        )}

        <SheetBody className="space-y-6">
          {/* Theme Presets Grid */}
          <div>
            <p className="text-sm font-medium text-white/70 mb-3">主題</p>
            <div className="grid grid-cols-3 gap-3">
              {THEME_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyPreset(preset.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-200",
                    activePresetId === preset.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-white/10 hover:border-white/30 bg-white/5"
                  )}
                >
                  <div className="relative w-full">
                    <ThemePreviewDot preset={preset} />
                    {activePresetId === preset.id && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-white/60">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors py-1"
          >
            {showAdvanced ? '收起細項調整 ▲' : '展開細項調整 ▼'}
          </button>

          {/* Advanced Controls */}
          {showAdvanced && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Dot Style */}
              <OptionGroup label="點陣形狀">
                <div className="flex gap-2">
                  {DOT_STYLE_OPTIONS.map(opt => (
                    <ChipButton
                      key={opt.value}
                      label={opt.label}
                      active={style.dotStyle === opt.value}
                      onClick={() => onUpdateField('dotStyle', opt.value)}
                    />
                  ))}
                </div>
              </OptionGroup>

              {/* Eye Style */}
              <OptionGroup label="定位圖形">
                <div className="flex gap-2">
                  {EYE_STYLE_OPTIONS.map(opt => (
                    <ChipButton
                      key={opt.value}
                      label={opt.label}
                      active={style.eyeStyle === opt.value}
                      onClick={() => onUpdateField('eyeStyle', opt.value)}
                    />
                  ))}
                </div>
              </OptionGroup>

              {/* Dot Color / Gradient */}
              <OptionGroup label="點陣顏色">
                <div className="space-y-3">
                  {/* Mode toggle: solid / gradient */}
                  <div className="flex gap-2">
                    <ChipButton
                      label="純色"
                      active={!style.dotGradient}
                      onClick={() => onUpdateField('dotGradient', null)}
                    />
                    <ChipButton
                      label="漸層"
                      active={!!style.dotGradient}
                      onClick={() => {
                        if (!style.dotGradient) {
                          onUpdateField('dotGradient', {
                            color1: style.dotColor,
                            color2: lightenColor(style.dotColor),
                            angle: 135,
                          });
                        }
                      }}
                    />
                  </div>

                  {style.dotGradient ? (
                    <GradientEditor
                      gradient={style.dotGradient}
                      onChange={g => onUpdateField('dotGradient', g)}
                    />
                  ) : (
                    <ColorInput
                      value={style.dotColor}
                      onChange={c => onUpdateField('dotColor', c)}
                      label="色碼"
                    />
                  )}
                </div>
              </OptionGroup>

              {/* Background Color */}
              <OptionGroup label="背景色">
                <ColorInput
                  value={style.backgroundColor}
                  onChange={c => onUpdateField('backgroundColor', c)}
                  label="色碼"
                />
              </OptionGroup>

            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

// ─── Sub-components ────────────────────────────────

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-white/50">{label}</p>
      {children}
    </div>
  );
}

function ChipButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
        active
          ? "bg-white text-black"
          : "bg-white/10 text-white/60 hover:bg-white/20"
      )}
    >
      {label}
    </button>
  );
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative w-8 h-8 rounded-lg border border-white/20 overflow-hidden cursor-pointer">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="w-full h-full" style={{ backgroundColor: value }} />
      </label>
      <input
        type="text"
        value={value}
        onChange={e => {
          const v = e.target.value;
          if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
        }}
        className="glass-input h-8 rounded-lg w-24 px-2 text-xs font-mono uppercase outline-none"
        placeholder={label}
        maxLength={7}
      />
    </div>
  );
}

function GradientEditor({ gradient, onChange }: { gradient: DotGradient; onChange: (g: DotGradient) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="space-y-1">
          <span className="text-[10px] text-white/40">色 1</span>
          <ColorInput value={gradient.color1} onChange={c => onChange({ ...gradient, color1: c })} label="色碼 1" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-white/40">色 2</span>
          <ColorInput value={gradient.color2} onChange={c => onChange({ ...gradient, color2: c })} label="色碼 2" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/40">角度</span>
          <span className="text-[10px] text-white/40 font-mono">{gradient.angle}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={15}
          value={gradient.angle}
          onChange={e => onChange({ ...gradient, angle: Number(e.target.value) })}
          className="w-full h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
      {/* Gradient preview bar */}
      <div
        className="h-3 rounded-full"
        style={{
          background: `linear-gradient(${gradient.angle}deg, ${gradient.color1}, ${gradient.color2})`,
        }}
      />
    </div>
  );
}

/** Simple lighten: blend toward white */
function lightenColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.4));
  return `#${mix(r).toString(16).padStart(2, '0')}${mix(g).toString(16).padStart(2, '0')}${mix(b).toString(16).padStart(2, '0')}`;
}
