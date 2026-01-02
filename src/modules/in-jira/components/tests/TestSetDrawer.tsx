/**
 * Test Set Drawer
 * View/edit test set with cases management
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Folder,
  FileText,
  Settings,
  History,
  Zap,
  Save,
  Loader2,
  Plus,
  Trash2,
  MoreHorizontal,
  GripVertical,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TestSetWithCount, UpdateTestSetInput, SmartSetCriteria } from '../../hooks/useTestSets';
import { useTestCases, TestCase } from '../../hooks/useTestCases';
import { useAuth } from '@/lib/auth';

interface TestSetDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testSet: TestSetWithCount | null;
  onUpdate: (input: UpdateTestSetInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddCases: (setId: string, caseIds: string[]) => Promise<void>;
  isUpdating?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function TestSetDrawer({
  open,
  onOpenChange,
  testSet,
  onUpdate,
  onDelete,
  onAddCases,
  isUpdating,
  canEdit,
  canDelete,
}: TestSetDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('cases');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showAddCases, setShowAddCases] = useState(false);
  const [selectedCasesToAdd, setSelectedCasesToAdd] = useState<Set<string>>(new Set());
  const [caseSearch, setCaseSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch cases in this set
  const { data: setCases, isLoading: loadingCases } = useQuery({
    queryKey: ['test-set-cases', testSet?.id],
    queryFn: async () => {
      if (!testSet) return [];
      const { data, error } = await supabase
        .from('test_set_cases')
        .select(`
          *,
          test_case:test_cases(*)
        `)
        .eq('set_id', testSet.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!testSet?.id && open,
  });

  // Fetch available cases for adding
  const { testCases: allCases } = useTestCases(testSet?.program_id || null);

  // Fetch activity history
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['test-set-history', testSet?.id],
    queryFn: async () => {
      if (!testSet) return [];
      const { data, error } = await supabase
        .from('test_activity_log')
        .select('*')
        .eq('entity_type', 'test_set')
        .eq('entity_id', testSet.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!testSet?.id && activeTab === 'history' && open,
  });

  const casesNotInSet = allCases.filter(
    tc => !setCases?.some(sc => sc.case_id === tc.id)
  ).filter(tc => 
    !caseSearch || tc.title.toLowerCase().includes(caseSearch.toLowerCase())
  );

  const handleStartEdit = () => {
    if (!testSet) return;
    setEditName(testSet.name);
    setEditDescription(testSet.description || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!testSet) return;
    await onUpdate({
      id: testSet.id,
      name: editName,
      description: editDescription,
    });
    setIsEditing(false);
  };

  const handleRemoveCase = async (caseId: string) => {
    if (!testSet) return;
    const { error } = await supabase
      .from('test_set_cases')
      .delete()
      .eq('set_id', testSet.id)
      .eq('case_id', caseId);
    
    if (error) {
      toast.error('Failed to remove case');
    } else {
      toast.success('Case removed from set');
      queryClient.invalidateQueries({ queryKey: ['test-set-cases', testSet.id] });
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
    }
  };

  const handleAddSelectedCases = async () => {
    if (!testSet || selectedCasesToAdd.size === 0) return;
    await onAddCases(testSet.id, Array.from(selectedCasesToAdd));
    setSelectedCasesToAdd(new Set());
    setShowAddCases(false);
    queryClient.invalidateQueries({ queryKey: ['test-set-cases', testSet.id] });
  };

  const handleDelete = async () => {
    if (!testSet) return;
    await onDelete(testSet.id);
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  const toggleCaseSelection = (caseId: string) => {
    setSelectedCasesToAdd(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  };

  if (!testSet) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b border-border-default">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="text-lg font-semibold"
                    autoFocus
                  />
                ) : (
                  <SheetTitle className="flex items-center gap-2">
                    <Folder className="h-5 w-5 text-accent-primary shrink-0" />
                    <span className="truncate">{testSet.name}</span>
                    {testSet.is_smart_set && (
                      <Badge variant="outline" className="ml-2 text-status-warning border-status-warning">
                        <Zap className="h-3 w-3 mr-1" />
                        Smart
                      </Badge>
                    )}
                  </SheetTitle>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">{testSet.key}</Badge>
                  <span className="text-xs text-text-tertiary">
                    {testSet.case_count} cases
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  isEditing ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={handleStartEdit}>
                      Edit
                    </Button>
                  )
                )}
              </div>
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 justify-start">
              <TabsTrigger value="cases" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Cases
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="h-3.5 w-3.5" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Cases Tab */}
            <TabsContent value="cases" className="flex-1 overflow-hidden m-0 px-6 py-4">
              <div className="h-full flex flex-col">
                {/* Add Cases Panel */}
                {showAddCases ? (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-text-primary">Add Cases to Set</p>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddCases(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
                      <Input
                        value={caseSearch}
                        onChange={e => setCaseSearch(e.target.value)}
                        placeholder="Search cases..."
                        className="pl-9"
                      />
                    </div>
                    <ScrollArea className="flex-1 border border-border-default rounded-lg">
                      {casesNotInSet.length === 0 ? (
                        <div className="p-8 text-center text-text-tertiary">
                          <p>No available cases</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border-default">
                          {casesNotInSet.map(tc => (
                            <label
                              key={tc.id}
                              className="flex items-center gap-3 p-3 hover:bg-surface-2 cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedCasesToAdd.has(tc.id)}
                                onCheckedChange={() => toggleCaseSelection(tc.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate">
                                  {tc.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="outline" className="text-xs">{tc.status}</Badge>
                                  <Badge variant="outline" className="text-xs">{tc.priority}</Badge>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    {selectedCasesToAdd.size > 0 && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-default">
                        <span className="text-sm text-text-secondary">
                          {selectedCasesToAdd.size} selected
                        </span>
                        <Button onClick={handleAddSelectedCases}>
                          Add to Set
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-text-secondary">
                        {setCases?.length || 0} cases in this set
                      </span>
                      {canEdit && !testSet.is_smart_set && (
                        <Button size="sm" onClick={() => setShowAddCases(true)}>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Cases
                        </Button>
                      )}
                    </div>

                    {testSet.is_smart_set && (
                      <div className="p-3 mb-3 bg-status-warning/10 rounded-lg border border-status-warning/20">
                        <p className="text-sm text-status-warning flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Smart sets auto-populate based on criteria
                        </p>
                      </div>
                    )}

                    <ScrollArea className="flex-1">
                      {loadingCases ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                        </div>
                      ) : setCases?.length === 0 ? (
                        <div className="text-center py-12 text-text-tertiary">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No test cases in this set</p>
                          {canEdit && !testSet.is_smart_set && (
                            <Button className="mt-3" size="sm" onClick={() => setShowAddCases(true)}>
                              Add Cases
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {setCases?.map((sc, idx) => (
                            <div
                              key={sc.id}
                              className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg border border-border-default group"
                            >
                              <GripVertical className="h-4 w-4 text-text-quaternary shrink-0" />
                              <span className="w-6 h-6 rounded-full bg-surface-3 flex items-center justify-center text-xs font-medium text-text-secondary">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate">
                                  {sc.test_case?.title || 'Unknown Case'}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="outline" className="text-xs">
                                    {sc.test_case?.status || '-'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {sc.test_case?.priority || '-'}
                                  </Badge>
                                </div>
                              </div>
                              {canEdit && !testSet.is_smart_set && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                  onClick={() => handleRemoveCase(sc.case_id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-status-error" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="flex-1 overflow-auto m-0 px-6 py-4">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1.5">
                    Description
                  </label>
                  {isEditing ? (
                    <Textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      className="min-h-[80px]"
                    />
                  ) : (
                    <p className="text-sm text-text-primary">
                      {testSet.description || 'No description'}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-surface-2 rounded-lg">
                    <p className="text-xs text-text-tertiary mb-1">Status</p>
                    <Badge>{testSet.status || 'active'}</Badge>
                  </div>
                  <div className="p-3 bg-surface-2 rounded-lg">
                    <p className="text-xs text-text-tertiary mb-1">Version</p>
                    <p className="text-sm font-medium">v{testSet.version || 1}</p>
                  </div>
                </div>

                {testSet.is_smart_set && testSet.smart_set_criteria && (
                  <div>
                    <p className="text-sm font-medium text-text-secondary mb-2">Smart Set Criteria</p>
                    <div className="p-3 bg-surface-2 rounded-lg">
                      {Object.entries(testSet.smart_set_criteria as SmartSetCriteria).map(([key, values]) => (
                        values && values.length > 0 && (
                          <div key={key} className="flex items-center gap-2 mb-2 last:mb-0">
                            <span className="text-xs text-text-tertiary capitalize">{key}:</span>
                            <div className="flex flex-wrap gap-1">
                              {values.map((v: string) => (
                                <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {canDelete && (
                  <div className="pt-4 border-t border-border-default">
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Test Set
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 overflow-hidden m-0 px-6 py-4">
              <ScrollArea className="h-full">
                {loadingHistory ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : history?.length === 0 ? (
                  <div className="text-center py-12 text-text-tertiary">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No activity recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history?.map(entry => (
                      <div
                        key={entry.id}
                        className="p-3 bg-surface-2 rounded-lg border border-border-default"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {entry.activity_type}
                          </Badge>
                          <span className="text-xs text-text-quaternary">
                            {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                        {entry.description && (
                          <p className="text-sm text-text-secondary">{entry.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Set?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{testSet.name}" and remove all case associations.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-status-error text-white hover:bg-status-error/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
