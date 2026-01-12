/**
 * TemplateManager - Complete template management UI
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  Plus, 
  FileText, 
  MoreVertical, 
  Star, 
  StarOff,
  Copy, 
  Edit, 
  Trash2,
  Globe,
  Lock,
  FolderOpen,
  Clock,
  User,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TestCaseTemplate {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  isGlobal: boolean;
  isFavorite?: boolean;
  usageCount: number;
  templateData: {
    title?: string;
    description?: string;
    preconditions?: string;
    expectedResult?: string;
    type?: string;
    priority?: string;
    steps?: {
      action: string;
      expectedResult?: string;
      testData?: string;
    }[];
  };
  createdBy: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  templateCount: number;
}

interface TemplateManagerProps {
  templates: TestCaseTemplate[];
  categories: TemplateCategory[];
  isLoading?: boolean;
  onCreateTemplate?: () => void;
  onEditTemplate?: (template: TestCaseTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onDuplicateTemplate?: (template: TestCaseTemplate) => void;
  onToggleFavorite?: (templateId: string, isFavorite: boolean) => void;
  onUseTemplate?: (template: TestCaseTemplate) => void;
  onPreviewTemplate?: (template: TestCaseTemplate) => void;
  onCreateCategory?: () => void;
}

export function TemplateManager({
  templates,
  categories,
  isLoading = false,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onDuplicateTemplate,
  onToggleFavorite,
  onUseTemplate,
  onPreviewTemplate,
  onCreateCategory,
}: TemplateManagerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !search || 
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || template.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const globalTemplates = filteredTemplates.filter(t => t.isGlobal);
  const projectTemplates = filteredTemplates.filter(t => !t.isGlobal);
  const favoriteTemplates = filteredTemplates.filter(t => t.isFavorite);

  const templateToDelete = deleteTemplateId ? templates.find(t => t.id === deleteTemplateId) : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Test Case Templates</h2>
            <p className="text-sm text-muted-foreground">
              Create and manage reusable test case templates
            </p>
          </div>
          <Button onClick={onCreateTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-56 border-r p-4 hidden md:block">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Categories</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCreateCategory}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-2rem)]">
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left',
                  !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                <FolderOpen className="h-4 w-4" />
                <span>All Templates</span>
                <span className="ml-auto text-xs opacity-70">{templates.length}</span>
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left',
                    selectedCategory === category.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span className="truncate">{category.name}</span>
                  <span className="ml-auto text-xs opacity-70">{category.templateCount}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="all" className="h-full flex flex-col">
            <div className="border-b px-4">
              <TabsList>
                <TabsTrigger value="all">All ({filteredTemplates.length})</TabsTrigger>
                <TabsTrigger value="favorites">
                  <Star className="h-3 w-3 mr-1" />
                  Favorites ({favoriteTemplates.length})
                </TabsTrigger>
                <TabsTrigger value="global">
                  <Globe className="h-3 w-3 mr-1" />
                  Global ({globalTemplates.length})
                </TabsTrigger>
                <TabsTrigger value="project">
                  <Lock className="h-3 w-3 mr-1" />
                  Project ({projectTemplates.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <TabsContent value="all" className="mt-0 p-4">
                <TemplateGrid 
                  templates={filteredTemplates} 
                  onEdit={onEditTemplate}
                  onDelete={(id) => setDeleteTemplateId(id)}
                  onDuplicate={onDuplicateTemplate}
                  onToggleFavorite={onToggleFavorite}
                  onUse={onUseTemplate}
                  onPreview={onPreviewTemplate}
                />
              </TabsContent>
              <TabsContent value="favorites" className="mt-0 p-4">
                <TemplateGrid 
                  templates={favoriteTemplates} 
                  onEdit={onEditTemplate}
                  onDelete={(id) => setDeleteTemplateId(id)}
                  onDuplicate={onDuplicateTemplate}
                  onToggleFavorite={onToggleFavorite}
                  onUse={onUseTemplate}
                  onPreview={onPreviewTemplate}
                />
              </TabsContent>
              <TabsContent value="global" className="mt-0 p-4">
                <TemplateGrid 
                  templates={globalTemplates} 
                  onEdit={onEditTemplate}
                  onDelete={(id) => setDeleteTemplateId(id)}
                  onDuplicate={onDuplicateTemplate}
                  onToggleFavorite={onToggleFavorite}
                  onUse={onUseTemplate}
                  onPreview={onPreviewTemplate}
                />
              </TabsContent>
              <TabsContent value="project" className="mt-0 p-4">
                <TemplateGrid 
                  templates={projectTemplates} 
                  onEdit={onEditTemplate}
                  onDelete={(id) => setDeleteTemplateId(id)}
                  onDuplicate={onDuplicateTemplate}
                  onToggleFavorite={onToggleFavorite}
                  onUse={onUseTemplate}
                  onPreview={onPreviewTemplate}
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteTemplateId) {
                  onDeleteTemplate?.(deleteTemplateId);
                  setDeleteTemplateId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface TemplateGridProps {
  templates: TestCaseTemplate[];
  onEdit?: (template: TestCaseTemplate) => void;
  onDelete?: (templateId: string) => void;
  onDuplicate?: (template: TestCaseTemplate) => void;
  onToggleFavorite?: (templateId: string, isFavorite: boolean) => void;
  onUse?: (template: TestCaseTemplate) => void;
  onPreview?: (template: TestCaseTemplate) => void;
}

function TemplateGrid({
  templates,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onUse,
  onPreview,
}: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No templates found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map(template => (
        <Card key={template.id} className="hover:shadow-md transition-shadow group">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{template.name}</CardTitle>
                {template.categoryName && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {template.categoryName}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onToggleFavorite?.(template.id, !template.isFavorite)}
                  className={cn(
                    'p-1 rounded hover:bg-muted transition-colors',
                    template.isFavorite ? 'text-amber-500' : 'text-muted-foreground opacity-0 group-hover:opacity-100'
                  )}
                >
                  {template.isFavorite ? (
                    <Star className="h-4 w-4 fill-current" />
                  ) : (
                    <StarOff className="h-4 w-4" />
                  )}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onPreview?.(template)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(template)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate?.(template)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(template.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="line-clamp-2 min-h-[2.5rem]">
              {template.description || 'No description'}
            </CardDescription>
            
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                {template.isGlobal ? (
                  <Globe className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                <span>{template.isGlobal ? 'Global' : 'Project'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{template.usageCount} uses</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{template.createdBy.name}</span>
              </div>
              <Button size="sm" onClick={() => onUse?.(template)}>
                Use Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
