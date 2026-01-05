/**
 * Editor Header Component
 * Command bar style header with case info, quality score, and actions
 */

import React from 'react';
import {
  ChevronLeft,
  Copy,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { CaseStatus } from '../../../api/types';

interface EditorHeaderProps {
  caseKey?: string;
  status: CaseStatus;
  folderName?: string;
  qualityScore?: number;
  executionResults?: ('pass' | 'fail')[];
  collaborators?: { id: string; name: string; initials: string; color: string; isOnline: boolean }[];
  isDirty: boolean;
  isSaving: boolean;
  onBack: () => void;
  onSave: () => void;
  onClone?: () => void;
  onClose: () => void;
  disabled?: boolean;
}

const STATUS_CONFIG: Record<CaseStatus, { label: string; variant: 'warning' | 'success' | 'info' | 'muted' }> = {
  draft: { label: 'Draft', variant: 'warning' },
  ready: { label: 'Ready', variant: 'info' },
  approved: { label: 'Approved', variant: 'success' },
  needs_update: { label: 'Needs Update', variant: 'warning' },
  deprecated: { label: 'Deprecated', variant: 'muted' },
};

function QualityRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 12;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="relative w-7 h-7">
      <svg width="28" height="28" viewBox="0 0 32 32" className="-rotate-90">
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="3"
        />
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="hsl(var(--success))"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-success">
        {score}
      </span>
    </div>
  );
}

function ExecutionHistory({ results }: { results: ('pass' | 'fail')[] }) {
  const passCount = results.filter(r => r === 'pass').length;
  const passRate = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0;
  
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border border-border rounded-lg">
      <div className="flex gap-0.5">
        {results.map((result, i) => (
          <span
            key={i}
            className={cn(
              'w-2 h-2 rounded-sm',
              result === 'pass' ? 'bg-success' : 'bg-destructive'
            )}
          />
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground">
        <strong className="text-foreground">{passRate}%</strong> pass
      </span>
    </div>
  );
}

export function EditorHeader({
  caseKey,
  status,
  folderName,
  qualityScore = 0,
  executionResults = [],
  collaborators = [],
  isDirty,
  isSaving,
  onBack,
  onSave,
  onClone,
  onClose,
  disabled,
}: EditorHeaderProps) {
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <header className="flex items-center justify-between px-5 py-2.5 bg-gradient-to-b from-background to-muted/30 border-b border-border shrink-0">
      <div className="flex items-center gap-4">
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Case ID & Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
          <span className="font-mono text-[13px] font-bold text-primary">
            {caseKey || 'NEW'}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5',
              statusConfig.variant === 'warning' && 'bg-warning/10 text-warning border-warning/20',
              statusConfig.variant === 'success' && 'bg-success/10 text-success border-success/20',
              statusConfig.variant === 'info' && 'bg-primary/10 text-primary border-primary/20',
              statusConfig.variant === 'muted' && 'bg-muted text-muted-foreground border-border',
            )}
          >
            {statusConfig.label}
          </Badge>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <span className="cursor-pointer hover:text-primary transition-colors">
            {folderName || 'Root'}
          </span>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Quality Score */}
        {qualityScore > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-border rounded-lg cursor-default">
                <QualityRing score={qualityScore} />
                <span className="text-xs text-muted-foreground">
                  <strong className="text-success">{qualityScore}</strong> Quality
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Quality score based on completeness</TooltipContent>
          </Tooltip>
        )}

        {/* Execution History */}
        {executionResults.length > 0 && (
          <ExecutionHistory results={executionResults} />
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Collaborators */}
        {collaborators.length > 0 && (
          <>
            <div className="flex items-center -space-x-2">
              {collaborators.map((collab) => (
                <Tooltip key={collab.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'relative w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white border-2 border-background cursor-pointer hover:-translate-y-0.5 transition-transform',
                        collab.color
                      )}
                    >
                      {collab.initials}
                      {collab.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success border-2 border-background rounded-full" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{collab.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}

        {/* Actions */}
        {onClone && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onClone}>
            <Copy className="h-3.5 w-3.5" />
            Clone
          </Button>
        )}
        <Button
          size="sm"
          className="gap-1.5 bg-gradient-to-b from-primary to-primary/90 shadow-sm"
          onClick={onSave}
          disabled={disabled || isSaving}
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? 'Saving...' : isDirty ? 'Save' : 'Saved'}
          <kbd className="ml-1.5 px-1.5 py-0.5 bg-white/15 rounded text-[10px]">⌘S</kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
