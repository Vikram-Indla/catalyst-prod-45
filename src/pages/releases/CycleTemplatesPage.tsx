/**
 * CycleTemplatesPage
 * Main templates management page
 * Catalyst V5 Design System
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FileText } from 'lucide-react';
import { TemplateList, CreateTemplateModal, ApplyTemplateModal } from '@/components/templates';
import { useTemplates, useDeleteTemplate, useDuplicateTemplate } from '@/hooks/templates';
import type { CycleTemplate, TemplateType, TemplateFilters } from '@/types/template.types';
import { TEMPLATE_TYPES } from '@/types/template.types';
import { toast } from 'sonner';

const PROJECT_ID = 'proj-1'; // TODO: Get from context

export default function CycleTemplatesPage() {
  const [filters, setFilters] = useState<TemplateFilters>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [applyTemplate, setApplyTemplate] = useState<CycleTemplate | null>(null);
  
  const { data: templates = [], isLoading } = useTemplates(PROJECT_ID, filters);
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();
  
  const handleDelete = async (template: CycleTemplate) => {
    if (confirm(`Delete "${template.name}"?`)) {
      await deleteTemplate.mutateAsync(template.id);
    }
  };
  
  const handleDuplicate = async (template: CycleTemplate) => {
    await duplicateTemplate.mutateAsync({ templateId: template.id, newName: `${template.name} (Copy)` });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cycle Templates</h1>
          <p className="text-sm text-slate-500">Create and manage reusable test cycle configurations</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white">
          <Plus className="w-4 h-4 mr-2" /> Create Template
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search templates..."
            value={filters.search || ''}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            className="pl-9"
          />
        </div>
        <Select value={filters.type || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, type: v === 'all' ? undefined : v as TemplateType }))}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All Types</SelectItem>
            {Object.values(TEMPLATE_TYPES).map(t => (
              <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Template List */}
      <TemplateList
        templates={templates}
        isLoading={isLoading}
        onApply={setApplyTemplate}
        onEdit={(t) => toast.info('Edit functionality coming soon')}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onView={(t) => toast.info('View details coming soon')}
      />
      
      {/* Modals */}
      <CreateTemplateModal
        projectId={PROJECT_ID}
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => setCreateOpen(false)}
      />
      
      {applyTemplate && (
        <ApplyTemplateModal
          template={applyTemplate}
          isOpen={!!applyTemplate}
          onClose={() => setApplyTemplate(null)}
          onSuccess={() => { setApplyTemplate(null); toast.success('Cycle created!'); }}
        />
      )}
    </div>
  );
}
