'use client';

import type { TimeRange } from '../types';

const RANGES: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'all', label: 'All Time' },
];

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  return (
    <div className="flex gap-2">
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === r.value
              ? 'bg-blue-600 text-white'
              : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
