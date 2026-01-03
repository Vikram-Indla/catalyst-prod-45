/**
 * TEST SET DETAIL DRAWER
 * View and edit test set with membership management
 */

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Package,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  ListChecks,
  History,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { runMutationWithAudit, createPipelineContext } from '../lib/actionPipeline';
import { ScopeType } from '../hooks/useGlobalTestScope';

interface TestSetDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string | null;
  scopeType: ScopeType;
  scopeId: string | null;
}

export function TestSetDetailDrawer({
  open,
  onOpenChange,
  setId,
  scopeType,
  scopeId,
}: TestSetDetailDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [caseSearch, setCaseSearch] = useState('');

  // Fetch set details
  const { data: testSet, isLoading } = useQuery({
    queryKey: ['test-set-detail', setId],
    queryFn: async () => {
      if (!setId) return null;
      const { data, error } = await supabase
        .from('test_sets')
        .select(`
          *,
          test_set_cases(
            id, case_id, sort_order,
            test_case:test_cases(id, title, status, priority)
          ),
          created_by_user:profiles!test_sets_created_by_fkey(id, full_name)
        `)
        .eq('id', setId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!setId,
  });

  // Fetch available test cases for adding
  const { data: availableCases } = useQuery({
    queryKey: ['available-test-cases', scopeType, scopeId, setId],
    queryFn: async () => {
      let query = supabase
        .from('test_cases')
        .select('id, title, status, priority')
        .is('deleted_at', null)
        .order('title');

      if (scopeType === 'program' && scopeId) {
        query = query.eq('program_id', scopeId);
      } else if (scopeType === 'project' && scopeId) {
        query = query.eq('project_id', scopeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter out already added cases
      const existingIds = new Set(
        testSet?.test_set_cases?.map((sc: any) => sc.case_id) || []
      );
      return (data || []).filter((c: any) => !existingIds.has(c.id));
    },
    enabled: open && !!setId && activeTab === 'cases',
  });

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  React.useEffect(() => {
    if (testSet) {
      setEditName(testSet.name || '');
      setEditDescription(testSet.description || '');
      setEditObjective(testSet.objective || '');
      setHasChanges(false);
    }
  }, [testSet]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !setId) throw new Error('Invalid state');

      const context = createPipelineContext(
        user.id,
        scopeType === 'project' ? 'project' : scopeType === 'program' ? 'program' : 'global',
        scopeId,
        scopeType === 'program' ? scopeId : null,
        scopeType === 'project' ? scopeId : null
      );

      return runMutationWithAudit(
        { name: editName, description: editDescription, objective: editObjective },
        {
          context,
          action: 'edit',
          entityType: 'test_sets',
          mutationFn: async (input) => {
            const { error } = await supabase
              .from('test_sets')
              .update({
                name: input.name.trim(),
                description: input.description.trim() || null,
                objective: input.objective.trim() || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', setId);

            if (error) throw error;
            return { id: setId };
          },
          getAuditInfo: (input) => ({
            entityId: setId,
            entityTitle: input.name,
            description: `Updated test set "${input.name}"`,
          }),
          activityType: 'updated',
          queryClient,
          invalidateKeys: [
            ['test-set-detail', setId],
            ['global-test-sets', scopeType, scopeId],
          ],
          successMessage: 'Test set updated',
        }
      );
    },
    onSuccess: () => setHasChanges(false),
  });

  // Add case mutation
  const addCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      if (!user || !setId) throw new Error('Invalid state');

      const { error } = await supabase.from('test_set_cases').insert({
        set_id: setId,
        case_id: caseId,
        added_by: user.id,
      });

      if (error) throw error;

      // Log audit
      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'cases_added',
        entity_type: 'test_set',
        entity_id: setId,
        description: 'Added test case to set',
      });

      return caseId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-set-detail', setId] });
      queryClient.invalidateQueries({ queryKey: ['available-test-cases'] });
      toast.success('Test case added');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Remove case mutation
  const removeCaseMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      if (!user || !setId) throw new Error('Invalid state');

      const { error } = await supabase
        .from('test_set_cases')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;

      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'cases_removed',
        entity_type: 'test_set',
        entity_id: setId,
        description: 'Removed test case from set',
      });

      return membershipId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-set-detail', setId] });
      queryClient.invalidateQueries({ queryKey: ['available-test-cases'] });
      toast.success('Test case removed');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filteredAvailableCases = (availableCases || []).filter((c: any) =>
    c.title?.toLowerCase().includes(caseSearch.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl bg-surface-1 border-border-default p-0 flex flex-col">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !testSet ? (
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
            <p className="text-text-secondary">Test set not found</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="p-4 border-b border-border-default">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-accent-subtle rounded-lg shrink-0">
                  <Package className="h-5 w-5 text-accent-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {testSet.key}
                    </Badge>
                    {testSet.is_smart_set && (
                      <Badge variant="secondary" className="text-xs">Smart</Badge>
                    )}
                  </div>
                  <SheetTitle className="text-lg text-text-primary text-left truncate">
                    {testSet.name}
                  </SheetTitle>
                  <p className="text-xs text-text-tertiary mt-1">
                    {testSet.test_set_cases?.length || 0} test cases
                  </p>
                </div>
              </div>
            </SheetHeader>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start rounded-none border-b border-border-default bg-transparent px-4">
                <TabsTrigger value="overview" className="data-[state=active]:bg-surface-2">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="cases" className="data-[state=active]:bg-surface-2">
                  Cases ({testSet.test_set_cases?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-surface-2">
                  History
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                {/* Overview Tab */}
                <TabsContent value="overview" className="p-4 space-y-4 m-0">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-text-primary">Name</Label>
                      <Input
                        value={editName}
                        onChange={(e) => {
                          setEditName(e.target.value);
                          setHasChanges(true);
                        }}
                        className="bg-surface-2 border-border-default"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-text-primary">Objective</Label>
                      <Input
                        value={editObjective}
                        onChange={(e) => {
                          setEditObjective(e.target.value);
                          setHasChanges(true);
                        }}
                        className="bg-surface-2 border-border-default"
                        placeholder="Set objective..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-text-primary">Description</Label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => {
                          setEditDescription(e.target.value);
                          setHasChanges(true);
                        }}
                        className="bg-surface-2 border-border-default min-h-[100px]"
                        placeholder="Set description..."
                      />
                    </div>

                    {hasChanges && (
                      <Button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="w-full"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border-default">
                    <p className="text-xs text-text-tertiary">
                      Created {format(new Date(testSet.created_at), 'MMM d, yyyy')}
                      {testSet.created_by_user && ` by ${(testSet.created_by_user as any).full_name}`}
                    </p>
                  </div>
                </TabsContent>

                {/* Cases Tab */}
                <TabsContent value="cases" className="p-4 space-y-4 m-0">
                  {/* Current cases */}
                  <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-2">
                      Included Test Cases
                    </h4>
                    {(testSet.test_set_cases?.length || 0) === 0 ? (
                      <p className="text-text-tertiary text-sm py-4 text-center">
                        No test cases in this set yet
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-[200px] overflow-auto">
                        {testSet.test_set_cases?.map((sc: any) => (
                          <div
                            key={sc.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-surface-hover group"
                          >
                            <ListChecks className="h-4 w-4 text-accent-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-text-primary truncate">
                                {sc.test_case?.title || 'Unknown'}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {sc.test_case?.priority || 'medium'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={() => removeCaseMutation.mutate(sc.id)}
                              disabled={removeCaseMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3 text-status-error" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add cases */}
                  <div className="pt-4 border-t border-border-default">
                    <h4 className="text-sm font-medium text-text-secondary mb-2">
                      Add Test Cases
                    </h4>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                      <Input
                        placeholder="Search cases..."
                        value={caseSearch}
                        onChange={(e) => setCaseSearch(e.target.value)}
                        className="pl-9 bg-surface-2 border-border-default h-9"
                      />
                    </div>
                    <div className="space-y-1 max-h-[200px] overflow-auto">
                      {filteredAvailableCases.length === 0 ? (
                        <p className="text-text-tertiary text-sm py-2 text-center">
                          No available test cases
                        </p>
                      ) : (
                        filteredAvailableCases.slice(0, 20).map((c: any) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-surface-hover cursor-pointer"
                            onClick={() => addCaseMutation.mutate(c.id)}
                          >
                            <Plus className="h-4 w-4 text-text-tertiary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-text-primary truncate">{c.title}</p>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {c.priority || 'medium'}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="p-4 m-0">
                  <HistoryTab setId={setId!} />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function HistoryTab({ setId }: { setId: string }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['test-set-history', setId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_activity_log')
        .select('*')
        .eq('entity_id', setId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!setId,
  });

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
        <p className="text-text-tertiary text-sm">No activity history</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry: any) => (
        <div key={entry.id} className="flex gap-3 p-3 bg-surface-2 rounded-lg">
          <div className="flex-1">
            <p className="text-sm text-text-primary">{entry.description}</p>
            <p className="text-xs text-text-tertiary mt-1">
              {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
