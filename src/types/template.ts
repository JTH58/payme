import { AppMode } from '@/config/routes';

export interface TemplateAuthor {
  name: string;
}

export interface Template {
  id: string;
  title: string;
  emoji: string;
  description: string;
  mode: AppMode;
  author?: TemplateAuthor; // 讓部分官方模板保持選擇性，或預設為 PayMe Team
  defaultValues: {
    title?: string;
    amount?: number;
    pax?: number;
    taxRate?: number;
  };
}
