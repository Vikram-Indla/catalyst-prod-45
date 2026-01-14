/**
 * TemplateList Component
 * Grid of template cards with sections
 * Catalyst V5 Design System
 */

import React from 'react';
import { TemplateCard } from './TemplateCard';
import { Skeleton } from '@/components/ui/skeleton';
import { FileX } from 'lucide-react';
import type { CycleTemplate } from '@/types/template.types';

interface TemplateListProps {
  templates: CycleTemplate[];
  isLoading: boolean;
  onApply: (template: CycleTemplate) => void;
  onEdit: (template: CycleTemplate) => void;
  onDuplicate: (template: CycleTemplate) => void;
  onDelete: (template: CycleTemplate) => void;
  onView: (template: CycleTemplate) => void;
}

export function TemplateList({
  templates,
  isLoading,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
  onView,
}: TemplateListProps) {
  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* System Templates Section Skeleton */}
        <div>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-[220px] rounded-lg" />
            ))}
          </div>
        </div>
        
        {/* Project Templates Section Skeleton */}
        <div>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-[220px] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <FileX className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">No templates found</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Create your first template to streamline test cycle creation and save time on repetitive configurations.
        </p>
      </div>
    );
  }
  
  // Separate system and project templates
  const systemTemplates = templates.filter(t => t.is_global);
  const projectTemplates = templates.filter(t => !t.is_global);
  
  return (
    <div className="space-y-8">
      {/* System Templates Section */}
      {systemTemplates.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            System Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onApply={() => onApply(template)}
                onEdit={() => onEdit(template)}
                onDuplicate={() => onDuplicate(template)}
                onDelete={() => onDelete(template)}
                onView={() => onView(template)}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* Project Templates Section */}
      {projectTemplates.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Project Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onApply={() => onApply(template)}
                onEdit={() => onEdit(template)}
                onDuplicate={() => onDuplicate(template)}
                onDelete={() => onDelete(template)}
                onView={() => onView(template)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
