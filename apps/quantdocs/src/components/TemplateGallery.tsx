'use client';

import { motion } from 'framer-motion';
import { spring } from '@quant/brand';
import { Card } from '@quant/shared-ui';

interface Template {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'blank',
    title: 'Blank Document',
    description: 'Start with a clean slate',
    icon: '\u{1F4C4}',
  },
  {
    id: 'meeting-notes',
    title: 'Meeting Notes',
    description: 'Structured notes with action items',
    icon: '\u{1F4DD}',
  },
  {
    id: 'project-brief',
    title: 'Project Brief',
    description: 'Outline goals, scope, and timeline',
    icon: '\u{1F4CB}',
  },
  { id: 'report', title: 'Report', description: 'Formal report with sections', icon: '\u{1F4CA}' },
  { id: 'resume', title: 'Resume', description: 'Professional resume template', icon: '\u{1F464}' },
  {
    id: 'letter',
    title: 'Letter',
    description: 'Formal or informal letter format',
    icon: '\u2709',
  },
];

interface TemplateGalleryProps {
  onSelectTemplate: (templateId: string) => void;
  onClose?: () => void;
}

export function TemplateGallery({ onSelectTemplate, onClose }: TemplateGalleryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: 'spring', ...spring.gentle }}
      className="p-6 space-y-4"
      aria-label="Template gallery"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Choose a Template</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-[var(--quant-muted)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close template gallery"
          >
            &#10005;
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', ...spring.gentle, delay: index * 0.05 }}
          >
            <Card className="p-4 cursor-pointer hover:border-[var(--quant-primary)] transition-colors h-full">
              <button
                onClick={() => onSelectTemplate(template.id)}
                className="w-full text-left space-y-3 min-h-[44px]"
                aria-label={`Create from ${template.title} template`}
              >
                <div className="w-12 h-12 rounded-lg bg-[var(--quant-muted)] flex items-center justify-center text-2xl">
                  {template.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{template.title}</h3>
                  <p className="text-xs text-[var(--quant-muted-foreground)] mt-1">
                    {template.description}
                  </p>
                </div>
              </button>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
