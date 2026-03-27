'use client';

import { useState } from 'react';
import type { TimeRange } from '../types';
import { TimeRangeFilter } from './time-range-filter';
import { SummaryCards } from './summary-cards';
import { PageviewTrend } from './pageview-trend';
import { DeviceChart } from './device-chart';
import { BrowserChart } from './browser-chart';
import { RefererChart } from './referer-chart';
import { EventChart } from './event-chart';
import { TopPagesTable } from './top-pages-table';

export function Dashboard() {
  const [range, setRange] = useState<TimeRange>('7d');

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <TimeRangeFilter value={range} onChange={setRange} />
      </div>

      <SummaryCards range={range} />

      <PageviewTrend range={range} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DeviceChart range={range} />
        <div className="lg:col-span-2">
          <BrowserChart range={range} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RefererChart range={range} />
        <EventChart range={range} />
      </div>

      <TopPagesTable range={range} />
    </div>
  );
}
