/**
 * Test Case Detail Panel
 * Full detail view with tabs: Overview | Steps | Executions | History
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  ListOrdered,
  PlayCircle,
  History,
  Save,
  Loader2,
  X,
  Calendar,
  Tag,
  User,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepsEditor } from '@/modules/in-jira/components/tests/StepsEditor';
import { toast } from 'sonner';

interface TestCaseDetailPanelProps {
  testCaseId: string | null;
  onClose: () => void;
  onUpdate: (data: any) => Promise<void>;
  isUpdating?: boolean;
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'text-status-error bg-status-error/10 border-status-error/20';
    case 'high': return 'text-status-warning bg-status-warning/10 border-status-warning/20';
    case 'medium': return 'text-accent-primary bg-accent-subtle border-accent-primary/20';
    case 'low': return 'text-text-tertiary bg-surface-3 border-border-default';
    default: return 'text-text-tertiary bg-surface-3 border-border-default';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'published': return 'text-status-success bg-status-success/10 border-status-success/20';
    case 'approved': return 'text-accent-primary bg-accent-subtle border-accent-primary/20';
    case 'under_review': return 'text-status-warning bg-status-warning/10 border-status-warning/20';
    case 'draft': return 'text-text-tertiary bg-surface-3 border-border-default';
    case 'deprecated': return 'text-status-error bg-status-error/10 border-status-error/20';
    default: return 'text-text-tertiary bg-surface-3 border-border-default';
  }
}

export function TestCaseDetailPanel({
  testCaseId,
  onClose,
  onUpdate,
  isUpdating = false,
}: TestCaseDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Fetch test case
  const { data: testCase, isLoading, refetch } = useQuery({
    queryKey: ['test-case-detail', testCaseId],
    queryFn: async () => {
      if (!testCaseId) return null;
      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .eq('id', testCaseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!testCaseId,
  });

  useEffect(() => {
    if (testCase) {
      setFormData({
        title: testCase.title,
        description: testCase.description,
        preconditions: testCase.preconditions,
        priority: testCase.priority,
        status: testCase.status,
        test_type: testCase.test_type,
        component: testCase.component,
        objective: testCase.objective,
      });
    }
  }, [testCase]);

  const handleSave = async () => {
    if (!testCase) return;
    try {
      await onUpdate({ id: testCase.id, ...formData });
      setEditMode(false);
      refetch();
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  if (!testCaseId) {
    return (
      <div className="h-full flex items-center justify-center text-text-tertiary">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a test case to view details</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!testCase) {
    return (
      <div className="h-full flex items-center justify-center text-text-tertiary">
        Test case not found
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-1 border-l border-border-default">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={cn('text-xs border', getPriorityColor(testCase.priority))}>
                {testCase.priority}
              </Badge>
              <Badge className={cn('text-xs border', getStatusColor(testCase.status))}>
                {testCase.status?.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {testCase.test_type}
              </Badge>
            </div>
            <h2 className="text-lg font-medium text-text-primary truncate">
              {testCase.title}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-text-tertiary">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(testCase.created_at), 'MMM d, yyyy')}
              </span>
              {testCase.component && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {testCase.component}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                  {isUpdating && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  Save
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                <Edit2 className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 border-b border-border-default">
          <TabsList className="bg-transparent border-0 h-10 p-0 gap-0">
            <TabsTrigger
              value="overview"
              className="h-10 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="steps"
              className="h-10 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent"
            >
              <ListOrdered className="h-3.5 w-3.5 mr-1.5" />
              Steps
            </TabsTrigger>
            <TabsTrigger
              value="executions"
              className="h-10 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent"
            >
              <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
              Executions
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="h-10 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent"
            >
              <History className="h-3.5 w-3.5 mr-1.5" />
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="overview" className="mt-0 space-y-4">
              {/* Description */}
              <div>
                <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Description
                </label>
                {editMode ? (
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData((p: any) => ({ ...p, description: e.target.value }))}
                    className="mt-1 bg-surface-2 border-border-default text-text-primary"
                    rows={3}
                  />
                ) : (
                  <p className="mt-1 text-sm text-text-secondary">
                    {testCase.description || '—'}
                  </p>
                )}
              </div>

              {/* Preconditions */}
              <div>
                <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Preconditions
                </label>
                {editMode ? (
                  <Textarea
                    value={formData.preconditions || ''}
                    onChange={(e) => setFormData((p: any) => ({ ...p, preconditions: e.target.value }))}
                    className="mt-1 bg-surface-2 border-border-default text-text-primary"
                    rows={2}
                  />
                ) : (
                  <p className="mt-1 text-sm text-text-secondary">
                    {testCase.preconditions || '—'}
                  </p>
                )}
              </div>

              {/* Objective */}
              <div>
                <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Objective
                </label>
                {editMode ? (
                  <Input
                    value={formData.objective || ''}
                    onChange={(e) => setFormData((p: any) => ({ ...p, objective: e.target.value }))}
                    className="mt-1 bg-surface-2 border-border-default text-text-primary"
                  />
                ) : (
                  <p className="mt-1 text-sm text-text-secondary">
                    {testCase.objective || '—'}
                  </p>
                )}
              </div>

              {/* Properties grid */}
              {editMode && (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="text-xs text-text-tertiary">Priority</label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData((p: any) => ({ ...p, priority: v }))}
                    >
                      <SelectTrigger className="mt-1 bg-surface-2 border-border-default">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-1 border-border-default">
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-text-tertiary">Status</label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData((p: any) => ({ ...p, status: v }))}
                    >
                      <SelectTrigger className="mt-1 bg-surface-2 border-border-default">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-1 border-border-default">
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="deprecated">Deprecated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-text-tertiary">Type</label>
                    <Select
                      value={formData.test_type}
                      onValueChange={(v) => setFormData((p: any) => ({ ...p, test_type: v }))}
                    >
                      <SelectTrigger className="mt-1 bg-surface-2 border-border-default">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-1 border-border-default">
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="automated">Automated</SelectItem>
                        <SelectItem value="bdd">BDD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="steps" className="mt-0">
              <StepsEditor testCaseId={testCase.id} readOnly={false} />
            </TabsContent>

            <TabsContent value="executions" className="mt-0">
              <ExecutionsTab testCaseId={testCase.id} />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <HistoryTab testCaseId={testCase.id} />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// Executions Tab
function ExecutionsTab({ testCaseId }: { testCaseId: string }) {
  const { data: executions, isLoading } = useQuery({
    queryKey: ['test-case-executions', testCaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cycle_executions')
        .select(`
          *,
          test_cycle:test_cycles(name, key)
        `)
        .eq('case_id', testCaseId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="space-y-2">
      {executions?.length === 0 ? (
        <div className="text-center py-8 text-text-tertiary">
          <PlayCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No executions yet</p>
        </div>
      ) : (
        executions?.map((exec: any) => (
          <div
            key={exec.id}
            className="flex items-center justify-between p-3 bg-surface-2 rounded-lg border border-border-default"
          >
            <div className="flex items-center gap-3">
              <Badge className={cn(
                exec.status === 'passed' && 'text-status-success bg-status-success/10',
                exec.status === 'failed' && 'text-status-error bg-status-error/10',
                exec.status === 'blocked' && 'text-status-warning bg-status-warning/10',
                (!exec.status || exec.status === 'not_run') && 'text-text-tertiary bg-surface-3'
              )}>
                {exec.status || 'Not Run'}
              </Badge>
              <span className="text-sm text-text-secondary">
                {exec.test_cycle?.name || 'Unknown Cycle'}
              </span>
            </div>
            {exec.executed_at && (
              <span className="text-xs text-text-quaternary">
                {format(new Date(exec.executed_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// History Tab
function HistoryTab({ testCaseId }: { testCaseId: string }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['test-case-history', testCaseId],
    queryFn: async () => {
      const [activityRes, auditRes] = await Promise.all([
        supabase
          .from('test_activity_log')
          .select('*')
          .eq('entity_id', testCaseId)
          .eq('entity_type', 'test_case')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('activity_logs')
          .select('*')
          .eq('entity_id', testCaseId)
          .eq('entity_type', 'test_cases')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const combined = [
        ...(activityRes.data || []).map(d => ({ ...d, source: 'activity' })),
        ...(auditRes.data || []).map(d => ({ ...d, source: 'audit' })),
      ].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return combined.slice(0, 30);
    },
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="space-y-2">
      {history?.length === 0 ? (
        <div className="text-center py-8 text-text-tertiary">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No history yet</p>
        </div>
      ) : (
        history?.map((entry: any, idx) => (
          <div
            key={idx}
            className="flex gap-3 p-3 bg-surface-2 rounded-lg border border-border-default"
          >
            <div className="w-2 h-2 rounded-full bg-accent-primary mt-1.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary">
                {entry.activity_type || entry.action}
              </p>
              {entry.description && (
                <p className="text-xs text-text-tertiary mt-0.5 truncate">
                  {entry.description}
                </p>
              )}
              <span className="text-[10px] text-text-quaternary mt-1 block">
                {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default TestCaseDetailPanel;
