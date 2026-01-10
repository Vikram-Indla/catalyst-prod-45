import React, { useState } from 'react';
import { FileText, Pen, Eye, ToggleLeft, Plus, Loader2, Copy, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { 
  useRAAllTemplates, 
  useCreateRATemplate, 
  useUpdateRATemplate, 
  useDeleteRATemplate 
} from '@/hooks/requirement-assist';
import type { RATemplate, TemplateType, CreateRATemplate } from '@/types/requirement-assist';

const emptyTemplate: Partial<RATemplate> = {
  name: '',
  template_type: 'prd',
  description: '',
  template_content: '',
  version: '1.0',
  is_default: false,
  is_active: true,
};

export function RAAdminTemplates() {
  const { data: templates, isLoading, error } = useRAAllTemplates();
  const createTemplate = useCreateRATemplate();
  const updateTemplate = useUpdateRATemplate();
  const deleteTemplate = useDeleteRATemplate();
  
  const [editingTemplate, setEditingTemplate] = useState<Partial<RATemplate> | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<RATemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleOpenCreate = () => {
    setEditingTemplate({ ...emptyTemplate });
    setIsCreating(true);
  };

  const handleOpenEdit = (template: RATemplate) => {
    setEditingTemplate({ ...template });
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!editingTemplate) return;
    
    if (isCreating) {
      const { id, created_at, updated_at, ...rest } = editingTemplate as any;
      createTemplate.mutate(rest as CreateRATemplate, {
        onSuccess: () => {
          setEditingTemplate(null);
          setIsCreating(false);
        },
      });
    } else {
      updateTemplate.mutate({ 
        id: editingTemplate.id!, 
        ...editingTemplate 
      }, {
        onSuccess: () => {
          setEditingTemplate(null);
        },
      });
    }
  };

  const handleDuplicate = (template: RATemplate) => {
    const { id, created_at, updated_at, ...rest } = template;
    createTemplate.mutate({
      ...rest,
      name: `${rest.name} (Copy)`,
      is_default: false,
    } as CreateRATemplate);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplate.mutate(id);
    }
  };

  const handleToggleActive = (template: RATemplate) => {
    updateTemplate.mutate({
      id: template.id,
      is_active: !template.is_active,
    });
  };

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        Failed to load templates. Please try again.
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Templates</CardTitle>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Template
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : templates && templates.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3 text-left font-semibold">Template</th>
                  <th className="p-3 text-left font-semibold w-24">Type</th>
                  <th className="p-3 text-left font-semibold w-24">Version</th>
                  <th className="p-3 text-left font-semibold w-24">Status</th>
                  <th className="p-3 text-left font-semibold w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{t.name}</div>
                      {t.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                      )}
                      {t.is_default && (
                        <span className="text-xs text-primary font-medium">(Default)</span>
                      )}
                    </td>
                    <td className="p-3 text-sm capitalize">{t.template_type}</td>
                    <td className="p-3 text-sm">v{t.version}</td>
                    <td className="p-3">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        t.is_active 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {t.is_active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleOpenEdit(t)}
                          title="Edit"
                        >
                          <Pen className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setViewingTemplate(t)}
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleToggleActive(t)}
                          title={t.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <ToggleLeft className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDuplicate(t)}
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No templates found. Create your first template.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Create Template' : 'Edit Template'}
            </DialogTitle>
          </DialogHeader>
          
          {editingTemplate && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Name</label>
                <Input
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="Template name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Type</label>
                  <Select
                    value={editingTemplate.template_type}
                    onValueChange={(val) => setEditingTemplate({ 
                      ...editingTemplate, 
                      template_type: val as TemplateType 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prd">PRD</SelectItem>
                      <SelectItem value="epic">Epic</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Version</label>
                  <Input
                    value={editingTemplate.version || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, version: e.target.value })}
                    placeholder="1.0"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <Input
                  value={editingTemplate.description || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Template Content</label>
                <Textarea
                  value={editingTemplate.template_content || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, template_content: e.target.value })}
                  placeholder="# Template structure..."
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingTemplate.is_default}
                    onCheckedChange={(val) => setEditingTemplate({ ...editingTemplate, is_default: val })}
                  />
                  <span className="text-sm">Default template</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingTemplate.is_active}
                    onCheckedChange={(val) => setEditingTemplate({ ...editingTemplate, is_active: val })}
                  />
                  <span className="text-sm">Active</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createTemplate.isPending || updateTemplate.isPending || !editingTemplate?.name}
            >
              {(createTemplate.isPending || updateTemplate.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isCreating ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingTemplate} onOpenChange={() => setViewingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingTemplate?.name}</DialogTitle>
          </DialogHeader>
          
          {viewingTemplate && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Type: <strong className="text-foreground capitalize">{viewingTemplate.template_type}</strong></span>
                <span>Version: <strong className="text-foreground">v{viewingTemplate.version}</strong></span>
              </div>
              
              {viewingTemplate.description && (
                <p className="text-sm text-muted-foreground">{viewingTemplate.description}</p>
              )}
              
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {viewingTemplate.template_content}
                </pre>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingTemplate(null)}>
              Close
            </Button>
            <Button onClick={() => {
              setViewingTemplate(null);
              handleOpenEdit(viewingTemplate!);
            }}>
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
