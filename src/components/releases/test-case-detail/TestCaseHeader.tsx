/**
 * Test Case Header Component
 * Displays title, status, meta information — wired to real DB data with title persistence
 */

import { useState, useEffect } from 'react';
import { Pencil, CheckCircle, XCircle, Circle, AlertTriangle, ArrowUp, Minus, ArrowDown, Loader2, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TestCaseDetailData } from '@/hooks/test-management/useTestCases';

interface TestCaseHeaderProps {
  testCase: TestCaseDetailData;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  'DRAFT': { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' },
  'REVIEW': { label: 'Ready', className: 'bg-primary/10 text-primary border-primary/20' },
  'APPROVED': { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-200' },
  'DEPRECATED': { label: 'Deprecated', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const lastRunConfig: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  passed: { label: 'Passed', icon: CheckCircle, className: 'text-green-600' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-destructive' },
  blocked: { label: 'Blocked', icon: Minus, className: 'text-yellow-600' },
  not_run: { label: 'Not Run', icon: Circle, className: 'text-muted-foreground' },
};

const priorityConfig: Record<string, { icon: typeof AlertTriangle; className: string; label: string }> = {
  'Critical': { icon: AlertTriangle, className: 'text-destructive', label: 'Critical' },
  'High': { icon: ArrowUp, className: 'text-orange-600', label: 'High' },
  'Medium': { icon: Minus, className: 'text-yellow-600', label: 'Medium' },
  'Low': { icon: ArrowDown, className: 'text-muted-foreground', label: 'Low' },
};

const typeConfig: Record<string, { className: string }> = {
  'Functional': { className: 'bg-primary/10 text-primary border-primary/20' },
  'Regression': { className: 'bg-purple-50 text-purple-700 border-purple-200' },
  'Smoke': { className: 'bg-orange-50 text-orange-700 border-orange-200' },
  'Integration': { className: 'bg-teal-50 text-teal-700 border-teal-200' },
  'E2E': { className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'Performance': { className: 'bg-pink-50 text-pink-700 border-pink-200' },
  'Security': { className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function TestCaseHeader({ testCase }: TestCaseHeaderProps) {
  const queryClient = useQueryClient();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(testCase.title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  useEffect(() => {
    setTitle(testCase.title);
  }, [testCase.title]);

  const handleSaveTitle = async () => {
    if (!title.trim() || title === testCase.title) {
      setIsEditingTitle(false);
      return;
    }
    setIsSavingTitle(true);
    try {
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ title: title.trim() })
        .eq('id', testCase.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['tm-case', testCase.id] });
      await queryClient.invalidateQueries({ queryKey: ['tm-cases'] });
      toast.success('Title updated');
      setIsEditingTitle(false);
    } catch (error) {
      toast.error('Failed to update title');
      setTitle(testCase.title);
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setTitle(testCase.title);
    setIsEditingTitle(false);
  };

  const statusKey = testCase.status || 'DRAFT';
  const status = statusConfig[statusKey] || statusConfig['DRAFT'];
  const lastRunStatus = testCase.last_execution?.status || 'not_run';
  const lastRun = lastRunConfig[lastRunStatus] || lastRunConfig['not_run'];
  const LastRunIcon = lastRun.icon;
  const priorityName = testCase.priority?.name || 'Medium';
  const priority = priorityConfig[priorityName] || priorityConfig['Medium'];
  const PriorityIcon = priority.icon;
  const typeName = testCase.type?.name || 'Functional';
  const type = typeConfig[typeName] || typeConfig['Functional'];
  const assigneeName = testCase.assigned_user?.full_name || 'Unassigned';
  const assigneeAvatar = testCase.assigned_user?.avatar_url;
  const estimatedMinutes = testCase.estimated_duration_minutes;
  const estimatedTime = estimatedMinutes ? `${estimatedMinutes} min` : testCase.steps?.length ? `${Math.ceil((testCase.steps.length * 30) / 60)} min` : '—';
  const createdAt = testCase.created_at ? format(new Date(testCase.created_at), 'MMM d, yyyy') : '—';

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-primary font-semibold">{testCase.key}</span>
          <Badge variant="outline" className={cn('text-xs font-medium', status.className)}>{status.label}</Badge>
          <div className={cn('flex items-center gap-1.5 text-sm', lastRun.className)}>
            <LastRunIcon className="w-4 h-4" />
            <span>Last Run: {lastRun.label}</span>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">Created {createdAt}</span>
      </div>

      <div className="mb-4">
        {isEditingTitle ? (
          <div className="flex items-center gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-xl font-semibold flex-1" autoFocus disabled={isSavingTitle} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') handleCancelEdit(); }} />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveTitle} disabled={isSavingTitle || !title.trim()}>
              {isSavingTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-600" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelEdit} disabled={isSavingTitle}>
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsEditingTitle(true)}>
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{testCase.objective || testCase.preconditions || 'No description provided.'}</p>

      <div className="flex items-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2"><span className="text-muted-foreground">Type:</span><Badge variant="outline" className={cn('text-xs font-medium capitalize', type.className)}>{typeName}</Badge></div>
        <div className="flex items-center gap-2"><span className="text-muted-foreground">Priority:</span><span className={cn('flex items-center gap-1', priority.className)}><PriorityIcon className="w-4 h-4" />{priority.label}</span></div>
        <div className="flex items-center gap-2"><span className="text-muted-foreground">Assignee:</span><div className="flex items-center gap-1.5"><Avatar className="h-5 w-5">{assigneeAvatar && <AvatarImage src={assigneeAvatar} alt={assigneeName} />}<AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(assigneeName)}</AvatarFallback></Avatar><span>{assigneeName}</span></div></div>
        <div className="flex items-center gap-2"><span className="text-muted-foreground">Est. Time:</span><span>{estimatedTime}</span></div>
      </div>
    </div>
  );
}
