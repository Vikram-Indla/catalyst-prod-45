import { X, CheckCircle, XCircle, AlertTriangle, Clock, ArrowRight, Plus, ExternalLink } from 'lucide-react';
import type { RequirementDetailViewModel, TestExecutionStatus } from '../types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const statusConfig: Record<TestExecutionStatus, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  passed: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'Passed' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failed' },
  blocked: { icon: AlertTriangle, color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'Blocked' },
  not_run: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Not Run' },
};

interface Props {
  requirement: RequirementDetailViewModel | null;
  isOpen: boolean;
  onClose: () => void;
  onLinkTest?: () => void;
}

export const RTMDetailPanel = ({ requirement, isOpen, onClose, onLinkTest }: Props) => {
  if (!requirement) return null;

  const coverageColor = requirement.coverageStatus === 'covered' ? 'text-emerald-500' : requirement.coverageStatus === 'partial' ? 'text-amber-500' : 'text-red-500';
  const coverageBg = requirement.coverageStatus === 'covered' ? 'bg-emerald-500' : requirement.coverageStatus === 'partial' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className={cn("w-[420px] bg-card border-l border-border flex flex-col flex-shrink-0 transition-transform duration-300", isOpen ? 'translate-x-0' : 'translate-x-full hidden')}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-primary">{requirement.key}</span>
          <h2 className="text-base font-semibold text-foreground mt-0.5">{requirement.title}</h2>
          <p className="text-xs text-muted-foreground mt-1 capitalize">{requirement.type} • {requirement.releaseName}</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Coverage Card */}
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Test Coverage</span>
            <span className={cn("text-2xl font-bold", coverageColor)}>{requirement.coveragePercentage}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-4">
            <div className={cn("h-full rounded-full transition-all duration-500", coverageBg)} style={{ width: `${requirement.coveragePercentage}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Passed', value: requirement.coverageStats.passed, color: 'text-emerald-500' },
              { label: 'Failed', value: requirement.coverageStats.failed, color: 'text-red-500' },
              { label: 'Blocked', value: requirement.coverageStats.blocked, color: 'text-violet-500' },
              { label: 'Not Run', value: requirement.coverageStats.notRun, color: 'text-muted-foreground' },
            ].map(stat => (
              <div key={stat.label}>
                <p className={cn("text-lg font-bold", stat.color)}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Priority</p>
            <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-semibold capitalize", requirement.priority === 'critical' ? 'bg-red-500/10 text-red-500' : requirement.priority === 'high' ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground')}>
              {requirement.priority}
            </span>
          </div>
          {requirement.parentKey && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Parent</p>
              <span className="text-xs font-semibold text-primary">{requirement.parentKey}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
          <p className="text-sm text-foreground leading-relaxed">{requirement.description}</p>
        </div>

        {/* Linked Tests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Linked Tests ({requirement.linkedTests.length})</h4>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onLinkTest}>
              <Plus className="w-3 h-3" /> Link Test
            </Button>
          </div>
          <div className="space-y-2">
            {requirement.linkedTests.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center">No tests linked to this requirement</p>
            ) : (
              requirement.linkedTests.map(test => {
                const status = statusConfig[test.lastExecutionStatus || 'not_run'];
                const StatusIcon = status.icon;
                return (
                  <div key={test.testCaseId} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-transparent hover:border-border hover:bg-card hover:translate-x-1 transition-all cursor-pointer group">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", status.bg)}>
                      <StatusIcon className={cn("w-4 h-4", status.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-primary">{test.testCaseKey}</span>
                      <p className="text-sm text-foreground truncate">{test.testCaseTitle}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
