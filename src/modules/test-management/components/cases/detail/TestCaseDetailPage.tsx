/**
 * Test Case Detail Page - Section 3
 * Full test case detail with View/Edit modes
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useBeforeUnload, useBlocker } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
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
  ArrowLeft,
  Edit2,
  Save,
  X,
  Clock,
  User,
  Folder,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTestCaseDetail } from '../../../hooks/useTestCaseDetail';
import { StepEditor } from './StepEditor';
import { AttachmentsPanel } from './AttachmentsPanel';
import { ExecutionHistoryPanel } from './ExecutionHistoryPanel';
import { ActivityPanel } from './ActivityPanel';
import type {
  TestCaseDetail,
  AutosaveStatus,
  TestCaseStatusEnum,
} from '../../../types/test-case-detail';

// =============================================
// AUTOSAVE INDICATOR
// =============================================

function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
  if (status === 'idle') return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
        status === 'saving' && 'bg-amber-50 text-amber-600',
        status === 'saved' && 'bg-emerald-50 text-emerald-600',
        status === 'error' && 'bg-red-50 text-red-600'
      )}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <CheckCircle2 className="w-3 h-3" />
          <span>Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="w-3 h-3" />
          <span>Error</span>
        </>
      )}
    </div>
  );
}

// =============================================
// STATUS BADGE
// =============================================

function StatusBadge({ status }: { status: TestCaseStatusEnum }) {
  const variants: Record<
    TestCaseStatusEnum,
    { bg: string; text: string; label: string }
  > = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Draft' },
    ready: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Ready' },
    approved: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      label: 'Approved',
    },
    deprecated: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      label: 'Deprecated',
    },
    archived: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Archived' },
  };

  const variant = variants[status] || variants.draft;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variant.bg,
        variant.text
      )}
    >
      {variant.label}
    </span>
  );
}

// =============================================
// METADATA SIDEBAR
// =============================================

interface MetadataSidebarProps {
  testCase: TestCaseDetail;
  isEditing: boolean;
  onUpdate: (data: Record<string, unknown>) => void;
}

function MetadataSidebar({
  testCase,
  isEditing,
  onUpdate,
}: MetadataSidebarProps) {
  const statusOptions: TestCaseStatusEnum[] = [
    'draft',
    'ready',
    'approved',
    'deprecated',
    'archived',
  ];

  return (
    <div className="w-72 border-l border-slate-200 bg-slate-50 p-4 space-y-6 overflow-y-auto">
      {/* Status */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-2">
          Status
        </label>
        {isEditing ? (
          <Select
            value={testCase.status}
            onValueChange={(value) => onUpdate({ status: value })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  <StatusBadge status={s} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <StatusBadge status={testCase.status} />
        )}
      </div>

      {/* Folder */}
      {testCase.folder && (
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">
            Folder
          </label>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Folder className="w-4 h-4 text-slate-400" />
            {testCase.folder.name}
          </div>
        </div>
      )}

      {/* Assignee */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-2">
          Assignee
        </label>
        {testCase.assignee ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
              {testCase.assignee.initials}
            </div>
            <span className="text-sm text-slate-700">
              {testCase.assignee.name}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <User className="w-4 h-4" />
            Unassigned
          </div>
        )}
      </div>

      {/* Estimated Time */}
      {(testCase.estimatedTime || isEditing) && (
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">
            Estimated Time
          </label>
          {isEditing ? (
            <Input
              type="number"
              min={0}
              value={testCase.estimatedTime || ''}
              onChange={(e) =>
                onUpdate({
                  estimatedTime: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                })
              }
              placeholder="Minutes"
              className="h-9"
            />
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Clock className="w-4 h-4 text-slate-400" />
              {testCase.estimatedTime} min
            </div>
          )}
        </div>
      )}

      {/* Metrics */}
      <div className="pt-4 border-t border-slate-200 space-y-3">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Metrics
        </h4>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Executions</span>
          <span className="text-sm font-medium text-slate-800">
            {testCase.executionCount}
          </span>
        </div>

        {testCase.passRate !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Pass Rate</span>
            <span
              className={cn(
                'text-sm font-medium',
                testCase.passRate >= 80
                  ? 'text-emerald-600'
                  : testCase.passRate >= 50
                    ? 'text-amber-600'
                    : 'text-red-600'
              )}
            >
              {testCase.passRate.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Created/Updated */}
      <div className="pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-500">
        <div>
          <span className="block">Created by</span>
          <span className="text-slate-700">{testCase.createdByName}</span>
          <span className="block">
            {new Date(testCase.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div>
          <span className="block">Updated</span>
          <span className="block text-slate-700">
            {new Date(testCase.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

interface TestCaseDetailPageProps {
  projectId?: string;
}

export function TestCaseDetailPage({ projectId: propProjectId }: TestCaseDetailPageProps) {
  const { caseId } = useParams<{ caseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlProjectId = searchParams.get('projectId');
  const DEFAULT_TM_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
  const projectId = propProjectId || urlProjectId || DEFAULT_TM_PROJECT_ID;
  
  const initialEditMode = searchParams.get('edit') === '1';
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [activeTab, setActiveTab] = useState<string>('steps');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const {
    testCase,
    isLoading,
    error,
    autosaveStatus,
    pendingChanges,
    updateTestCase,
    updateTestCaseImmediate,
    addStep,
    updateStep,
    deleteStep,
    reorderSteps,
    duplicateStep,
    uploadAttachment,
    deleteAttachment,
  } = useTestCaseDetail({
    caseId: caseId || '',
    projectId,
  });

  // Track unsaved changes based on autosave status
  useEffect(() => {
    setHasUnsavedChanges(autosaveStatus === 'saving' || !!pendingChanges);
  }, [autosaveStatus, pendingChanges]);

  // Browser close/refresh warning
  useBeforeUnload(
    useCallback(
      (e) => {
        if (hasUnsavedChanges) {
          e.preventDefault();
          return 'You have unsaved changes';
        }
      },
      [hasUnsavedChanges]
    )
  );

  // Navigation blocker
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Only allow Escape in text fields
        if (e.key !== 'Escape') return;
      }

      // E = Enter edit mode
      if (e.key === 'e' && !isEditing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsEditing(true);
      }

      // Escape = Exit edit mode
      if (e.key === 'Escape' && isEditing) {
        e.preventDefault();
        setIsEditing(false);
      }

      // Cmd+S = Save (force immediate save)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isEditing && pendingChanges) {
          updateTestCaseImmediate(pendingChanges);
        }
      }

      // Cmd+Enter = Execute
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (caseId) {
          navigate(`/tests/cases/${caseId}/execute?projectId=${projectId}`);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, pendingChanges, updateTestCaseImmediate, caseId, projectId, navigate]);

  const handleBack = () => {
    navigate(`/tests/cases?projectId=${projectId}`);
  };

  const handleExecute = () => {
    if (caseId) {
      navigate(`/tests/cases/${caseId}/execute?projectId=${projectId}`);
    }
  };

  const handleTitleChange = useCallback(
    (title: string) => {
      updateTestCase({ title });
    },
    [updateTestCase]
  );

  const handleDescriptionChange = useCallback(
    (description: string) => {
      updateTestCase({ description });
    },
    [updateTestCase]
  );

  const handlePreconditionsChange = useCallback(
    (preconditions: string) => {
      updateTestCase({ preconditions });
    },
    [updateTestCase]
  );

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-surface-1">
        <div className="h-14 border-b border-slate-200 px-4 flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-96 mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !testCase) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-1">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">
            Test Case Not Found
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            The test case you're looking for doesn't exist or you don't have
            access.
          </p>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Test Cases
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Header */}
      <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="font-mono text-xs bg-blue-50 text-blue-700 border-blue-200"
            >
              {testCase.key}
            </Badge>
            <StatusBadge status={testCase.status} />
          </div>

          <AutosaveIndicator status={autosaveStatus} />
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              <X className="w-4 h-4 mr-1" />
              Done Editing
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button size="sm" onClick={handleExecute}>
                <Play className="w-4 h-4 mr-1" />
                Execute
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Edit Mode Banner */}
      {isEditing && (
        <div className="h-10 bg-blue-50 border-b border-blue-100 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm font-medium text-blue-700">Edit Mode</span>
            <span className="text-xs text-blue-500">Changes auto-save • Press Esc to exit</span>
          </div>
          <div className="flex items-center gap-2">
            <AutosaveIndicator status={autosaveStatus} />
            <kbd className="px-1.5 py-0.5 bg-white border border-blue-200 rounded text-[10px] font-mono text-blue-600">⌘S</kbd>
            <span className="text-[10px] text-blue-500">save</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Title */}
          <div className="mb-6">
            {isEditing ? (
              <Input
                value={testCase.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-xl font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
                placeholder="Test case title..."
              />
            ) : (
              <h1 className="text-xl font-semibold text-slate-800">
                {testCase.title}
              </h1>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Description
            </label>
            {isEditing ? (
              <Textarea
                value={testCase.description || ''}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Describe the test case..."
                className="min-h-[100px]"
              />
            ) : (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {testCase.description || (
                  <span className="text-slate-400 italic">No description</span>
                )}
              </p>
            )}
          </div>

          {/* Preconditions */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Preconditions
            </label>
            {isEditing ? (
              <Textarea
                value={testCase.preconditions || ''}
                onChange={(e) => handlePreconditionsChange(e.target.value)}
                placeholder="Prerequisites before running this test..."
                className="min-h-[80px]"
              />
            ) : (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {testCase.preconditions || (
                  <span className="text-slate-400 italic">
                    No preconditions
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="steps">
                Steps ({testCase.steps.length})
              </TabsTrigger>
              <TabsTrigger value="attachments">
                Attachments ({testCase.attachments.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                History ({testCase.executionHistory.length})
              </TabsTrigger>
              <TabsTrigger value="activity">
                Activity ({testCase.activities.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="steps" className="mt-0">
              <StepEditor
                steps={testCase.steps}
                isEditing={isEditing}
                onAddStep={addStep}
                onUpdateStep={updateStep}
                onDeleteStep={deleteStep}
                onDuplicateStep={duplicateStep}
                onReorderSteps={reorderSteps}
              />
            </TabsContent>

            <TabsContent value="attachments" className="mt-0">
              <AttachmentsPanel
                attachments={testCase.attachments}
                isEditing={isEditing}
                onUpload={uploadAttachment}
                onDelete={deleteAttachment}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <ExecutionHistoryPanel
                executions={testCase.executionHistory}
                onViewExecution={(id) => navigate(`/tests/executions/${id}`)}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <ActivityPanel activities={testCase.activities} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <MetadataSidebar
          testCase={testCase}
          isEditing={isEditing}
          onUpdate={updateTestCase}
        />
      </div>

      {/* Unsaved Changes Dialog */}
      {blocker.state === 'blocked' && (
        <AlertDialog open={true} onOpenChange={() => blocker.reset?.()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. What would you like to do?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel onClick={() => blocker.reset?.()}>
                Cancel
              </AlertDialogCancel>
              <Button
                variant="outline"
                onClick={() => blocker.proceed?.()}
              >
                Discard Changes
              </Button>
              <AlertDialogAction
                onClick={async () => {
                  if (pendingChanges) {
                    await updateTestCaseImmediate(pendingChanges);
                  }
                  blocker.proceed?.();
                }}
              >
                Save & Leave
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default TestCaseDetailPage;
