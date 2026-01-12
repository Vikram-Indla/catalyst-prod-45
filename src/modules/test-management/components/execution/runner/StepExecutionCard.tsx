/**
 * Step Execution Card - Individual step with expand/collapse and actions
 * Enhanced with screenshot capture and file attachments
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  AlertTriangle,
  SkipForward,
  ChevronDown,
  Bug,
  Camera,
  Paperclip,
  Loader2,
} from 'lucide-react';
import type { StepResult, ExecutionStatus } from '../../../api/types';
import { AttachmentDropzone } from '../AttachmentDropzone';
import { useScreenshotCapture } from '../../../hooks/useScreenshotCapture';
import { useExecutionAttachments } from '../../../hooks/useExecutionAttachments';

interface StepExecutionCardProps {
  stepResult: StepResult;
  stepNumber: number;
  isActive: boolean;
  runId: string;
  onSelect: () => void;
  onSetStatus: (status: ExecutionStatus) => void;
  onLogDefect: () => void;
  isUpdating: boolean;
}

const statusConfig: Record<ExecutionStatus, {
  className: string;
  badgeClass: string;
  label: string;
  icon?: React.ReactNode;
}> = {
  not_run: {
    className: 'border-border bg-background',
    badgeClass: 'bg-gray-100 text-gray-700 border border-gray-300',
    label: 'Not Run',
  },
  in_progress: {
    className: 'border-primary/30 bg-background shadow-md shadow-primary/5',
    badgeClass: 'bg-blue-100 text-blue-700',
    label: 'In Progress',
  },
  passed: {
    className: 'border-l-[3px] border-l-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20',
    badgeClass: 'bg-green-100 text-green-700',
    label: 'Passed',
    icon: <Check className="h-2.5 w-2.5" />,
  },
  failed: {
    className: 'border-l-[3px] border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
    badgeClass: 'bg-red-100 text-red-700',
    label: 'Failed',
    icon: <X className="h-2.5 w-2.5" />,
  },
  blocked: {
    className: 'border-l-[3px] border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
    badgeClass: 'bg-yellow-100 text-yellow-700',
    label: 'Blocked',
    icon: <AlertTriangle className="h-2.5 w-2.5" />,
  },
  skipped: {
    className: 'border-l-[3px] border-l-gray-400 bg-gray-50 dark:bg-gray-900/20',
    badgeClass: 'bg-gray-100 text-gray-600',
    label: 'Skipped',
    icon: <SkipForward className="h-2.5 w-2.5" />,
  },
};

export function StepExecutionCard({
  stepResult,
  stepNumber,
  isActive,
  runId,
  onSelect,
  onSetStatus,
  onLogDefect,
  isUpdating,
}: StepExecutionCardProps) {
  const status = stepResult.status as ExecutionStatus;
  const isCompleted = ['passed', 'failed', 'blocked', 'skipped'].includes(status);
  
  const [isExpanded, setIsExpanded] = useState(isActive || status === 'not_run' || status === 'in_progress');
  const [actualResult, setActualResult] = useState(stepResult.actual_result || '');
  const [showAttachments, setShowAttachments] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);

  // Screenshot capture
  const { isCapturing, screenshots, captureScreenshot } = useScreenshotCapture();
  
  // File attachments
  const { 
    attachments, 
    isUploading, 
    uploadProgress, 
    uploadFiles, 
    deleteAttachment 
  } = useExecutionAttachments(runId);

  const config = statusConfig[status];
  const step = stepResult.step;

  // Auto-expand when becomes active or status changes to not_run
  React.useEffect(() => {
    if (isActive || status === 'not_run' || status === 'in_progress') {
      setIsExpanded(true);
    }
  }, [isActive, status]);

  // Handle screenshot capture
  const handleCaptureScreenshot = async () => {
    // Capture entire viewport as evidence
    await captureScreenshot(null, { backgroundColor: '#ffffff' });
  };

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    await uploadFiles(files, { runId, stepId: stepResult.step_id });
  };

  // Combine screenshots and file attachments
  const allAttachments = [
    ...screenshots.map(s => ({
      id: s.id,
      runId,
      stepId: stepResult.step_id,
      fileName: s.fileName,
      fileSize: s.size,
      mimeType: 'image/png',
      url: s.url,
      uploadedAt: s.timestamp,
    })),
    ...attachments.filter(a => a.stepId === stepResult.step_id),
  ];

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        ref={cardRef}
        className={cn(
          'border rounded-2xl overflow-hidden transition-all duration-300 ease-out',
          config.className,
          isActive && 'ring-2 ring-primary/20 shadow-lg scale-[1.01]',
          !isActive && 'hover:shadow-md hover:scale-[1.005]'
        )}
        onClick={() => {
          onSelect();
          if (!isExpanded) setIsExpanded(true);
        }}
      >
        {/* Step Header */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3.5 px-4 py-4 cursor-pointer">
            {/* Step Number / Status Icon */}
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm flex-shrink-0 transition-all',
              isCompleted
                ? status === 'passed' 
                  ? 'bg-emerald-600 text-white'
                  : status === 'failed'
                  ? 'bg-red-500 text-white'
                  : status === 'blocked'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-400 text-white'
                : isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-gray-100 text-gray-700'
            )}>
              {isCompleted && config.icon ? (
                <span className="scale-125">{config.icon}</span>
              ) : (
                stepNumber
              )}
            </div>

            {/* Step Content Preview */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground mb-0.5">
                {step?.action?.slice(0, 50) || `Step ${stepNumber}`}
                {step?.action && step.action.length > 50 && '...'}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate flex-1">
                  {step?.action?.slice(0, 40)}
                </span>
                <span className="text-muted-foreground/50">→</span>
                <span className="truncate flex-1">
                  {step?.expected_result?.slice(0, 40)}
                </span>
              </div>
            </div>

            {/* Attachment indicator */}
            {allAttachments.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                {allAttachments.length}
              </span>
            )}

            {/* Status Badge */}
            <span className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide',
              config.badgeClass
            )}>
              {config.icon}
              {config.label}
            </span>

            {/* Chevron */}
            <ChevronDown className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180'
            )} />
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div className="h-px bg-border mb-4" />

            {/* Step Fields - Grid Layout */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Test Data */}
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Test Data
                </label>
                <div className="p-3 bg-background border rounded-lg text-sm text-foreground font-mono whitespace-pre-wrap min-h-[60px]">
                  {step?.test_data || 'No test data'}
                </div>
              </div>
              
              {/* Expected Result */}
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Expected Result
                </label>
                <div className="p-3 bg-background border rounded-lg text-sm text-foreground min-h-[60px]">
                  {step?.expected_result || 'No expected result defined'}
                </div>
              </div>
            </div>

            {/* Actual Result Input */}
            {!isCompleted && (
              <div className="mb-4">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Actual Result
                </label>
                <Textarea
                  value={actualResult}
                  onChange={(e) => setActualResult(e.target.value)}
                  placeholder="Enter the actual result observed..."
                  className="min-h-[80px] resize-none"
                />
              </div>
            )}

            {/* Completed Actual Result */}
            {isCompleted && stepResult.actual_result && (
              <div className="mb-4">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Actual Result
                </label>
                <div className={cn(
                  "p-3 border rounded-lg text-sm",
                  status === 'passed' && "bg-teal-50 border-teal-200 dark:bg-teal-950/20 dark:border-teal-800",
                  status === 'failed' && "bg-destructive/5 border-destructive/20"
                )}>
                  {stepResult.actual_result}
                </div>
              </div>
            )}

            {/* Evidence Section */}
            {!isCompleted && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Evidence & Attachments
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCaptureScreenshot();
                      }}
                      disabled={isCapturing}
                    >
                      {isCapturing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Camera className="h-3 w-3" />
                      )}
                      Screenshot
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAttachments(!showAttachments);
                      }}
                    >
                      <Paperclip className="h-3 w-3" />
                      Attach File
                    </Button>
                  </div>
                </div>
                
                {showAttachments && (
                  <AttachmentDropzone
                    onUpload={handleFileUpload}
                    attachments={allAttachments}
                    onDelete={deleteAttachment}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                  />
                )}

                {/* Quick preview of attachments when dropzone is hidden */}
                {!showAttachments && allAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {allAttachments.slice(0, 4).map(att => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {att.mimeType.startsWith('image/') ? (
                          <img
                            src={att.url}
                            alt={att.fileName}
                            className="h-12 w-12 rounded-lg object-cover border border-border"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center border border-border">
                            <Paperclip className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </a>
                    ))}
                    {allAttachments.length > 4 && (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                        +{allAttachments.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {!isCompleted && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetStatus('passed');
                    }}
                    disabled={isUpdating}
                  >
                    <Check className="h-4 w-4" />
                    Pass
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-50 gap-1.5 px-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetStatus('failed');
                    }}
                    disabled={isUpdating}
                  >
                    <X className="h-4 w-4" />
                    Fail
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-500 text-amber-500 hover:bg-amber-50 gap-1.5 px-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetStatus('blocked');
                    }}
                    disabled={isUpdating}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Blocked
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-300 text-gray-600 hover:bg-gray-50 gap-1.5 px-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetStatus('skipped');
                    }}
                    disabled={isUpdating}
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/20 hover:bg-destructive/5 gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLogDefect();
                  }}
                  disabled={isUpdating}
                >
                  <Bug className="h-3.5 w-3.5" />
                  Log Defect
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
