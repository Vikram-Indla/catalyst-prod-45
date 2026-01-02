/**
 * Test Case Drawer
 * Drawer with tabs: Overview | Steps | Executions | Traceability | AI | History
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  GitBranch,
  Sparkles,
  History,
  Link2,
  Save,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  User,
  Calendar,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TestCase, UpdateTestCaseInput } from '../../hooks/useTestCases';

interface TestCaseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCase: TestCase | null;
  onUpdate: (input: UpdateTestCaseInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isUpdating?: boolean;
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'text-status-error bg-status-error/10';
    case 'high': return 'text-status-warning bg-status-warning/10';
    case 'medium': return 'text-accent-primary bg-accent-subtle';
    case 'low': return 'text-text-tertiary bg-surface-3';
    default: return 'text-text-tertiary bg-surface-3';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'published': return 'text-status-success bg-status-success/10';
    case 'approved': return 'text-accent-primary bg-accent-subtle';
    case 'under_review': return 'text-status-warning bg-status-warning/10';
    case 'draft': return 'text-text-tertiary bg-surface-3';
    case 'deprecated': return 'text-status-error bg-status-error/10';
    default: return 'text-text-tertiary bg-surface-3';
  }
}

import { StepsEditor } from './StepsEditor';
import { AITestGeneratorPanel } from './AITestGeneratorPanel';

function StepsTab({ testCaseId }: { testCaseId: string }) {
  return (
    <StepsEditor testCaseId={testCaseId} />
  );
}

// Executions Tab Component
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

// History Tab Component
function HistoryTab({ testCaseId }: { testCaseId: string }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['test-case-history', testCaseId],
    queryFn: async () => {
      // Query both test_activity_log and activity_logs
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

      // Combine and sort by date
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
              {/* Show before/after for audit logs */}
              {entry.before_json && entry.after_json && (
                <div className="mt-2 text-xs space-y-1">
                  {Object.keys(entry.after_json).filter(k => 
                    entry.before_json[k] !== entry.after_json[k] &&
                    !['updated_at', 'created_at'].includes(k)
                  ).slice(0, 3).map(field => (
                    <div key={field} className="text-text-tertiary">
                      <span className="font-medium">{field}:</span>{' '}
                      <span className="line-through text-status-error/70">
                        {String(entry.before_json[field] || '—').slice(0, 30)}
                      </span>
                      {' → '}
                      <span className="text-status-success">
                        {String(entry.after_json[field] || '—').slice(0, 30)}
                      </span>
                    </div>
                  ))}
                </div>
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

export function TestCaseDrawer({
  open,
  onOpenChange,
  testCase,
  onUpdate,
  onDelete,
  isUpdating = false,
}: TestCaseDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<TestCase>>({});

  React.useEffect(() => {
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

  if (!testCase) return null;

  const handleSave = async () => {
    try {
      await onUpdate({
        id: testCase.id,
        ...formData,
      } as UpdateTestCaseInput);
      setEditMode(false);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this test case?')) {
      await onDelete(testCase.id);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] p-0 bg-surface-1 border-border-default">
        <SheetHeader className="px-6 py-4 border-b border-border-default">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={getPriorityColor(testCase.priority)}>
                  {testCase.priority}
                </Badge>
                <Badge className={getStatusColor(testCase.status)}>
                  {testCase.status}
                </Badge>
                <Badge variant="outline" className="text-text-secondary">
                  {testCase.test_type}
                </Badge>
              </div>
              <SheetTitle className="text-lg text-text-primary truncate">
                {testCase.title}
              </SheetTitle>
              <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
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
                  Edit
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-6 border-b border-border-default">
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
                value="traceability"
                className="h-10 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent"
              >
                <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                Trace
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="h-10 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                AI
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

          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-6">
              <TabsContent value="overview" className="mt-0 space-y-4">
                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                    Description
                  </label>
                  {editMode ? (
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
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
                      onChange={(e) => setFormData(p => ({ ...p, preconditions: e.target.value }))}
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
                      onChange={(e) => setFormData(p => ({ ...p, objective: e.target.value }))}
                      className="mt-1 bg-surface-2 border-border-default text-text-primary"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-text-secondary">
                      {testCase.objective || '—'}
                    </p>
                  )}
                </div>

                {/* Linked Story */}
                <div>
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    Linked Story
                  </label>
                  <div className="mt-1 p-2 bg-surface-2 rounded border border-border-default">
                    {testCase.linked_work_item_id ? (
                      <span className="text-sm text-accent-primary font-mono">
                        {testCase.linked_work_item_id.slice(0, 8)}...
                      </span>
                    ) : (
                      <span className="text-sm text-text-quaternary">No story linked</span>
                    )}
                  </div>
                </div>

                {/* Delete Action */}
                <div className="pt-4 border-t border-border-default">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-status-error border-status-error hover:bg-status-error/10"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete Test Case
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="steps" className="mt-0">
                <StepsTab testCaseId={testCase.id} />
              </TabsContent>

              <TabsContent value="executions" className="mt-0">
                <ExecutionsTab testCaseId={testCase.id} />
              </TabsContent>

              <TabsContent value="traceability" className="mt-0">
                <div className="text-center py-12 text-text-tertiary">
                  <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Traceability view coming soon</p>
                  <p className="text-xs mt-1">Linked requirements, coverage matrix</p>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="mt-0">
                <AITestGeneratorPanel
                  storyId={testCase.linked_work_item_id || undefined}
                  storyTitle={testCase.title}
                  storyDescription={testCase.description || undefined}
                  programId={testCase.program_id || undefined}
                  onTestsGenerated={() => {
                    toast.success('Test cases generated from AI');
                  }}
                />
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <HistoryTab testCaseId={testCase.id} />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default TestCaseDrawer;
