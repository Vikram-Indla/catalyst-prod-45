import React from 'react';
import { FileText, AlertTriangle, Trash2, ArrowRight, Upload, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Wizard steps for reference
const WIZARD_STEPS = [
  { id: 1, name: 'Document Capture', shortName: 'Capture' },
  { id: 2, name: 'AI Analysis', shortName: 'Analysis' },
  { id: 3, name: 'FR Processing', shortName: 'FRs' },
  { id: 4, name: 'Compliance Gate', shortName: 'Compliance' },
  { id: 5, name: 'Clarification', shortName: 'Questions' },
  { id: 6, name: 'BRD Generation', shortName: 'BRD' },
  { id: 7, name: 'BR Linking', shortName: 'Linking' },
  { id: 8, name: 'Epic Publishing', shortName: 'Publish' },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', className: 'bg-primary/10 text-primary border-primary/20' },
  review: { label: 'Review', className: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20' },
  approved: { label: 'Approved', className: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20' },
  published: { label: 'Published', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

const VERDICT_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pass: { label: 'Compliant', icon: <CheckCircle className="h-3.5 w-3.5" />, className: 'text-[hsl(var(--success))]' },
  pending: { label: 'Pending', icon: <Clock className="h-3.5 w-3.5" />, className: 'text-[hsl(var(--warning))]' },
  fail: { label: 'Failed', icon: <XCircle className="h-3.5 w-3.5" />, className: 'text-[hsl(var(--danger))]' },
  na: { label: 'N/A', icon: <AlertCircle className="h-3.5 w-3.5" />, className: 'text-muted-foreground' },
};

interface DraftCardProps {
  draft: {
    id: string;
    draft_key: string;
    title: string;
    language: string;
    status: string;
    current_step: number;
    compliance_verdict: string | null;
    quality_score: number | null;
    updated_at: string;
  };
  onOpen: (draftId: string, e?: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onClick: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DraftCard({ draft, onOpen, onDelete, onClick }: DraftCardProps) {
  const isUntitled = draft.title === 'New Draft' || !draft.title;
  const currentStep = draft.current_step || 1;
  const completedSteps = Math.max(0, currentStep - 1);
  const progressPercent = (completedSteps / 8) * 100;
  const currentStepName = WIZARD_STEPS.find(s => s.id === currentStep)?.name || 'Unknown';
  const statusConfig = STATUS_CONFIG[draft.status] || STATUS_CONFIG.draft;
  const verdictConfig = draft.compliance_verdict ? VERDICT_CONFIG[draft.compliance_verdict] : null;

  // Determine CTA based on state
  const ctaLabel = isUntitled ? 'Upload Document' : 'Continue';
  const CtaIcon = isUntitled ? Upload : ArrowRight;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-xl border bg-card p-5 transition-all duration-200",
        "hover:shadow-md hover:border-primary/30 cursor-pointer",
        "dark:bg-[var(--bg-3)] dark:border-[var(--divider)]"
      )}
    >
      {/* Top Row: Document/Title + Status Badge */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isUntitled ? (
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--warning))]/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))]" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-lg">{draft.language === 'ar' ? '🇸🇦' : '🇬🇧'}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {!isUntitled && (
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <h3 className="font-medium text-sm truncate">
                {isUntitled ? 'Untitled Draft' : draft.title}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{draft.draft_key}</p>
          </div>
        </div>
        
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] font-medium rounded-full shrink-0",
            statusConfig.className
          )}
        >
          {statusConfig.label}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">
            Step {currentStep} of 8: {currentStepName}
          </span>
          <span className="text-xs font-medium tabular-nums">{completedSteps}/8</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-[hsl(var(--success))] rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Metrics Row (only show if has data) */}
      {!isUntitled && (verdictConfig || draft.quality_score !== null) && (
        <div className="flex items-center gap-3 mb-4">
          {verdictConfig && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
              <span className={verdictConfig.className}>{verdictConfig.icon}</span>
              <span className={cn("text-xs font-medium", verdictConfig.className)}>
                {verdictConfig.label}
              </span>
            </div>
          )}
          {draft.quality_score !== null && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
              <span className={cn(
                "text-xs font-semibold tabular-nums",
                draft.quality_score >= 80 ? 'text-[hsl(var(--success))]' :
                draft.quality_score >= 60 ? 'text-[hsl(var(--warning))]' :
                'text-[hsl(var(--danger))]'
              )}>
                ⭐ {draft.quality_score}
              </span>
              <span className="text-xs text-muted-foreground">Quality</span>
            </div>
          )}
        </div>
      )}

      {/* Warning for untitled drafts */}
      {isUntitled && (
        <p className="text-xs text-[hsl(var(--warning))] mb-4">
          Upload a requirements document to get started.
        </p>
      )}

      {/* Bottom Row: Updated time + Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          Updated {formatRelativeTime(draft.updated_at)}
        </span>
        
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(draft.id, e);
            }}
            className="gap-1.5 h-8"
          >
            {ctaLabel}
            <CtaIcon className="h-3.5 w-3.5" />
          </Button>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete Draft</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
