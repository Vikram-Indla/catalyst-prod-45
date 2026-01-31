import { useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, Search, Loader2, Pencil, Trash2, FolderOpen, Clock, Users } from 'lucide-react';
import { usePlanHubTemplates, useCreatePlanHubTemplate, useDeletePlanHubTemplate, PlanHubTemplate, CreateTemplateInput } from '@/hooks/planhub';

const CATEGORIES = [
  { value: 'software', label: 'Software Development' },
  { value: 'marketing', label: 'Marketing Campaign' },
  { value: 'product', label: 'Product Launch' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'operations', label: 'Operations' },
  { value: 'other', label: 'Other' },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'software': return '💻';
    case 'marketing': return '📣';
    case 'product': return '🚀';
    case 'infrastructure': return '🏗️';
    case 'operations': return '⚙️';
    default: return '📋';
  }
};

export default function PlanHubTemplatesPage() {
  const { data: templates, isLoading } = usePlanHubTemplates();
  const createTemplate = useCreatePlanHubTemplate();
  const deleteTemplate = useDeletePlanHubTemplate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState<CreateTemplateInput>({
    name: '',
    description: '',
    category: 'software',
    duration_days: 90,
    phases: [],
  });

  const filteredTemplates = (templates || []).filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCreate = async () => {
    await createTemplate.mutateAsync(newTemplate);
    setIsDialogOpen(false);
    setNewTemplate({
      name: '',
      description: '',
      category: 'software',
      duration_days: 90,
      phases: [],
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteTemplate.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="h-full w-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="h-full w-full flex flex-col bg-background">
        <div className="h-[72px] border-b bg-card flex-shrink-0">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 flex-shrink-0">
                <FileText className="h-5 w-5 text-brand-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">Plan Templates</h1>
                <p className="text-sm text-muted-foreground truncate">
                  Manage reusable plan templates available to all PlanHub™ users
                </p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-primary hover:bg-brand-primary-hover flex-shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Plan Template</DialogTitle>
                  <DialogDescription>
                    Create a reusable template for common plan structures
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      placeholder="e.g., Agile Sprint Template"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newTemplate.description || ''}
                      onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      placeholder="Brief description of this template..."
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select 
                        value={newTemplate.category} 
                        onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v })}
                      >
                        <SelectTrigger id="category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (days)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min={1}
                        max={365}
                        value={newTemplate.duration_days}
                        onChange={(e) => setNewTemplate({ ...newTemplate, duration_days: parseInt(e.target.value) || 90 })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={handleCreate}
                    disabled={!newTemplate.name || createTemplate.isPending}
                    className="bg-brand-primary hover:bg-brand-primary-hover"
                  >
                    {createTemplate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Grid */}
            {filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No templates found</p>
                  <p className="text-sm text-muted-foreground mt-1">Create your first template to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map(template => (
                  <Card key={template.id} className="group relative hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{getCategoryIcon(template.category)}</div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{template.name}</CardTitle>
                          <CardDescription className="line-clamp-2 text-xs mt-1">
                            {template.description || 'No description'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {template.duration_days} days
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {Array.isArray(template.phases) ? template.phases.length : 0} phases
                        </span>
                        {template.is_system && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[10px] font-medium">
                            System
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        {!template.is_system && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            disabled={deleteTemplate.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
