import React, { useState } from 'react';
import { 
  FileText, AlertTriangle, Trash2, ArrowUpRight, Upload, 
  CheckCircle, Clock, XCircle, Star, Link2, AlertCircle
} from 'lucide-react';
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
  in_progress: { label: 'In Progress', className: 'bg-primary/15 text-primary' },
  review: { label: 'Review', className: 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]' },
  approved: { label: 'Approved', className: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' },
  published: { label: 'Published', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

const VERDICT_CONFIG: Record<string, { label: string; icon: React.ReactNode; bgClass: string; textClass: string }> = {
  pass: { label: 'Compliant', icon: <CheckCircle className="h-4 w-4" />, bgClass: 'bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/20', textClass: 'text-[hsl(var(--success))]' },
  conditional: { label: 'Conditional', icon: <AlertCircle className="h-4 w-4" />, bgClass: 'bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/20', textClass: 'text-[hsl(var(--warning))]' },
  pending: { label: 'Pending', icon: <Clock className="h-4 w-4" />, bgClass: 'bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/20', textClass: 'text-[hsl(var(--warning))]' },
  fail: { label: 'Non-Compliant', icon: <XCircle className="h-4 w-4" />, bgClass: 'bg-[hsl(var(--danger))]/10 border-[hsl(var(--danger))]/20', textClass: 'text-[hsl(var(--danger))]' },
  na: { label: 'N/A', icon: <AlertCircle className="h-4 w-4" />, bgClass: 'bg-muted', textClass: 'text-muted-foreground' },
};

interface DraftCardAwardProps {
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
    fr_count?: number | null;
    linked_br?: string | null;
    document_pages?: number | null;
    document_size?: string | null;
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

function ComplianceBadge({ score, status }: { score?: number | null; status?: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  
  const config = VERDICT_CONFIG[status] || VERDICT_CONFIG.pending;
  const displayScore = score ?? (status === 'pass' ? 94 : status === 'conditional' ? 72 : 45);
  
  return (
    <div className={cn("px-3 py-2 rounded-xl border", config.bgClass)}>
      <div className="flex items-center gap-1.5">
        <span className={cn("text-lg font-bold", config.textClass)}>{displayScore}%</span>
        <span className={config.textClass}>{config.icon}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">Compliance</div>
    </div>
  );
}

function QualityScore({ score }: { score: number | null }) {
  if (!score) return <span className="text-muted-foreground">—</span>;
  
  const getColorClass = (s: number) => {
    if (s >= 9) return 'text-[hsl(var(--success))]';
    if (s >= 8) return 'text-primary';
    if (s >= 7) return 'text-[hsl(var(--warning))]';
    return 'text-[hsl(var(--danger))]';
  };
  
  const colorClass = getColorClass(score);
  
  return (
    <div className="px-3 py-2 rounded-xl bg-muted/50 border border-border">
      <div className="flex items-center gap-1.5">
        <Star className={cn("w-4 h-4 fill-current", colorClass)} />
        <span className={cn("text-lg font-bold", colorClass)}>{score.toFixed(1)}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">Quality</div>
    </div>
  );
}

export function DraftCardAward({ draft, onOpen, onDelete, onClick }: DraftCardAwardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isUntitled = draft.title === 'New Draft' || !draft.title;
  const hasDocument = !isUntitled;
  const currentStep = draft.current_step || 1;
  const progress = (currentStep / 8) * 100;
  const currentStepName = WIZARD_STEPS.find(s => s.id === currentStep)?.name || 'Unknown';
  const statusConfig = STATUS_CONFIG[draft.status] || STATUS_CONFIG.draft;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={cn(
        "relative p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer",
        hasDocument 
          ? "bg-card border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5" 
          : "bg-gradient-to-br from-[hsl(var(--warning))]/5 to-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/30 hover:border-[hsl(var(--warning))]/50 hover:shadow-xl hover:shadow-[hsl(var(--warning))]/10",
        isHovered && "-translate-y-1"
      )}
    >
      <div className="flex gap-5">
        {/* Document Thumbnail */}
        <div className={cn(
          "w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 transition-transform duration-300",
          isHovered && "scale-110",
          hasDocument 
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30" 
            : "bg-gradient-to-br from-[hsl(var(--warning))] to-[hsl(var(--warning))]/80 text-white shadow-lg shadow-[hsl(var(--warning))]/30"
        )}>
          {hasDocument ? (
            <>
              <FileText className="w-5 h-5" />
              <span className="text-xs font-bold mt-0.5 opacity-90">
                {draft.language === 'ar' ? '🇸🇦' : '🇬🇧'}
              </span>
            </>
          ) : (
            <AlertTriangle className="w-6 h-6" />
          )}
        </div>
        
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-base truncate">
                {hasDocument ? draft.title : 'Untitled Draft'}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                  {draft.draft_key}
                </span>
                {hasDocument && draft.document_pages && (
                  <>
                    <span>•</span>
                    <span>{draft.document_pages} pages</span>
                  </>
                )}
                {hasDocument && draft.document_size && (
                  <>
                    <span>•</span>
                    <span>{draft.document_size}</span>
                  </>
                )}
                <span>•</span>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatRelativeTime(draft.updated_at)}</span>
              </div>
            </div>
            
            {/* Status Badge */}
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide shrink-0 rounded-full px-3 py-1",
                statusConfig.className
              )}
            >
              {statusConfig.label}
            </Badge>
          </div>
          
          {/* Progress Bar — THICK AND VISIBLE */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-foreground">
                Step {currentStep} of 8: {currentStepName}
              </span>
              <span className="font-bold text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-[hsl(var(--success))] transition-all duration-500 relative"
                style={{ width: `${progress}%` }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" 
                  style={{ transform: 'translateX(-100%)', animation: 'shimmer 2s infinite' }}
                />
              </div>
            </div>
          </div>
          
          {/* Metrics Row — KEY DATA AT A GLANCE */}
          {hasDocument && currentStep >= 3 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              <ComplianceBadge score={draft.quality_score} status={draft.compliance_verdict} />
              <QualityScore score={draft.quality_score} />
              
              <div className="px-3 py-2 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-lg font-bold text-foreground">{draft.fr_count || '—'}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">FRs Generated</div>
              </div>
              
              <div className="px-3 py-2 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                  <span className={cn(
                    "text-sm font-bold truncate",
                    draft.linked_br ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {draft.linked_br || 'Not linked'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Business Request</div>
              </div>
            </div>
          )}
          
          {/* Empty State Message */}
          {!hasDocument && (
            <div className="mt-4 p-3 rounded-xl bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/20">
              <p className="text-sm text-[hsl(var(--warning))]">
                <strong>Action Required:</strong> Upload a requirements document to begin AI-assisted analysis.
              </p>
            </div>
          )}
        </div>
        
        {/* Actions Column */}
        <div className="flex flex-col items-end justify-between shrink-0">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onOpen(draft.id, e);
            }}
            className={cn(
              "gap-2 shadow-lg transition-all duration-200",
              hasDocument 
                ? "bg-primary hover:bg-primary/90 shadow-primary/30 hover:shadow-xl hover:shadow-primary/40" 
                : "bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/90 text-white shadow-[hsl(var(--warning))]/30 hover:shadow-xl hover:shadow-[hsl(var(--warning))]/40"
            )}
          >
            {hasDocument ? 'Continue' : 'Upload Document'}
            <ArrowUpRight className="w-4 h-4" />
          </Button>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className={cn(
                  "text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200",
                  isHovered ? "opacity-100" : "opacity-0"
                )}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete Draft</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
