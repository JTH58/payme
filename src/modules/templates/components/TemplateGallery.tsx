'use client';

import React, { useState } from 'react';
import templatesData from '@/data/templates.json';
import { Template } from '@/types/template';
import { TemplateCard } from './TemplateCard';
import { cn } from '@/lib/utils';
import { HelpDialog } from '@/components/help-dialog';

const templates = templatesData as Template[];

interface TemplateGalleryProps {
  onSelect: (template: Template) => void;
  className?: string;
}

export const TemplateGallery = ({ onSelect, className }: TemplateGalleryProps) => {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className={cn("w-full mb-6", className)}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-medium text-white/80">
          ✨ 熱門場景 <span className="text-xs text-white/40 ml-1">(點擊套用)</span>
          <button type="button" onClick={() => setHelpOpen(true)} className="text-xs text-blue-400 hover:underline ml-2">如何使用？</button>
        </h2>
      </div>
      
      {/* 橫向捲動容器 - 使用原生 CSS */}
      <div className="flex overflow-x-auto pb-4 gap-3 -mx-4 px-4 scrollbar-hide snap-x">
        {templates.map((template) => (
          <TemplateCard 
            key={template.id} 
            template={template} 
            onClick={onSelect}
            className="snap-start"
          />
        ))}
      </div>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} scenarioId="templates" />
    </div>
  );
};