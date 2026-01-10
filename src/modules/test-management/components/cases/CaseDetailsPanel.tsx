/**
 * Case Details Panel Component
 * Enterprise-grade right panel showing case details with tabs
 * Real-time subscribed to test case changes
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Edit,
  Copy,
  PlayCircle,
  Clock,
  User,
  Calendar,
  Tag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Minus,
  FolderOpen,
  FileText,
  Activity,
  Link2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { TestCase, TestStep, CaseStatus, ExecutionStatus } from '../../api/types';
import { formatDistanceToNow, format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

interface CaseDetailsPanelProps {
  testCase: TestCase | null;
  steps: TestStep[];
  isLoading?: boolean;
  onClose: () => void;
  onEdit: (testCase: TestCase) => void;
  onDuplicate: (testCase: TestCase) => void;
  onAddToCycle: (testCase: TestCase) => void;
}

const STATUS_CONFIG: Record<CaseStatus, { label: string; className: string; bgClass: string }> = {
  draft: { label: 'Draft', className: 'text-muted-foreground', bgClass: 'bg-muted' },
  ready: { label: 'Ready', className: 'text-blue-700 dark:text-blue-400', bgClass: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' },
  approved: { label: 'Approved', className: 'text-green-700 dark:text-green-400', bgClass: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' },
  needs_update: { label: 'Needs Update', className: 'text-amber-700 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800' },
  deprecated: { label: 'Deprecated', className: 'text-red-700 dark:text-red-400', bgClass: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' },
};

const EXECUTION_STATUS_CONFIG: Record<ExecutionStatus, { icon: React.ElementType; className: string; label: string }> = {
  not_run: { icon: Minus, className: 'text-muted-foreground', label: 'Not Run' },
  in_progress: { icon: Clock, className: 'text-blue-500', label: 'In Progress' },
  passed: { icon: CheckCircle2, className: 'text-green-600', label: 'Passed' },
  failed: { icon: XCircle, className: 'text-red-600', label: 'Failed' },
  blocked: { icon: AlertCircle, className: 'text-amber-500', label: 'Blocked' },
  skipped: { icon: Minus, className: 'text-muted-foreground', label: 'Skipped' },
};

export function CaseDetailsPanel({
  testCase,
  steps,
  isLoading,
  onClose,
  onEdit,
  onDuplicate,
  onAddToCycle,
}: CaseDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [assignedUser, setAssignedUser] = useState<{ id: string; full_name?: string; avatar_url?: string } | null>(null);
  const [folder, setFolder] = useState<{ id: string; name: string } | null>(null);
  const queryClient = useQueryClient();

  // Fetch assigned user profile
  useEffect(() => {
    if (!testCase?.owner_id && !(testCase as any)?.assigned_to) {
      setAssignedUser(null);
      return;
    }

    const userId = (testCase as any)?.assigned_to || testCase?.owner_id;
    
    const fetchUser = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', userId)
        .single();
      
      if (data) {
        setAssignedUser(data);
      }
    };

    fetchUser();
  }, [testCase?.owner_id, (testCase as any)?.assigned_to]);

  // Fetch folder info and subscribe to changes
  useEffect(() => {
    if (!testCase?.folder_id) {
      setFolder(testCase?.folder || null);
      return;
    }

    const fetchFolder = async () => {
      const { data } = await supabase
        .from('tm_folders')
        .select('id, name')
        .eq('id', testCase.folder_id)
        .single();
      
      if (data) {
        setFolder(data);
      }
    };

    fetchFolder();

    // Subscribe to folder changes
    const channel = supabase
      .channel(`folder-${testCase.folder_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_folders',
          filter: `id=eq.${testCase.folder_id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setFolder({ id: payload.new.id, name: payload.new.name });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [testCase?.folder_id, testCase?.folder]);

  // Real-time subscription for test case changes
  useEffect(() => {
    if (!testCase?.id) return;

    const channel = supabase
      .channel(`test-case-${testCase.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_test_cases',
          filter: `id=eq.${testCase.id}`,
        },
        () => {
          // Invalidate queries to refetch updated data
          queryClient.invalidateQueries({ queryKey: ['tm-cases', 'detail', testCase.id] });
          queryClient.invalidateQueries({ queryKey: ['tm-cases', 'list'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [testCase?.id, queryClient]);

  // Real-time subscription for test runs (last run status)
  useEffect(() => {
    if (!testCase?.id) return;

    const channel = supabase
      .channel(`test-runs-${testCase.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_test_runs',
        },
        () => {
          // Invalidate to get latest run status
          queryClient.invalidateQueries({ queryKey: ['tm-cases', 'detail', testCase.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [testCase?.id, queryClient]);

  if (!testCase && !isLoading) {
    return null;
  }

  if (isLoading || !testCase) {
    return (
      <div className="w-[420px] border-l border-border bg-background flex flex-col shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="p-5 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[testCase.status];
  const lastRunConfig = testCase._lastRunStatus ? EXECUTION_STATUS_CONFIG[testCase._lastRunStatus] : null;
  const LastRunIcon = lastRunConfig?.icon;

  // Get initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="w-[420px] border-l border-border bg-background flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b bg-muted/30">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-2">
            <code className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
              {testCase.case_key}
            </code>
            <Badge variant="outline" className={cn('text-xs font-medium border', statusConfig.bgClass, statusConfig.className)}>
              {statusConfig.label}
            </Badge>
          </div>
          <h3 className="text-base font-semibold leading-tight line-clamp-2">{testCase.title}</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 h-8 w-8 rounded-full hover:bg-muted">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-b bg-background">
        <Button size="sm" onClick={() => onEdit(testCase)} className="gap-1.5 h-8 text-xs font-medium">
          <Edit className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDuplicate(testCase)} className="gap-1.5 h-8 text-xs font-medium">
          <Copy className="h-3.5 w-3.5" />
          Clone
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAddToCycle(testCase)} className="gap-1.5 h-8 text-xs font-medium">
          <PlayCircle className="h-3.5 w-3.5" />
          Add to Cycle
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start px-5 border-b rounded-none bg-transparent h-auto py-0 shrink-0">
          <TabsTrigger
            value="details"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 text-sm font-medium"
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Details
          </TabsTrigger>
          <TabsTrigger
            value="steps"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 text-sm font-medium"
          >
            <Activity className="h-3.5 w-3.5 mr-1.5" />
            Steps ({steps.length})
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 text-sm font-medium"
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            History
          </TabsTrigger>
          <TabsTrigger
            value="links"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 text-sm font-medium"
          >
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            Links
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="details" className="p-5 m-0 space-y-5">
            {/* Description Section */}
            {testCase.description && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</h4>
                <div className="text-sm leading-relaxed bg-muted/30 rounded-lg p-3 border">
                  {testCase.description}
                </div>
              </div>
            )}

            {/* Preconditions Section */}
            {testCase.preconditions && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preconditions</h4>
                <div className="text-sm leading-relaxed bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  {testCase.preconditions}
                </div>
              </div>
            )}

            <Separator />

            {/* Metadata Grid - Enterprise Style */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</h4>
              
              <div className="space-y-3">
                {/* Priority */}
                <div className="flex items-center justify-between py-2 border-b border-dashed">
                  <span className="text-sm text-muted-foreground font-medium">Priority</span>
                  {testCase.priority ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: testCase.priority.color }}
                      />
                      <span className="text-sm font-medium">{testCase.priority.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Not set</span>
                  )}
                </div>

                {/* Type */}
                <div className="flex items-center justify-between py-2 border-b border-dashed">
                  <span className="text-sm text-muted-foreground font-medium">Type</span>
                  <span className="text-sm font-medium">
                    {testCase.case_type?.name || <span className="text-muted-foreground italic">Not set</span>}
                  </span>
                </div>

                {/* Assigned To */}
                <div className="flex items-center justify-between py-2 border-b border-dashed">
                  <span className="text-sm text-muted-foreground font-medium">Assigned To</span>
                  {assignedUser ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={assignedUser.avatar_url} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {getInitials(assignedUser.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{assignedUser.full_name || 'Unknown'}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Unassigned</span>
                  )}
                </div>

                {/* Folder */}
                <div className="flex items-center justify-between py-2 border-b border-dashed">
                  <span className="text-sm text-muted-foreground font-medium">Folder</span>
                  <div className="flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {folder?.name || testCase.folder?.name || <span className="text-muted-foreground italic">Root</span>}
                    </span>
                  </div>
                </div>

                {/* Last Run */}
                <div className="flex items-center justify-between py-2 border-b border-dashed">
                  <span className="text-sm text-muted-foreground font-medium">Last Run</span>
                  {lastRunConfig && LastRunIcon ? (
                    <div className="flex items-center gap-1.5">
                      <LastRunIcon className={cn('h-4 w-4', lastRunConfig.className)} />
                      <span className={cn('text-sm font-medium', lastRunConfig.className)}>
                        {lastRunConfig.label}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Never run</span>
                  )}
                </div>
              </div>
            </div>

            {/* Labels Section */}
            {testCase.labels && testCase.labels.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labels</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {testCase.labels.map((label) => (
                      <Badge
                        key={label.id}
                        style={{ backgroundColor: label.color }}
                        className="text-white text-xs font-medium px-2 py-0.5"
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Timestamps Section */}
            <Separator />
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Created {format(new Date(testCase.created_at), 'MMM d, yyyy · h:mm a')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Updated {formatDistanceToNow(new Date(testCase.updated_at), { addSuffix: true })}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="steps" className="p-5 m-0">
            {steps.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Activity className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">No steps defined</p>
                <p className="text-xs text-muted-foreground mt-1">Edit this test case to add steps</p>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {step.step_number}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Step</span>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Action</span>
                        <p className="leading-relaxed">{step.action}</p>
                      </div>
                      
                      {step.test_data && (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Test Data</span>
                          <code className="block text-xs bg-muted p-2 rounded font-mono">
                            {step.test_data}
                          </code>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Expected Result</span>
                        <p className="leading-relaxed text-green-700 dark:text-green-400">{step.expected_result}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="p-5 m-0">
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Execution history coming soon</p>
              <p className="text-xs text-muted-foreground mt-1">Track all test runs for this case</p>
            </div>
          </TabsContent>

          <TabsContent value="links" className="p-5 m-0">
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Link2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Linked items coming soon</p>
              <p className="text-xs text-muted-foreground mt-1">Connect requirements, stories, and defects</p>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

export default CaseDetailsPanel;
