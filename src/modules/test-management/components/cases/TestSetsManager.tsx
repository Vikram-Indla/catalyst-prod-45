/**
 * TestSetsManager - Complete test set management UI with smart sets support
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  ListChecks,
  Zap,
  Copy, 
  Edit, 
  Trash2,
  Play,
  FolderPlus,
  Filter,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TestSet {
  id: string;
  name: string;
  description?: string;
  isSmart: boolean;
  smartQuery?: SmartQuery;
  caseCount: number;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SmartQuery {
  folderIds?: string[];
  status?: string[];
  priorityIds?: string[];
  typeIds?: string[];
  labelIds?: string[];
  search?: string;
}

export interface TestCasePreview {
  id: string;
  caseKey: string;
  title: string;
  status: string;
  priority: string;
  type: string;
}

interface TestSetsManagerProps {
  sets: TestSet[];
  isLoading?: boolean;
  onCreateSet?: (data: { name: string; description?: string; isSmart: boolean; smartQuery?: SmartQuery }) => void;
  onEditSet?: (setId: string, data: Partial<TestSet>) => void;
  onDeleteSet?: (setId: string) => void;
  onDuplicateSet?: (set: TestSet) => void;
  onAddToCycle?: (setId: string) => void;
  onViewCases?: (setId: string) => void;
  onAddCases?: (setId: string, caseIds: string[]) => void;
  onRemoveCases?: (setId: string, caseIds: string[]) => void;
  availableFolders?: { id: string; name: string }[];
  availablePriorities?: { id: string; name: string }[];
  availableTypes?: { id: string; name: string }[];
  availableLabels?: { id: string; name: string; color: string }[];
  availableStatuses?: string[];
}

export function TestSetsManager({
  sets,
  isLoading = false,
  onCreateSet,
  onEditSet,
  onDeleteSet,
  onDuplicateSet,
  onAddToCycle,
  onViewCases,
  availableFolders = [],
  availablePriorities = [],
  availableTypes = [],
  availableLabels = [],
  availableStatuses = ['draft', 'ready', 'approved', 'deprecated'],
}: TestSetsManagerProps) {
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<TestSet | null>(null);
  const [deleteSetId, setDeleteSetId] = useState<string | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsSmart, setFormIsSmart] = useState(false);
  const [formSmartQuery, setFormSmartQuery] = useState<SmartQuery>({});

  const filteredSets = sets.filter(set =>
    !search || 
    set.name.toLowerCase().includes(search.toLowerCase()) ||
    set.description?.toLowerCase().includes(search.toLowerCase())
  );

  const manualSets = filteredSets.filter(s => !s.isSmart);
  const smartSets = filteredSets.filter(s => s.isSmart);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormIsSmart(false);
    setFormSmartQuery({});
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingSet(null);
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (set: TestSet) => {
    setFormName(set.name);
    setFormDescription(set.description || '');
    setFormIsSmart(set.isSmart);
    setFormSmartQuery(set.smartQuery || {});
    setEditingSet(set);
    setCreateDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingSet) {
      onEditSet?.(editingSet.id, {
        name: formName,
        description: formDescription,
        isSmart: formIsSmart,
        smartQuery: formIsSmart ? formSmartQuery : undefined,
      });
    } else {
      onCreateSet?.({
        name: formName,
        description: formDescription,
        isSmart: formIsSmart,
        smartQuery: formIsSmart ? formSmartQuery : undefined,
      });
    }
    setCreateDialogOpen(false);
    resetForm();
    setEditingSet(null);
  };

  const setToDelete = deleteSetId ? sets.find(s => s.id === deleteSetId) : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Test Sets</h2>
            <p className="text-sm text-muted-foreground">
              Organize test cases into reusable collections
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Test Set
          </Button>
        </div>
        
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search test sets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-4">
          <TabsList>
            <TabsTrigger value="all">All Sets ({filteredSets.length})</TabsTrigger>
            <TabsTrigger value="manual">
              <ListChecks className="h-3 w-3 mr-1" />
              Manual ({manualSets.length})
            </TabsTrigger>
            <TabsTrigger value="smart">
              <Zap className="h-3 w-3 mr-1" />
              Smart ({smartSets.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="all" className="mt-0 p-4">
            <TestSetGrid 
              sets={filteredSets} 
              onEdit={handleOpenEdit}
              onDelete={(id) => setDeleteSetId(id)}
              onDuplicate={onDuplicateSet}
              onAddToCycle={onAddToCycle}
              onView={onViewCases}
            />
          </TabsContent>
          <TabsContent value="manual" className="mt-0 p-4">
            <TestSetGrid 
              sets={manualSets} 
              onEdit={handleOpenEdit}
              onDelete={(id) => setDeleteSetId(id)}
              onDuplicate={onDuplicateSet}
              onAddToCycle={onAddToCycle}
              onView={onViewCases}
            />
          </TabsContent>
          <TabsContent value="smart" className="mt-0 p-4">
            <TestSetGrid 
              sets={smartSets} 
              onEdit={handleOpenEdit}
              onDelete={(id) => setDeleteSetId(id)}
              onDuplicate={onDuplicateSet}
              onAddToCycle={onAddToCycle}
              onView={onViewCases}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingSet ? 'Edit Test Set' : 'Create Test Set'}</DialogTitle>
            <DialogDescription>
              {formIsSmart 
                ? 'Smart sets automatically include test cases matching your criteria.' 
                : 'Manually add test cases to this set.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Smoke Tests, Regression Suite"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div className="space-y-0.5">
                <Label htmlFor="smart-toggle">Smart Set</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically filter test cases based on criteria
                </p>
              </div>
              <Switch
                id="smart-toggle"
                checked={formIsSmart}
                onCheckedChange={setFormIsSmart}
              />
            </div>

            {formIsSmart && (
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Filter className="h-4 w-4" />
                  Smart Filter Criteria
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={formSmartQuery.status?.[0] || ''}
                      onValueChange={(v) => setFormSmartQuery(prev => ({
                        ...prev,
                        status: v ? [v] : undefined
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        {availableStatuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Priority</Label>
                    <Select
                      value={formSmartQuery.priorityIds?.[0] || ''}
                      onValueChange={(v) => setFormSmartQuery(prev => ({
                        ...prev,
                        priorityIds: v ? [v] : undefined
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        {availablePriorities.map(priority => (
                          <SelectItem key={priority.id} value={priority.id}>
                            {priority.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={formSmartQuery.typeIds?.[0] || ''}
                      onValueChange={(v) => setFormSmartQuery(prev => ({
                        ...prev,
                        typeIds: v ? [v] : undefined
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        {availableTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Folder</Label>
                    <Select
                      value={formSmartQuery.folderIds?.[0] || ''}
                      onValueChange={(v) => setFormSmartQuery(prev => ({
                        ...prev,
                        folderIds: v ? [v] : undefined
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        {availableFolders.map(folder => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Search Keyword</Label>
                  <Input
                    value={formSmartQuery.search || ''}
                    onChange={(e) => setFormSmartQuery(prev => ({
                      ...prev,
                      search: e.target.value || undefined
                    }))}
                    placeholder="Filter by title keyword..."
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formName.trim()}>
              {editingSet ? 'Save Changes' : 'Create Set'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSetId} onOpenChange={() => setDeleteSetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Set</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{setToDelete?.name}"? 
              This will not delete the test cases in the set.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteSetId) {
                  onDeleteSet?.(deleteSetId);
                  setDeleteSetId(null);
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

interface TestSetGridProps {
  sets: TestSet[];
  onEdit?: (set: TestSet) => void;
  onDelete?: (setId: string) => void;
  onDuplicate?: (set: TestSet) => void;
  onAddToCycle?: (setId: string) => void;
  onView?: (setId: string) => void;
}

function TestSetGrid({
  sets,
  onEdit,
  onDelete,
  onDuplicate,
  onAddToCycle,
  onView,
}: TestSetGridProps) {
  if (sets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No test sets found</p>
        <p className="text-sm">Create a test set to organize your test cases</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sets.map(set => (
        <Card 
          key={set.id} 
          className={cn(
            'hover:shadow-md transition-shadow group cursor-pointer',
            set.isSmart && 'border-primary/30'
          )}
          onClick={() => onView?.(set.id)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base truncate">{set.name}</CardTitle>
                  {set.isSmart && (
                    <Badge variant="secondary" className="shrink-0">
                      <Zap className="h-3 w-3 mr-1" />
                      Smart
                    </Badge>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddToCycle?.(set.id); }}>
                    <Play className="h-4 w-4 mr-2" />
                    Add to Cycle
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(set); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(set); }}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDelete?.(set.id); }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="line-clamp-2 min-h-[2.5rem]">
              {set.description || 'No description'}
            </CardDescription>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <Badge variant="outline">
                {set.caseCount} test case{set.caseCount !== 1 ? 's' : ''}
              </Badge>
              <span className="text-xs text-muted-foreground">
                by {set.createdBy.name}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
