/**
 * DependencyAnalyticsPanel - Program-level dependency analytics as a side panel
 * Displays alongside the wheel view instead of overlaying it
 */

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, AlertCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  classifyDirection,
  applyDrawerFilters,
  computeSummary,
  computeAttention,
  computeHealth,
  computeStatusDistribution,
  computeTopPartners,
  filterByDirection,
  getDaysOverdue,
  type DependencyDirection,
  type WorkItemMode,
  type HealthStatus,
} from '@/lib/dependencies/dependencyAnalytics';
import { type WorkItemMaps } from '@/lib/dependencies/resolveWorkItem';
import { DEPENDENCY_TYPE_LABELS } from '@/lib/dependencies/types';

interface DependencyAnalyticsPanelProps {
  selectedProgramId: string | null;
  selectedProgramName?: string;
  dependencies: any[];
  programs: Array<{ id: string; name: string }>;
  workItemMaps: WorkItemMaps;
  initialQuarter?: string;
  onDependencyClick?: (depId: string) => void;
  onClose: () => void;
}

// Generate quarter options
const generateQuarterOptions = () => {
  const currentYear = new Date().getFullYear();
  const quarters: string[] = [];
  for (let year = currentYear - 1; year <= currentYear + 2; year++) {
    for (let q = 1; q <= 4; q++) {
      quarters.push(`Q${q} ${year}`);
    }
  }
  return quarters;
};

const QUARTER_OPTIONS = generateQuarterOptions();

export function DependencyAnalyticsPanel({
  selectedProgramId,
  selectedProgramName,
  dependencies,
  programs,
  workItemMaps,
  initialQuarter,
  onDependencyClick,
  onClose,
}: DependencyAnalyticsPanelProps) {
  const [directionTab, setDirectionTab] = useState<DependencyDirection>('outgoing');
  const [quarter, setQuarter] = useState<string>(initialQuarter || 'all');
  const [workItemMode, setWorkItemMode] = useState<WorkItemMode>('epics');
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);

  // Filter dependencies for this program with drawer filters
  const filteredDeps = useMemo(() => {
    if (!selectedProgramId) return [];

    // First filter to dependencies relevant to this program
    const programDeps = dependencies.filter(dep => {
      const direction = classifyDirection(dep, selectedProgramId, workItemMaps);
      return direction !== null;
    });

    // Apply drawer filters
    return applyDrawerFilters(programDeps, { quarter, workItemMode }, workItemMaps);
  }, [dependencies, selectedProgramId, quarter, workItemMode, workItemMaps]);

  // Compute analytics
  const summary = useMemo(
    () => selectedProgramId ? computeSummary(filteredDeps, selectedProgramId, workItemMaps) : null,
    [filteredDeps, selectedProgramId, workItemMaps]
  );

  const attention = useMemo(
    () => selectedProgramId ? computeAttention(filteredDeps, selectedProgramId, workItemMaps) : null,
    [filteredDeps, selectedProgramId, workItemMaps]
  );

  const health = useMemo(
    () => attention ? computeHealth(attention) : 'healthy',
    [attention]
  );

  // Tab-specific data
  const tabDeps = useMemo(() => {
    if (!selectedProgramId || !directionTab) return [];
    return filterByDirection(filteredDeps, directionTab, selectedProgramId, workItemMaps, selectedPartner || undefined);
  }, [filteredDeps, directionTab, selectedProgramId, workItemMaps, selectedPartner]);

  const statusDistribution = useMemo(
    () => computeStatusDistribution(tabDeps),
    [tabDeps]
  );

  const topPartners = useMemo(
    () => selectedProgramId ? computeTopPartners(filteredDeps, directionTab, selectedProgramId, workItemMaps, programs) : [],
    [filteredDeps, directionTab, selectedProgramId, workItemMaps, programs]
  );

  const handlePartnerClick = (partnerId: string) => {
    setSelectedPartner(selectedPartner === partnerId ? null : partnerId);
  };

  if (!selectedProgramId) return null;

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-5 py-4 flex-shrink-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-primary mb-1">
              {selectedProgramName || 'Program'}
            </h2>
            <p className="text-sm text-muted-foreground">Dependency Analytics</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-3">
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="All Quarters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quarters</SelectItem>
              {QUARTER_OPTIONS.map(q => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['epics', 'features', 'all'] as WorkItemMode[]).map(mode => (
              <button
                key={mode}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  workItemMode === mode
                    ? "bg-brand-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
                onClick={() => setWorkItemMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-4 gap-2">
              <SummaryCard label="Total" sublabel="Dependencies" value={summary.total} variant="primary" />
              <SummaryCard label="Outgoing" sublabel="We need" value={summary.outgoing} variant="success" />
              <SummaryCard label="Incoming" sublabel="They need" value={summary.incoming} variant="warning" />
              <SummaryCard label="Internal" sublabel="Within" value={summary.internal} variant="muted" />
            </div>
          )}

          {/* Health Banner */}
          <HealthBanner health={health} attention={attention} />

          {/* Attention Required */}
          {attention && (attention.overdue > 0 || attention.highRisk > 0 || attention.awaitingResponse > 0) && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Attention Required
              </h3>
              <div className="flex flex-wrap gap-2">
                {attention.overdue > 0 && (
                  <AttentionChip icon={<span className="w-2 h-2 rounded-full bg-status-danger" />} label="Overdue" count={attention.overdue} />
                )}
                {attention.highRisk > 0 && (
                  <AttentionChip icon={<span className="w-2 h-2 rounded-full bg-status-warning" />} label="High Risk" count={attention.highRisk} />
                )}
                {attention.awaitingResponse > 0 && (
                  <AttentionChip icon={<span className="w-2 h-2 rounded-full bg-brand-gold" />} label="Awaiting Response" count={attention.awaitingResponse} />
                )}
              </div>
            </div>
          )}

          {/* Direction Tabs */}
          <Tabs value={directionTab || 'outgoing'} onValueChange={(v) => { setDirectionTab(v as DependencyDirection); setSelectedPartner(null); }}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="outgoing" className="gap-1.5">
                Outgoing <Badge variant="secondary" className="ml-1">{summary?.outgoing || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="incoming" className="gap-1.5">
                Incoming <Badge variant="secondary" className="ml-1">{summary?.incoming || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="internal" className="gap-1.5">
                Internal <Badge variant="secondary" className="ml-1">{summary?.internal || 0}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="outgoing" className="mt-4 space-y-4">
              <DirectionTabContent
                direction="outgoing"
                statusDistribution={statusDistribution}
                topPartners={topPartners}
                deps={tabDeps}
                selectedPartner={selectedPartner}
                onPartnerClick={handlePartnerClick}
                onDependencyClick={onDependencyClick}
                workItemMaps={workItemMaps}
                programId={selectedProgramId}
                programs={programs}
              />
            </TabsContent>
            <TabsContent value="incoming" className="mt-4 space-y-4">
              <DirectionTabContent
                direction="incoming"
                statusDistribution={statusDistribution}
                topPartners={topPartners}
                deps={tabDeps}
                selectedPartner={selectedPartner}
                onPartnerClick={handlePartnerClick}
                onDependencyClick={onDependencyClick}
                workItemMaps={workItemMaps}
                programId={selectedProgramId}
                programs={programs}
              />
            </TabsContent>
            <TabsContent value="internal" className="mt-4 space-y-4">
              <DirectionTabContent
                direction="internal"
                statusDistribution={statusDistribution}
                topPartners={[]}
                deps={tabDeps}
                selectedPartner={null}
                onPartnerClick={() => {}}
                onDependencyClick={onDependencyClick}
                workItemMaps={workItemMaps}
                programId={selectedProgramId}
                programs={programs}
              />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

// --- Sub-components ---

interface SummaryCardProps {
  label: string;
  sublabel: string;
  value: number;
  variant: 'primary' | 'success' | 'warning' | 'muted';
}

function SummaryCard({ label, sublabel, value, variant }: SummaryCardProps) {
  const variantClasses = {
    primary: 'bg-brand-primary text-primary-foreground',
    success: 'bg-brand-primary-hover text-primary-foreground',
    warning: 'bg-brand-gold text-primary-foreground',
    muted: 'bg-muted text-foreground',
  };

  return (
    <div className={cn("rounded-lg p-3 text-center", variantClasses[variant])}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-90">{label}</div>
      <div className="text-xs opacity-70">{sublabel}</div>
    </div>
  );
}

interface HealthBannerProps {
  health: HealthStatus;
  attention: ReturnType<typeof computeAttention> | null;
}

function HealthBanner({ health, attention }: HealthBannerProps) {
  const config = {
    healthy: {
      bg: 'bg-status-success-bg',
      text: 'text-status-success',
      icon: null,
      message: 'All dependencies are on track',
    },
    'at-risk': {
      bg: 'bg-status-warning-bg',
      text: 'text-status-warning',
      icon: <AlertTriangle className="h-5 w-5" />,
      message: 'Some dependencies need attention',
    },
    critical: {
      bg: 'bg-status-danger-bg',
      text: 'text-status-danger',
      icon: <AlertCircle className="h-5 w-5" />,
      message: `${attention?.overdue || 0} items need attention — Review overdue and high-risk dependencies`,
    },
  };

  const { bg, text, icon, message } = config[health];
  const totalAttention = (attention?.overdue || 0) + (attention?.highRisk || 0) + (attention?.awaitingResponse || 0);

  if (health === 'healthy' && totalAttention === 0) return null;

  return (
    <div className={cn("rounded-lg p-3 flex items-center gap-3", bg)}>
      {icon && <div className={text}>{icon}</div>}
      <p className={cn("text-sm font-medium", text)}>{message}</p>
    </div>
  );
}

interface AttentionChipProps {
  icon: React.ReactNode;
  label: string;
  count: number;
}

function AttentionChip({ icon, label, count }: AttentionChipProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background">
      {icon}
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm text-muted-foreground">{count}</span>
    </div>
  );
}

interface DirectionTabContentProps {
  direction: DependencyDirection;
  statusDistribution: ReturnType<typeof computeStatusDistribution>;
  topPartners: ReturnType<typeof computeTopPartners>;
  deps: any[];
  selectedPartner: string | null;
  onPartnerClick: (id: string) => void;
  onDependencyClick?: (depId: string) => void;
  workItemMaps: WorkItemMaps;
  programId: string;
  programs: Array<{ id: string; name: string }>;
}

function DirectionTabContent({
  direction,
  statusDistribution,
  topPartners,
  deps,
  selectedPartner,
  onPartnerClick,
  onDependencyClick,
  workItemMaps,
  programId,
  programs,
}: DirectionTabContentProps) {
  const partnerTitle = direction === 'outgoing' ? 'Top Blockers' : direction === 'incoming' ? 'Top Dependents' : null;
  const partnerSubtitle = direction === 'outgoing' ? 'Programs we depend on' : direction === 'incoming' ? 'Programs that need us' : null;

  return (
    <>
      {/* Status Distribution */}
      <div className="space-y-2">
        <h4 className="text-sm text-muted-foreground">Status Distribution</h4>
        <StatusDistributionBar distribution={statusDistribution} />
        <StatusLegend distribution={statusDistribution} />
      </div>

      {/* Top Partners */}
      {topPartners.length > 0 && partnerTitle && (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <h4 className="text-sm font-semibold">{partnerTitle}</h4>
            <span className="text-xs text-muted-foreground">{partnerSubtitle}</span>
          </div>
          <div className="space-y-1">
            {topPartners.map((partner, idx) => (
              <button
                key={partner.programId}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-colors text-left",
                  selectedPartner === partner.programId
                    ? "border-brand-primary bg-brand-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
                onClick={() => onPartnerClick(partner.programId)}
              >
                <span className="w-6 h-6 flex items-center justify-center rounded bg-muted text-xs font-semibold">
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm font-medium">{partner.programName}</span>
                <Badge variant="secondary">{partner.count}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dependency List */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">
          {selectedPartner
            ? `Dependencies with ${programs.find(p => p.id === selectedPartner)?.name || 'Partner'}`
            : `All ${direction ? direction.charAt(0).toUpperCase() + direction.slice(1) : ''} Dependencies`
          }
        </h4>
        <div className="space-y-2">
          {deps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No dependencies found</p>
          ) : (
            deps.map(dep => (
              <DependencyRow
                key={dep.id}
                dep={dep}
                workItemMaps={workItemMaps}
                programId={programId}
                programs={programs}
                onClick={() => onDependencyClick?.(dep.id)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

interface StatusDistributionBarProps {
  distribution: ReturnType<typeof computeStatusDistribution>;
}

function StatusDistributionBar({ distribution }: StatusDistributionBarProps) {
  const total = distribution.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return <div className="h-2 bg-muted rounded-full" />;

  return (
    <div className="h-2 rounded-full overflow-hidden flex">
      {distribution.map((d) => (
        <div
          key={d.status}
          className={cn("h-full", getStatusBarColor(d.status))}
          style={{ width: `${(d.count / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

function StatusLegend({ distribution }: StatusDistributionBarProps) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {distribution.map(d => (
        <div key={d.status} className="flex items-center gap-1.5 text-xs">
          <span className={cn("w-2.5 h-2.5 rounded-sm", getStatusBarColor(d.status))} />
          <span className="text-muted-foreground">{d.label} ({d.count})</span>
        </div>
      ))}
    </div>
  );
}

function getStatusBarColor(status: string): string {
  switch (status) {
    case 'delivered':
    case 'done':
      return 'bg-status-success';
    case 'in_progress':
      return 'bg-brand-primary-hover';
    case 'committed':
      return 'bg-brand-gold';
    case 'pending_commit':
    case 'negotiation':
      return 'bg-secondary-bronze';
    case 'draft':
    case 'open':
      return 'bg-muted-foreground/50';
    case 'blocked':
    case 'rejected':
      return 'bg-status-danger';
    case 'cancelled':
    case 'not_required':
    case 'no_work_done':
      return 'bg-muted-foreground/30';
    default:
      return 'bg-muted';
  }
}

interface DependencyRowProps {
  dep: any;
  workItemMaps: WorkItemMaps;
  programId: string;
  programs: Array<{ id: string; name: string }>;
  onClick: () => void;
}

function DependencyRow({ dep, workItemMaps, programId, programs, onClick }: DependencyRowProps) {
  const statusColors: Record<string, string> = {
    proposed: 'bg-brand-gold/10 text-brand-gold border-brand-gold/30',
    committed: 'bg-brand-primary/10 text-brand-primary border-brand-primary/30',
    delivered: 'bg-status-success/10 text-status-success border-status-success/30',
    rejected: 'bg-status-danger/10 text-status-danger border-status-danger/30',
  };

  const riskColors: Record<string, string> = {
    low: 'text-status-success',
    medium: 'text-brand-gold',
    high: 'text-status-danger',
  };

  const daysOverdue = getDaysOverdue(dep);

  return (
    <button
      className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium line-clamp-2">{dep.description || 'Untitled dependency'}</span>
        <Badge className={cn("shrink-0 text-xs", statusColors[dep.status] || 'bg-muted')}>
          {dep.status}
        </Badge>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{dep.quarter}</span>
        {dep.type && (
          <span>{DEPENDENCY_TYPE_LABELS[dep.type as keyof typeof DEPENDENCY_TYPE_LABELS] || dep.type}</span>
        )}
        {dep.risk_level && (
          <span className={riskColors[dep.risk_level]}>{dep.risk_level} risk</span>
        )}
        {daysOverdue > 0 && (
          <span className="text-status-danger font-medium">{daysOverdue}d overdue</span>
        )}
      </div>
    </button>
  );
}
