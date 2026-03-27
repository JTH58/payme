'use client';

import type { TimeRange, PageItem, ListResponse } from '../types';
import { useAnalytics } from '../hooks/use-analytics';

interface TopPagesTableProps {
  range: TimeRange;
}

export function TopPagesTable({ range }: TopPagesTableProps) {
  const { data, isLoading } = useAnalytics<ListResponse<PageItem>>('pages', range);

  if (isLoading) {
    return <div className="h-[200px] marketing-card animate-pulse" />;
  }

  const items = data?.data ?? [];

  if (items.length === 0) {
    return (
      <div className="h-[200px] marketing-card flex items-center justify-center text-slate-400">
        No page data
      </div>
    );
  }

  return (
    <div className="marketing-card overflow-hidden">
      <h3 className="text-slate-500 text-sm p-4 pb-2">Top Pages</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="text-left px-4 py-2 font-medium">Path</th>
              <th className="text-right px-4 py-2 font-medium">Pageviews</th>
              <th className="text-right px-4 py-2 font-medium">Visitors</th>
            </tr>
          </thead>
          <tbody>
            {items.map((page, i) => (
              <tr
                key={i}
                className="border-b border-slate-100 hover:bg-sky-50 transition-colors"
              >
                <td className="px-4 py-2 text-slate-700 font-mono text-xs">{decodeURIComponent(page.path)}</td>
                <td className="px-4 py-2 text-right text-slate-900">{page.pageviews.toLocaleString()}</td>
                <td className="px-4 py-2 text-right text-slate-500">{page.visitors.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
