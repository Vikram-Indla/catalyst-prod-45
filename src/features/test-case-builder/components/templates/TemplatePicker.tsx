/**
 * Template Picker Component
 * Quick selection popover for applying templates
 */

import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Search,
  ChevronRight,
  Globe,
  ListChecks,
} from 'lucide-react';
import { useTemplates } from '../../hooks/useTemplates';
import type { TestCaseTemplate } from '../../types/template';

interface TemplatePickerProps {
  projectId: string | null;
  onSelect: (template: TestCaseTemplate) => void;
  trigger?: React.ReactNode;
}

export function TemplatePicker({ projectId, onSelect, trigger }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: templates = [], isLoading } = useTemplates(projectId);

  const filtered = templates.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(s) ||
      t.description?.toLowerCase().includes(s)
    );
  });

  const handleSelect = (template: TestCaseTemplate) => {
    onSelect(template);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Use Template
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {search ? 'No templates match your search' : 'No templates available'}
            </div>
          ) : (
            <div className="p-1">
              {filtered.map((template) => (
                <button
                  key={template.id}
                  className="w-full text-left p-2.5 rounded-md hover:bg-accent transition-colors flex items-start gap-3 group"
                  onClick={() => handleSelect(template)}
                >
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {template.name}
                      </span>
                      {template.is_global && (
                        <Globe className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {template.description}
                      </p>
                    )}
                    <div className="flex gap-1.5 mt-1">
                      {template.category && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4">
                          {template.category.name}
                        </Badge>
                      )}
                      {(template.template_data.steps?.length || 0) > 0 && (
                        <Badge variant="secondary" className="text-[10px] py-0 h-4">
                          <ListChecks className="h-2.5 w-2.5 mr-0.5" />
                          {template.template_data.steps?.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
