/**
 * Test Execution Panel
 * Full-featured execution interface with step-by-step tracking, evidence, and defects
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Minus,
  ChevronRight,
  ChevronDown,
  Bug,
  Paperclip,
  Upload,
  Trash2,
  Link,
  FileImage,
  FileVideo,
  File,
  Timer,
  Save,
  WifiOff,
  MoreVertical,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';
import {
  useTestExecution,
  StepResult,
  StepStatus,
  StepEvidence,
} from '../../hooks/useTestExecution';

interface TestExecutionPanelProps {
  executionId: string;
  programId: string;
  onComplete?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  showNavigation?: boolean;
}

const STATUS_CONFIG: Record<
  StepStatus,
  { icon: React.ReactNode; label: string; color: string }
> = {
  not_run: {
    icon: <Clock className="h-4 w-4" />,
    label: 'Not Run',
    color: 'bg-muted text-muted-foreground',
  },
  passed: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Passed',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    label: 'Failed',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
  blocked: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: 'Blocked',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  skipped: {
    icon: <Minus className="h-4 w-4" />,
    label: 'Skipped',
    color: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  },
};

export function TestExecutionPanel({
  executionId,
  programId,
  onComplete,
  onNext,
  onPrevious,
  showNavigation = false,
}: TestExecutionPanelProps) {
  const {
    execution,
    stepResults,
    linkedDefects,
    isLoading,
    isOnline,
    offlineQueue,
    elapsedSeconds,
    isTimerRunning,
    canEdit,
    updateStep,
    bulkUpdateSteps,
    resetExecution,
    startTimer,
    pauseTimer,
    saveEffort,
    uploadEvidence,
    deleteEvidence,
    getEvidenceUrl,
    isUploadingEvidence,
    createDefect,
    isCreatingDefect,
    saveComments,
  } = useTestExecution(executionId, programId);

  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [stepInputs, setStepInputs] = useState<
    Record<number, { actualResult: string; comments: string }>
  >({});
  const [overallComments, setOverallComments] = useState('');
  const [createDefectOpen, setCreateDefectOpen] = useState(false);
  const [defectForm, setDefectForm] = useState({
    title: '',
    description: '',
    severity: 'major',
    priority: 'medium',
    stepOrder: undefined as number | undefined,
  });

  // Initialize inputs from existing results
  useEffect(() => {
    const inputs: Record<number, { actualResult: string; comments: string }> = {};
    stepResults.forEach(sr => {
      inputs[sr.step_order] = {
        actualResult: sr.actual_result || '',
        comments: sr.comments || '',
      };
    });
    setStepInputs(inputs);
    setOverallComments(execution?.comments || '');
  }, [stepResults, execution?.comments]);

  const toggleStep = (stepOrder: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepOrder)) {
        next.delete(stepOrder);
      } else {
        next.add(stepOrder);
      }
      return next;
    });
  };

  const handleStepStatusChange = async (stepOrder: number, status: StepStatus) => {
    const input = stepInputs[stepOrder] || { actualResult: '', comments: '' };
    await updateStep({
      stepOrder,
      status,
      actualResult: input.actualResult,
      comments: input.comments,
    });
  };

  const handlePassAll = () => bulkUpdateSteps('passed');
  const handleReset = () => resetExecution();

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const openCreateDefect = (stepOrder?: number) => {
    const failedStep = stepOrder
      ? stepResults.find(s => s.step_order === stepOrder)
      : stepResults.find(s => s.status === 'failed');

    setDefectForm({
      title: `[${execution?.test_cycle?.key}] ${execution?.test_case?.title}`,
      description: failedStep
        ? `Step ${failedStep.step_order} failed.\n\nExpected: ${failedStep.expected_result || 'N/A'}\nActual: ${failedStep.actual_result || 'N/A'}`
        : '',
      severity: 'major',
      priority: 'medium',
      stepOrder,
    });
    setCreateDefectOpen(true);
  };

  const handleCreateDefect = async () => {
    await createDefect(defectForm);
    setCreateDefectOpen(false);
  };

  // Calculate progress
  const totalSteps = stepResults.length;
  const completedSteps = stepResults.filter(
    s => s.status !== 'not_run'
  ).length;
  const passedSteps = stepResults.filter(s => s.status === 'passed').length;
  const failedSteps = stepResults.filter(s => s.status === 'failed').length;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Execution not found
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">{execution.test_cycle?.key}</Badge>
                <Badge className={STATUS_CONFIG[execution.status]?.color}>
                  {STATUS_CONFIG[execution.status]?.label}
                </Badge>
                {!isOnline && (
                  <Badge variant="destructive" className="gap-1">
                    <WifiOff className="h-3 w-3" />
                    Offline
                  </Badge>
                )}
                {offlineQueue.length > 0 && (
                  <Badge variant="secondary">{offlineQueue.length} pending</Badge>
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground truncate">
                {execution.test_case?.title}
              </h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">
                    {execution.test_case?.priority}
                  </Badge>
                </span>
                {execution.test_case?.test_type && (
                  <span>{execution.test_case.test_type}</span>
                )}
              </div>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-lg">{formatTime(elapsedSeconds)}</span>
              </div>
              {isTimerRunning ? (
                <Button size="icon" variant="outline" onClick={() => pauseTimer()}>
                  <Pause className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="icon" variant="outline" onClick={() => startTimer()}>
                  <Play className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                {completedSteps} of {totalSteps} steps
              </span>
              <span className="text-muted-foreground">
                {passedSteps} passed, {failedSteps} failed
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={handlePassAll} disabled={!canEdit}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Pass All
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset} disabled={!canEdit}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
            {failedSteps > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600"
                onClick={() => openCreateDefect()}
              >
                <Bug className="h-4 w-4 mr-1.5" />
                Create Defect
              </Button>
            )}
            <div className="flex-1" />
            {showNavigation && (
              <>
                {onPrevious && (
                  <Button size="sm" variant="ghost" onClick={onPrevious}>
                    Previous
                  </Button>
                )}
                {onNext && (
                  <Button size="sm" onClick={onNext}>
                    Next Test
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Preconditions */}
        {execution.test_case?.preconditions && (
          <div className="p-4 border-b border-border bg-muted/30">
            <Label className="text-xs font-medium text-muted-foreground">Preconditions</Label>
            <p className="mt-1 text-sm">{execution.test_case.preconditions}</p>
          </div>
        )}

        {/* Steps */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {stepResults.map(step => (
              <StepCard
                key={step.step_order}
                step={step}
                isExpanded={expandedSteps.has(step.step_order)}
                onToggle={() => toggleStep(step.step_order)}
                onStatusChange={(status) => handleStepStatusChange(step.step_order, status)}
                inputs={stepInputs[step.step_order] || { actualResult: '', comments: '' }}
                onInputChange={(field, value) =>
                  setStepInputs(prev => ({
                    ...prev,
                    [step.step_order]: {
                      ...prev[step.step_order],
                      [field]: value,
                    },
                  }))
                }
                onSaveStep={() =>
                  handleStepStatusChange(step.step_order, step.status || 'not_run')
                }
                onUploadEvidence={async (file) => {
                  if (step.id) {
                    await uploadEvidence({ stepResultId: step.id, stepOrder: step.step_order, file });
                  }
                }}
                onDeleteEvidence={async (evidenceId, filePath) => {
                  await deleteEvidence({ evidenceId, fileUrl: filePath });
                }}
                getEvidenceUrl={getEvidenceUrl}
                isUploadingEvidence={isUploadingEvidence}
                onCreateDefect={() => openCreateDefect(step.step_order)}
                canEdit={canEdit}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Linked Defects */}
        {linkedDefects.length > 0 && (
          <div className="p-4 border-t border-border">
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              Linked Defects ({linkedDefects.length})
            </Label>
            <div className="flex flex-wrap gap-2">
              {linkedDefects.map(defect => (
                <Badge
                  key={defect.id}
                  variant="outline"
                  className="gap-1.5 cursor-pointer hover:bg-muted"
                >
                  <Bug className="h-3 w-3 text-red-500" />
                  {defect.defect_key}
                  <span className="text-muted-foreground">- {defect.title}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Overall Comments */}
        <div className="p-4 border-t border-border">
          <Label className="text-xs font-medium text-muted-foreground mb-2 block">
            Execution Notes
          </Label>
          <div className="flex gap-2">
            <Textarea
              value={overallComments}
              onChange={(e) => setOverallComments(e.target.value)}
              placeholder="Add notes about this execution..."
              className="min-h-[60px]"
              disabled={!canEdit}
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => saveComments(overallComments)}
              disabled={!canEdit}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Create Defect Dialog */}
        <Dialog open={createDefectOpen} onOpenChange={setCreateDefectOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Defect</DialogTitle>
              <DialogDescription>
                Create a new defect from this failed test execution.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={defectForm.title}
                  onChange={(e) => setDefectForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={defectForm.description}
                  onChange={(e) => setDefectForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select
                    value={defectForm.severity}
                    onValueChange={(v) => setDefectForm(f => ({ ...f, severity: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="trivial">Trivial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={defectForm.priority}
                    onValueChange={(v) => setDefectForm(f => ({ ...f, priority: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDefectOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDefect} disabled={isCreatingDefect}>
                {isCreatingDefect ? 'Creating...' : 'Create Defect'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface StepCardProps {
  step: StepResult;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: StepStatus) => void;
  inputs: { actualResult: string; comments: string };
  onInputChange: (field: 'actualResult' | 'comments', value: string) => void;
  onSaveStep: () => void;
  onUploadEvidence: (file: File) => Promise<void>;
  onDeleteEvidence: (evidenceId: string, filePath: string) => Promise<void>;
  getEvidenceUrl: (filePath: string) => string;
  isUploadingEvidence: boolean;
  onCreateDefect: () => void;
  canEdit: boolean;
}

function StepCard({
  step,
  isExpanded,
  onToggle,
  onStatusChange,
  inputs,
  onInputChange,
  onSaveStep,
  onUploadEvidence,
  onDeleteEvidence,
  getEvidenceUrl,
  isUploadingEvidence,
  onCreateDefect,
  canEdit,
}: StepCardProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov'],
      'application/pdf': ['.pdf'],
    },
    onDrop: (files) => {
      files.forEach((file) => onUploadEvidence(file));
    },
    disabled: !canEdit || !step.id,
  });

  const statusConfig = STATUS_CONFIG[step.status] || STATUS_CONFIG.not_run;

  const getFileIcon = (type: string) => {
    if (type.startsWith('image')) return <FileImage className="h-4 w-4" />;
    if (type.startsWith('video')) return <FileVideo className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <Card className={cn('transition-all', isExpanded && 'ring-1 ring-primary/20')}>
      <CardHeader
        className="p-3 cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-mono text-sm text-muted-foreground w-8">
              #{step.step_order}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{step.step_description}</p>
            {step.expected_result && !isExpanded && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                Expected: {step.expected_result}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {step.evidence.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Paperclip className="h-3 w-3" />
                {step.evidence.length}
              </Badge>
            )}
            <div className="flex gap-1">
              {(['passed', 'failed', 'blocked', 'skipped'] as StepStatus[]).map((status) => (
                <Tooltip key={status}>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant={step.status === status ? 'default' : 'ghost'}
                      className={cn(
                        'h-7 w-7',
                        step.status === status && STATUS_CONFIG[status].color
                      )}
                      onClick={() => onStatusChange(status)}
                      disabled={!canEdit}
                    >
                      {STATUS_CONFIG[status].icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{STATUS_CONFIG[status].label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4 px-4 space-y-4">
          {/* Expected Result */}
          {step.expected_result && (
            <div>
              <Label className="text-xs text-muted-foreground">Expected Result</Label>
              <p className="mt-1 text-sm bg-muted/50 p-2 rounded">{step.expected_result}</p>
            </div>
          )}

          {/* Actual Result */}
          <div>
            <Label className="text-xs text-muted-foreground">Actual Result</Label>
            <Textarea
              value={inputs.actualResult}
              onChange={(e) => onInputChange('actualResult', e.target.value)}
              placeholder="Enter actual result..."
              className="mt-1 min-h-[60px]"
              disabled={!canEdit}
            />
          </div>

          {/* Comments */}
          <div>
            <Label className="text-xs text-muted-foreground">Comments</Label>
            <Textarea
              value={inputs.comments}
              onChange={(e) => onInputChange('comments', e.target.value)}
              placeholder="Add comments..."
              className="mt-1 min-h-[40px]"
              disabled={!canEdit}
            />
          </div>

          {/* Evidence */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">Evidence</Label>
              {step.status === 'failed' && (
                <Button size="sm" variant="ghost" className="h-6 text-red-600" onClick={onCreateDefect}>
                  <Bug className="h-3 w-3 mr-1" />
                  Create Defect
                </Button>
              )}
            </div>

            {/* Existing Evidence */}
            {step.evidence.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {step.evidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="group relative flex items-center gap-2 p-2 bg-muted rounded border"
                  >
                    {ev.mime_type.startsWith('image') ? (
                      <img
                        src={getEvidenceUrl(ev.file_path)}
                        alt={ev.file_name}
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <div className="h-12 w-12 flex items-center justify-center bg-background rounded">
                        {getFileIcon(ev.mime_type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate max-w-[100px]">{ev.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(ev.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <a
                        href={getEvidenceUrl(ev.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-background rounded"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {canEdit && (
                        <button
                          onClick={() => onDeleteEvidence(ev.id, ev.file_path)}
                          className="p-1 hover:bg-background rounded text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Dropzone */}
            {canEdit && step.id && (
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                )}
              >
                <input {...getInputProps()} />
                {isUploadingEvidence ? (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                ) : isDragActive ? (
                  <p className="text-sm text-primary">Drop files here</p>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    <span>Drop files or click to upload evidence</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button size="sm" onClick={onSaveStep} disabled={!canEdit}>
              <Save className="h-4 w-4 mr-1.5" />
              Save Step
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
