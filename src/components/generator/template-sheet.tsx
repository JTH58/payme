import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
} from '@/components/ui/sheet';
import { TemplateCard } from '@/modules/templates/components/TemplateCard';
import { HelpDialog } from '@/components/help-dialog';
import { Template } from '@/types/template';
import templatesData from '@/data/templates.json';
import { VALID_MODES } from '@/config/routes';

function isValidTemplate(item: unknown): item is Template {
  if (typeof item !== 'object' || item === null) return false;
  const t = item as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.mode === 'string' &&
    (VALID_MODES as readonly string[]).includes(t.mode)
  );
}

const templates: Template[] = (templatesData as unknown[]).filter(isValidTemplate);

interface TemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: Template) => void;
}

export function TemplateSheet({ open, onOpenChange, onSelect }: TemplateSheetProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const handleSelect = (template: Template) => {
    onSelect(template);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center justify-center gap-2">
            <SheetTitle>熱門場景</SheetTitle>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="text-xs text-blue-400 hover:underline"
            >
              如何使用？
            </button>
          </div>
        </SheetHeader>
        <SheetBody>
          <div className="grid grid-cols-2 gap-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={handleSelect}
                className="w-full"
              />
            ))}
          </div>
          <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} scenarioId="templates" />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
