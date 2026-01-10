/**
 * StepExecutionCard — Interactive step card for marking pass/fail/skip
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  XCircle, 
  MinusCircle, 
  Check, 
  X, 
  SkipForward,
  Camera,
  Upload,
  Paperclip,
  Bug
} from 'lucide-react';
import { ExecutionStep, StepResult } from '@/data/testExecutionData';

interface StepExecutionCardProps {
  step: ExecutionStep;
  index: number;
  result: StepResult | undefined;
  isActive: boolean;
  onStatusChange: (stepId: string, status: 'passed' | 'failed' | 'skipped') => void;
  onActualResultChange: (stepId: string, value: string) => void;
  onCommentChange: (stepId: string, value: string) => void;
  onActivate: () => void;
  onLogDefect: (stepId: string) => void;
}

export function StepExecutionCard({
  step,
  index,
  result,
  isActive,
  onStatusChange,
  onActualResultChange,
  onCommentChange,
  onActivate,
  onLogDefect,
}: StepExecutionCardProps) {
  const status = result?.status;
  
  const statusStyles = {
    passed: 'border-green-300 bg-green-50',
    failed: 'border-red-300 bg-red-50',
    skipped: 'border-yellow-300 bg-yellow-50',
    pending: 'border-gray-200 bg-background'
  };

  const statusBadgeStyles = {
    passed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div
      className={cn(
        "border-2 rounded-lg transition-all duration-300 cursor-pointer",
        statusStyles[status || 'pending'],
        isActive && !status && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={onActivate}
    >
      {/* Step Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          {status === 'passed' && <CheckCircle className="w-6 h-6 text-green-600" />}
          {status === 'failed' && <XCircle className="w-6 h-6 text-red-600" />}
          {status === 'skipped' && <MinusCircle className="w-6 h-6 text-yellow-600" />}
          {!status && (
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-foreground">{index + 1}</span>
            </div>
          )}
          
          <span className="font-semibold text-foreground">Step {index + 1}</span>
          
          {status && (
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", statusBadgeStyles[status])}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 px-3 transition-colors",
              status === 'passed' 
                ? "bg-green-600 text-white border-green-600 hover:bg-green-700" 
                : "text-green-600 border-green-300 hover:bg-green-50"
            )}
            onClick={(e) => { e.stopPropagation(); onStatusChange(step.id, 'passed'); }}
          >
            <Check className="w-4 h-4 mr-1" />
            Pass
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 px-3 transition-colors",
              status === 'failed' 
                ? "bg-red-600 text-white border-red-600 hover:bg-red-700" 
                : "text-red-600 border-red-300 hover:bg-red-50"
            )}
            onClick={(e) => { e.stopPropagation(); onStatusChange(step.id, 'failed'); }}
          >
            <X className="w-4 h-4 mr-1" />
            Fail
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 px-3 transition-colors",
              status === 'skipped' 
                ? "bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700" 
                : "text-yellow-600 border-yellow-300 hover:bg-yellow-50"
            )}
            onClick={(e) => { e.stopPropagation(); onStatusChange(step.id, 'skipped'); }}
          >
            <SkipForward className="w-4 h-4 mr-1" />
            Skip
          </Button>
        </div>
      </div>

      {/* Step Content */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
              Action
            </label>
            <p className="text-sm text-foreground">{step.action}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
              Expected Result
            </label>
            <p className="text-sm text-foreground">{step.expectedResult}</p>
          </div>
        </div>

        {/* Expanded Section (when active or has status) */}
        {(isActive || status) && (
          <div className="mt-4 pt-4 border-t border-gray-200/50 space-y-4">
            {/* Actual Result (for failed steps) */}
            {status === 'failed' && (
              <div>
                <label className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1 block">
                  Actual Result *
                </label>
                <Textarea
                  value={result?.actualResult || ''}
                  onChange={(e) => onActualResultChange(step.id, e.target.value)}
                  placeholder="Describe what actually happened..."
                  className="min-h-[80px] border-red-200 focus:border-red-400"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Comment */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                Comment (Optional)
              </label>
              <Textarea
                value={result?.comment || ''}
                onChange={(e) => onCommentChange(step.id, e.target.value)}
                placeholder="Add any notes about this step..."
                className="min-h-[60px]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                Attachments
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                  <Camera className="w-4 h-4 mr-2" />
                  Screenshot
                </Button>
                <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
                {result?.attachments?.map((att, i) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                    <Paperclip className="w-3 h-3" />
                    {att.name}
                    <X className="w-3 h-3 cursor-pointer hover:text-red-500" />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Defect Link (for failed steps) */}
            {status === 'failed' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={(e) => { e.stopPropagation(); onLogDefect(step.id); }}
              >
                <Bug className="w-4 h-4 mr-2" />
                Log Defect for This Step
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
