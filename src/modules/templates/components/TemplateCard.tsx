import React from 'react';
import { Template } from '@/types/template';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TemplateCardProps {
  template: Template;
  onClick: (template: Template) => void;
  className?: string;
}

export const TemplateCard = ({ template, onClick, className }: TemplateCardProps) => {
  return (
    <Card 
      className={cn(
        "relative flex flex-col justify-between w-[160px] h-[140px] p-4 cursor-pointer hover:bg-white hover:border-slate-300 transition-all active:scale-[0.98] flex-shrink-0 border-slate-200 bg-white/80 shadow-sm shadow-sky-100/60",
        className
      )}
      onClick={() => onClick(template)}
    >
      <div>
        <div className="text-3xl mb-2">{template.emoji}</div>
        <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{template.title}</h3>
        <p className="text-xs text-slate-600 line-clamp-2 mt-1">{template.description}</p>
      </div>
      
      {/* 署名區域 */}
      {template.author && (
        <div className="mt-2 text-[10px] text-slate-500 font-mono text-right">
          by {template.author.name}
        </div>
      )}
    </Card>
  );
};
