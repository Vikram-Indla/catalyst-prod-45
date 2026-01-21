/**
 * Template Grid Component
 * Displays templates in a filterable grid layout
 */

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, LayoutGrid, List, Globe, Folder } from 'lucide-react';
import { TemplateCard } from './TemplateCard';
import { useTemplates, useTemplateCategories } from '../../hooks/useTemplates';
import type { TestCaseTemplate } from '../../types/template';

interface TemplateGridProps {
  projectId: string | null;
  onSelect?: (template: TestCaseTemplate) => void;
  onEdit?: (template: TestCaseTemplate) => void;
  onDelete?: (template: TestCaseTemplate) => void;
  onDuplicate?: (template: TestCaseTemplate) => void;
  onCreate?: () => void;
  selectable?: boolean;
  showCreateButton?: boolean;
}

export function TemplateGrid({
  projectId,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onCreate,
  selectable = false,
  showCreateButton = true,
}: TemplateGridProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: categories = [], isLoading: categoriesLoading } = useTemplateCategories();
  const { data: templates = [], isLoading: templatesLoading } = useTemplates(projectId);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(searchLower);
        const matchesDesc = t.description?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesDesc) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'uncategorized') {
          if (t.category_id) return false;
        } else {
          if (t.category_id !== categoryFilter) return false;
        }
      }

      // Scope filter
      if (scopeFilter === 'global' && !t.is_global) return false;
      if (scopeFilter === 'project' && t.is_global) return false;

      return true;
    });
  }, [templates, search, categoryFilter, scopeFilter]);

  const isLoading = categoriesLoading || templatesLoading;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="w-[140px]">
            <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scopes</SelectItem>
            <SelectItem value="global">Global Only</SelectItem>
            <SelectItem value="project">Project Only</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1 border rounded-md p-0.5">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {showCreateButton && onCreate && (
          <Button onClick={onCreate} className="ml-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-2'
          }
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-40' : 'h-16'} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTemplates.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">
            {search || categoryFilter !== 'all' || scopeFilter !== 'all'
              ? 'No templates match your filters'
              : 'No templates yet'}
          </p>
          {showCreateButton && onCreate && (
            <Button variant="outline" className="mt-4" onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first template
            </Button>
          )}
        </div>
      )}

      {/* Grid/List View */}
      {!isLoading && filteredTemplates.length > 0 && (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-2'
          }
        >
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              selectable={selectable}
            />
          ))}
        </div>
      )}
    </div>
  );
}
