'use client';

interface GlassTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

export function GlassTooltip({ active, payload, label }: GlassTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm shadow-sky-100/80">
      {label && <p className="text-slate-500 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}
