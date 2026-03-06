'use client';

import type { TimeRange, PageItem, ListResponse } from '../types';
import { useAnalytics } from '../hooks/use-analytics';

interface TopPagesTableProps {
  range: TimeRange;
}

export function TopPagesTable({ range }: TopPagesTableProps) {
  const { data, isLoading } = useAnalytics<ListResponse<PageItem>>('pages', range);

  if (isLoading) {
    return <div className="h-[200px] bg-white/5 border border-white/10 rounded-xl animate-pulse" />;
  }

  const items = data?.data ?? [];

  if (items.length === 0) {
    return (
      <div className="h-[200px] bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40">
        No page data
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <h3 className="text-white/60 text-sm p-4 pb-2">Top Pages</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40">
              <th className="text-left px-4 py-2 font-medium">Path</th>
              <th className="text-right px-4 py-2 font-medium">Pageviews</th>
              <th className="text-right px-4 py-2 font-medium">Visitors</th>
            </tr>
          </thead>
          <tbody>
            {items.map((page, i) => (
              <tr
                key={i}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="px-4 py-2 text-white/80 font-mono text-xs">{decodeURIComponent(page.path)}</td>
                <td className="px-4 py-2 text-right text-white">{page.pageviews.toLocaleString()}</td>
                <td className="px-4 py-2 text-right text-white/60">{page.visitors.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
