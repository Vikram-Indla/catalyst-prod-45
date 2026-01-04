/**
 * Template Browser Component
 * Browse, search, and create test cases from templates
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Search,
  Grid3X3,
  List,
  FileText,
  Folder,
  Star,
  Clock,
  Plus,
  Eye,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useTemplates, useCreateFromTemplate } from '../../hooks/useTemplates';
import type { TestCase } from '../../api/types';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { TemplateVariableForm } from './TemplateVariableForm';

interface TemplateBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  folderId?: string;
  onSuccess?: (caseId: string) => void;
}

interface TemplateCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
}

export function TemplateBrowser({
  open,
  onOpenChange,
  projectId,
  folderId,
  onSuccess,
}: TemplateBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<TestCase | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TestCase | null>(null);
  const [showVariableForm, setShowVariableForm] = useState(false);

  const { data: templates = [], isLoading } = useTemplates(projectId);
  const createFromTemplate = useCreateFromTemplate();

  // Extract categories from templates
  const categories = useMemo<TemplateCategory[]>(() => {
    const folderMap = new Map<string, number>();
    let recentCount = 0;
    let favoriteCount = 0;

    templates.forEach((template) => {
      const folderName = template.folder?.name || 'Uncategorized';
      folderMap.set(folderName, (folderMap.get(folderName) || 0) + 1);
      // Mock recent/favorite counts - in real app these would come from user data
      if (Math.random() > 0.7) recentCount++;
      if (Math.random() > 0.8) favoriteCount++;
    });

    const cats: TemplateCategory[] = [
      { id: 'all', name: 'All Templates', icon: <FileText className="h-4 w-4" />, count: templates.length },
      { id: 'recent', name: 'Recently Used', icon: <Clock className="h-4 w-4" />, count: recentCount },
      { id: 'favorites', name: 'Favorites', icon: <Star className="h-4 w-4" />, count: favoriteCount },
    ];

    folderMap.forEach((count, name) => {
      cats.push({
        id: `folder-${name}`,
        name,
        icon: <Folder className="h-4 w-4" />,
        count,
      });
    });

    return cats;
  }, [templates]);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'recent') {
        // Mock: just return first few
        filtered = filtered.slice(0, 5);
      } else if (selectedCategory === 'favorites') {
        // Mock: random selection
        filtered = filtered.filter(() => Math.random() > 0.7);
      } else if (selectedCategory.startsWith('folder-')) {
        const folderName = selectedCategory.replace('folder-', '');
        filtered = filtered.filter(
          (t) => (t.folder?.name || 'Uncategorized') === folderName
        );
      }
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [templates, selectedCategory, searchQuery]);

  const handleSelectTemplate = (template: TestCase) => {
    setSelectedTemplate(template);
    // Check if template has variables (placeholder pattern: {{variable_name}})
    const hasVariables = template.steps?.some(
      (step) =>
        step.action.includes('{{') ||
        step.expected_result.includes('{{') ||
        step.test_data?.includes('{{')
    );

    if (hasVariables) {
      setShowVariableForm(true);
    } else {
      handleCreateFromTemplate(template, {});
    }
  };

  const handleCreateFromTemplate = async (
    template: TestCase,
    variables: Record<string, string>
  ) => {
    try {
      const newCase = await createFromTemplate.mutateAsync({
        templateId: template.id,
        data: {
          project_id: projectId,
          folder_id: folderId,
          // Variables would be used to substitute placeholders in steps
          // This is typically handled by the API
        },
      });
      onSuccess?.(newCase.id);
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Template Browser
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Category Sidebar */}
            <div className="w-56 border-r bg-muted/30 flex flex-col">
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                        selectedCategory === category.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground'
                      )}
                    >
                      {category.icon}
                      <span className="flex-1 text-left truncate">{category.name}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'h-5 px-1.5 text-xs',
                          selectedCategory === category.id && 'bg-primary-foreground/20 text-primary-foreground'
                        )}
                      >
                        {category.count}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Template Grid/List */}
            <div className="flex-1 flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="text-sm text-muted-foreground">
                  {filteredTemplates.length} template(s)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
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
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-2 opacity-50" />
                    <p>No templates found</p>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-3 gap-4">
                    {filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => handleSelectTemplate(template)}
                        onPreview={() => setPreviewTemplate(template)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTemplates.map((template) => (
                      <TemplateListItem
                        key={template.id}
                        template={template}
                        onSelect={() => handleSelectTemplate(template)}
                        onPreview={() => setPreviewTemplate(template)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        onUseTemplate={() => {
          if (previewTemplate) {
            handleSelectTemplate(previewTemplate);
            setPreviewTemplate(null);
          }
        }}
      />

      {/* Variable Form Modal */}
      {selectedTemplate && (
        <TemplateVariableForm
          template={selectedTemplate}
          open={showVariableForm}
          onOpenChange={(open) => {
            setShowVariableForm(open);
            if (!open) setSelectedTemplate(null);
          }}
          onSubmit={(variables) => {
            handleCreateFromTemplate(selectedTemplate, variables);
            setShowVariableForm(false);
          }}
          isLoading={createFromTemplate.isPending}
        />
      )}
    </>
  );
}

// Template Card Component
interface TemplateCardProps {
  template: TestCase;
  onSelect: () => void;
  onPreview: () => void;
}

function TemplateCard({ template, onSelect, onPreview }: TemplateCardProps) {
  return (
    <div className="group border rounded-lg p-4 hover:border-primary transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{template._stepCount || template.steps?.length || 0} steps</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
        >
          <Eye className="h-3 w-3" />
        </Button>
      </div>
      <h4 className="font-medium text-sm mb-1 line-clamp-2">{template.title}</h4>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        {template.description || 'No description'}
      </p>
      {template.tags && template.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-3">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
      <Button size="sm" className="w-full" onClick={onSelect}>
        <Plus className="h-3 w-3 mr-1" />
        Use Template
      </Button>
    </div>
  );
}

// Template List Item Component
interface TemplateListItemProps {
  template: TestCase;
  onSelect: () => void;
  onPreview: () => void;
}

function TemplateListItem({ template, onSelect, onPreview }: TemplateListItemProps) {
  return (
    <div className="group flex items-center gap-4 p-3 border rounded-lg hover:border-primary transition-colors">
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm truncate">{template.title}</h4>
          <Badge variant="secondary" className="text-xs">
            {template._stepCount || template.steps?.length || 0} steps
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {template.description || 'No description'}
        </p>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPreview}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={onSelect}>
          <Plus className="h-3 w-3 mr-1" />
          Use
        </Button>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
