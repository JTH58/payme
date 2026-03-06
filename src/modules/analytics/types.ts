export type TimeRange = 'today' | '7d' | '30d' | 'all';

export interface SummaryData {
  totalPageviews: number;
  uniqueVisitors: number;
  totalEvents: number;
  avgDailyPageviews: number;
}

export interface TrendItem {
  date: string;
  pageviews: number;
  visitors: number;
}

export interface NameValueItem {
  name: string;
  value: number;
}

export interface PageItem {
  path: string;
  pageviews: number;
  visitors: number;
}

export interface ListResponse<T> {
  data: T[];
}
