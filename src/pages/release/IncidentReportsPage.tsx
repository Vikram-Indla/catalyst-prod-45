/**
 * IncidentReportsPage — Enterprise Incident Reports
 * 
 * Route: /release/incidents/reports
 * 
 * Layout:
 * - Left panel: report navigation
 * - Right panel: active report with insight strip + table
 * 
 * Uses exact same table styling as /release/incidents
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, AlertTriangle, Users, GitBranch, BarChart3,
  Download, ChevronRight, AlertCircle, CheckCircle, XCircle, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIncidents } from '@/hooks/useIncidents';
import { useCommitteeQueue } from '@/hooks/useCommitteeQueue';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { ExecutiveInsightStrip } from '@/components/reports/ExecutiveInsightStrip';
import { ReportTable, type ReportColumn } from '@/components/reports/ReportTable';
import { 
  StatusBadge, 
  SeverityBadge, 
  PriorityBadge,
  SupportLevelBadge,
  getAgingTime 
} from '@/components/incidents/badges/IncidentBadges';
import type { Incident } from '@/types/incident';
import type { CommitteeQueueItem } from '@/hooks/useCommitteeQueue';

type ReportType = 'sla_breach' | 'aging' | 'committee' | 'conversion' | 'distribution';

interface ReportConfig {
  id: ReportType;
  title: string;
  icon: React.ElementType;
}

const REPORT_CONFIGS: ReportConfig[] = [
  { id: 'sla_breach', title: 'SLA Breach Report', icon: Clock },
  { id: 'aging', title: 'Incident Aging Report', icon: AlertTriangle },
  { id: 'committee', title: 'Committee Queue Report', icon: Users },
  { id: 'conversion', title: 'Conversion Funnel Report', icon: GitBranch },
  { id: 'distribution', title: 'Severity vs Priority', icon: BarChart3 },
];

// =============================================
// SLA BREACH REPORT
// =============================================
function SLABreachReport({ incidents, onRowClick }: { incidents: Incident[]; onRowClick: (id: string) => void }) {
  const breachedIncidents = useMemo(() => 
    incidents.filter(i => i.sla?.response_breached || i.sla?.resolution_breached),
    [incidents]
  );

  const atRiskIncidents = useMemo(() =>
    incidents.filter(i => !i.sla?.response_breached && !i.sla?.resolution_breached && i.sla),
    [incidents]
  );

  const sev1Breached = breachedIncidents.filter(i => i.severity === 'SEV1').length;
  const worstBreach = breachedIncidents.length > 0 
    ? Math.max(...breachedIncidents.map(i => {
        const days = Math.floor((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return days;
      }))
    : 0;

  const insights = [
    { label: 'Breached', value: breachedIncidents.length, highlight: breachedIncidents.length > 0 ? 'danger' as const : undefined, icon: <XCircle className="h-4 w-4" /> },
    { label: 'At Risk', value: atRiskIncidents.length, highlight: atRiskIncidents.length > 0 ? 'warning' as const : undefined, icon: <AlertCircle className="h-4 w-4" /> },
    { label: 'SEV1 Breached', value: sev1Breached, highlight: sev1Breached > 0 ? 'danger' as const : undefined, icon: <AlertTriangle className="h-4 w-4" /> },
    { label: 'Worst Breach', value: `${worstBreach}d`, icon: <Timer className="h-4 w-4" /> },
  ];

  const columns: ReportColumn<Incident>[] = [
    { key: 'key', label: 'Key', minWidth: 100, render: (i) => <span className="font-mono text-primary font-medium">{i.incident_key}</span> },
    { key: 'summary', label: 'Summary', minWidth: 280, canGrow: true, render: (i) => <span className="truncate block">{i.title}</span> },
    { key: 'severity', label: 'Sev', minWidth: 70, centered: true, render: (i) => <SeverityBadge severity={i.severity} /> },
    { key: 'status', label: 'Status', minWidth: 100, centered: true, render: (i) => <StatusBadge status={i.status} /> },
    { key: 'assignee', label: 'Assignee', minWidth: 140, render: (i) => <span className="truncate">{i.assignee?.full_name || '—'}</span> },
    { key: 'age', label: 'Age', minWidth: 60, centered: true, render: (i) => <span className="font-mono text-xs">{getAgingTime(i.created_at)}</span> },
    { key: 'slaState', label: 'SLA State', minWidth: 90, centered: true, render: (i) => (
      <Badge variant="outline" className={cn('text-[10px]', 
        i.sla?.response_breached || i.sla?.resolution_breached 
          ? 'bg-destructive/10 text-destructive border-destructive/20' 
          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      )}>
        {i.sla?.response_breached || i.sla?.resolution_breached ? 'BREACHED' : 'ON TRACK'}
      </Badge>
    )},
    { key: 'breachAmount', label: 'Breach', minWidth: 90, centered: true, render: (i) => {
      const days = Math.floor((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return <span className="font-mono text-destructive font-medium">{days}d</span>;
    }},
    { key: 'release', label: 'Release', minWidth: 100, render: (i) => <span className="truncate text-muted-foreground">{i.release_version?.version || '—'}</span> },
  ];

  return (
    <>
      <ExecutiveInsightStrip title="SLA BREACH SUMMARY" insights={insights} />
      <ReportTable 
        data={breachedIncidents} 
        columns={columns} 
        getRowId={(i) => i.id}
        onRowClick={(i) => onRowClick(i.id)}
        emptyMessage="No SLA breaches found"
      />
    </>
  );
}

// =============================================
// INCIDENT AGING REPORT
// =============================================
function AgingReport({ incidents, onRowClick }: { incidents: Incident[]; onRowClick: (id: string) => void }) {
  const openIncidents = useMemo(() => 
    incidents.filter(i => ['open', 'triage', 'to_committee', 'in_progress'].includes(i.status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [incidents]
  );

  const over7Days = openIncidents.filter(i => {
    const days = Math.floor((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return days > 7;
  }).length;

  const sev1Over3Days = openIncidents.filter(i => {
    const days = Math.floor((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return i.severity === 'SEV1' && days > 3;
  }).length;

  const medianAge = openIncidents.length > 0 
    ? Math.floor(openIncidents.map(i => Math.floor((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24)))
        .sort((a, b) => a - b)[Math.floor(openIncidents.length / 2)])
    : 0;

  const insights = [
    { label: 'Open', value: openIncidents.length, icon: <AlertCircle className="h-4 w-4" /> },
    { label: '>7 Days', value: over7Days, highlight: over7Days > 0 ? 'warning' as const : undefined, icon: <Clock className="h-4 w-4" /> },
    { label: 'SEV1 >3 Days', value: sev1Over3Days, highlight: sev1Over3Days > 0 ? 'danger' as const : undefined, icon: <AlertTriangle className="h-4 w-4" /> },
    { label: 'Median Age', value: `${medianAge}d`, icon: <Timer className="h-4 w-4" /> },
  ];

  const columns: ReportColumn<Incident>[] = [
    { key: 'key', label: 'Key', minWidth: 100, render: (i) => <span className="font-mono text-primary font-medium">{i.incident_key}</span> },
    { key: 'summary', label: 'Summary', minWidth: 280, canGrow: true, render: (i) => <span className="truncate block">{i.title}</span> },
    { key: 'severity', label: 'Sev', minWidth: 70, centered: true, render: (i) => <SeverityBadge severity={i.severity} /> },
    { key: 'status', label: 'Status', minWidth: 100, centered: true, render: (i) => <StatusBadge status={i.status} /> },
    { key: 'assignee', label: 'Assignee', minWidth: 140, render: (i) => <span className="truncate">{i.assignee?.full_name || '—'}</span> },
    { key: 'age', label: 'Age', minWidth: 60, centered: true, render: (i) => {
      const days = Math.floor((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return (
        <span className={cn('font-mono text-xs font-medium', 
          days >= 7 ? 'text-destructive' : days >= 3 ? 'text-amber-600' : 'text-muted-foreground'
        )}>
          {getAgingTime(i.created_at)}
        </span>
      );
    }},
    { key: 'ageBucket', label: 'Bucket', minWidth: 80, centered: true, render: (i) => {
      const days = Math.floor((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24));
      let bucket = '<24h';
      if (days >= 7) bucket = '>7d';
      else if (days >= 3) bucket = '3-7d';
      else if (days >= 1) bucket = '1-3d';
      return (
        <Badge variant="outline" className={cn('text-[10px]',
          days >= 7 ? 'bg-destructive/10 text-destructive border-destructive/20' :
          days >= 3 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
          'bg-muted text-muted-foreground'
        )}>
          {bucket}
        </Badge>
      );
    }},
    { key: 'slaState', label: 'SLA', minWidth: 70, centered: true, render: (i) => (
      <Badge variant="outline" className={cn('text-[10px]', 
        i.sla?.response_breached || i.sla?.resolution_breached 
          ? 'bg-destructive/10 text-destructive border-destructive/20' 
          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      )}>
        {i.sla?.response_breached || i.sla?.resolution_breached ? 'BREACH' : 'OK'}
      </Badge>
    )},
    { key: 'release', label: 'Release', minWidth: 100, render: (i) => <span className="truncate text-muted-foreground">{i.release_version?.version || '—'}</span> },
  ];

  return (
    <>
      <ExecutiveInsightStrip title="INCIDENT AGING SUMMARY" insights={insights} />
      <ReportTable 
        data={openIncidents} 
        columns={columns} 
        getRowId={(i) => i.id}
        onRowClick={(i) => onRowClick(i.id)}
        emptyMessage="No open incidents"
      />
    </>
  );
}

// =============================================
// COMMITTEE QUEUE REPORT
// =============================================
function CommitteeReport({ onRowClick }: { onRowClick: (id: string) => void }) {
  const [showHistory, setShowHistory] = useState(false);
  const { data: queueItems = [], isLoading } = useCommitteeQueue({ includeClosedDecisions: showHistory });

  const pendingItems = useMemo(() => queueItems.filter(i => i.committeeStatus === 'pending'), [queueItems]);
  const historyItems = useMemo(() => queueItems.filter(i => i.committeeStatus !== 'pending'), [queueItems]);
  
  const displayItems = showHistory ? historyItems : pendingItems;
  
  const sev1Pending = pendingItems.filter(i => i.incident.severity === 'SEV1').length;
  const over3Days = pendingItems.filter(i => i.agingDays > 3).length;
  const oldest = pendingItems.length > 0 ? Math.max(...pendingItems.map(i => i.agingDays)) : 0;

  const approvedCount = historyItems.filter(i => i.committeeStatus === 'approved').length;
  const vetoedCount = historyItems.filter(i => i.committeeStatus === 'vetoed').length;

  const queueInsights = [
    { label: 'Pending', value: pendingItems.length, icon: <Clock className="h-4 w-4" /> },
    { label: 'SEV1 Pending', value: sev1Pending, highlight: sev1Pending > 0 ? 'danger' as const : undefined, icon: <AlertTriangle className="h-4 w-4" /> },
    { label: '>3 Days Pending', value: over3Days, highlight: over3Days > 0 ? 'warning' as const : undefined, icon: <Timer className="h-4 w-4" /> },
    { label: 'Oldest Pending', value: `${oldest}d`, icon: <AlertCircle className="h-4 w-4" /> },
  ];

  const historyInsights = [
    { label: 'Approved', value: approvedCount, highlight: 'success' as const, icon: <CheckCircle className="h-4 w-4" /> },
    { label: 'Vetoed', value: vetoedCount, highlight: vetoedCount > 0 ? 'danger' as const : undefined, icon: <XCircle className="h-4 w-4" /> },
    { label: 'Veto Rate', value: `${historyItems.length > 0 ? ((vetoedCount / historyItems.length) * 100).toFixed(1) : 0}%`, icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'Total Decisions', value: historyItems.length, icon: <Users className="h-4 w-4" /> },
  ];

  const pendingColumns: ReportColumn<CommitteeQueueItem>[] = [
    { key: 'key', label: 'Key', minWidth: 100, render: (i) => <span className="font-mono text-primary font-medium">{i.incident.incident_key}</span> },
    { key: 'summary', label: 'Summary', minWidth: 260, canGrow: true, render: (i) => <span className="truncate block">{i.incident.title}</span> },
    { key: 'severity', label: 'Sev', minWidth: 70, centered: true, render: (i) => <SeverityBadge severity={i.incident.severity} /> },
    { key: 'major', label: 'Major', minWidth: 55, centered: true, render: (i) => i.incident.is_major_incident ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : <span className="text-muted-foreground">—</span> },
    { key: 'progress', label: 'Progress', minWidth: 80, centered: true, render: (i) => (
      <span className="font-mono text-xs font-medium">{i.approvalsCompletedCount}/{i.approvalsRequiredCount}</span>
    )},
    { key: 'approvers', label: 'Approvers', minWidth: 100, centered: true, render: (i) => (
      <div className="flex -space-x-1 justify-center">
        {i.approvers.slice(0, 3).map((a, idx) => (
          <div key={idx} className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium border border-background",
            a.decision === 'approved' ? 'bg-emerald-500/10 text-emerald-600' :
            a.decision === 'vetoed' ? 'bg-destructive/10 text-destructive' :
            'bg-muted text-muted-foreground'
          )}>
            {a.userInitials || a.userName.charAt(0)}
          </div>
        ))}
        {i.approvers.length > 3 && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium border border-background bg-muted text-muted-foreground">
            +{i.approvers.length - 3}
          </div>
        )}
      </div>
    )},
    { key: 'lastAction', label: 'Last Action', minWidth: 120, render: (i) => (
      <span className="truncate text-muted-foreground text-[11px]">
        {i.lastAction?.type === 'vetoed' && `Veto by ${i.lastAction.by}`}
        {i.lastAction?.type === 'approved' && i.lastAction.by}
        {i.lastAction?.type === 'sent_to_committee' && 'Sent'}
        {!i.lastAction && '—'}
      </span>
    )},
    { key: 'age', label: 'Age', minWidth: 55, centered: true, render: (i) => (
      <span className={cn('font-mono text-xs font-medium', i.agingDays > 3 ? 'text-amber-600' : 'text-muted-foreground')}>
        {i.agingDays}d
      </span>
    )},
  ];

  const historyColumns: ReportColumn<CommitteeQueueItem>[] = [
    { key: 'key', label: 'Key', minWidth: 100, render: (i) => <span className="font-mono text-primary font-medium">{i.incident.incident_key}</span> },
    { key: 'summary', label: 'Summary', minWidth: 280, canGrow: true, render: (i) => <span className="truncate block">{i.incident.title}</span> },
    { key: 'severity', label: 'Sev', minWidth: 70, centered: true, render: (i) => <SeverityBadge severity={i.incident.severity} /> },
    { key: 'outcome', label: 'Outcome', minWidth: 90, centered: true, render: (i) => (
      <Badge variant="outline" className={cn('text-[10px]',
        i.committeeStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
        'bg-destructive/10 text-destructive border-destructive/20'
      )}>
        {i.committeeStatus === 'approved' ? 'APPROVED' : 'VETOED'}
      </Badge>
    )},
    { key: 'decidedBy', label: 'Decided By', minWidth: 130, render: (i) => <span className="truncate">{i.lastAction?.by || '—'}</span> },
    { key: 'decisionTime', label: 'Time', minWidth: 70, centered: true, render: (i) => (
      <span className="font-mono text-xs text-muted-foreground">{i.agingDays}d</span>
    )},
    { key: 'decidedAt', label: 'Decided At', minWidth: 110, render: (i) => (
      <span className="text-muted-foreground text-xs">
        {i.committeeDecisionAt ? new Date(i.committeeDecisionAt).toLocaleDateString() : '—'}
      </span>
    )},
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <ExecutiveInsightStrip 
          title={showHistory ? "COMMITTEE DECISION SUMMARY" : "COMMITTEE QUEUE UPDATE"} 
          insights={showHistory ? historyInsights : queueInsights}
          className="flex-1 mb-0"
        />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={showHistory ? "ghost" : "default"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowHistory(false)}
        >
          Pending ({pendingItems.length})
        </Button>
        <Button
          variant={showHistory ? "default" : "ghost"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowHistory(true)}
        >
          Decision History ({historyItems.length})
        </Button>
      </div>
      <ReportTable 
        data={displayItems} 
        columns={showHistory ? historyColumns : pendingColumns} 
        isLoading={isLoading}
        getRowId={(i) => i.incident.id}
        onRowClick={(i) => onRowClick(i.incident.id)}
        emptyMessage={showHistory ? "No committee decisions in history" : "No pending committee decisions"}
      />
    </>
  );
}

// =============================================
// CONVERSION FUNNEL REPORT
// =============================================
function ConversionReport({ incidents, onRowClick }: { incidents: Incident[]; onRowClick: (id: string) => void }) {
  const convertedIncidents = useMemo(() => incidents.filter(i => i.converted_to_type != null), [incidents]);
  const notConverted = useMemo(() => incidents.filter(i => !i.converted_to_type && i.status !== 'open'), [incidents]);

  const avgConversionTime = convertedIncidents.length > 0
    ? Math.round(convertedIncidents.reduce((sum, i) => {
        if (i.converted_at && i.created_at) {
          return sum + (new Date(i.converted_at).getTime() - new Date(i.created_at).getTime()) / (1000 * 60 * 60);
        }
        return sum;
      }, 0) / convertedIncidents.length)
    : 0;

  const insights = [
    { label: 'Converted', value: convertedIncidents.length, highlight: 'success' as const, icon: <CheckCircle className="h-4 w-4" /> },
    { label: 'Not Converted', value: notConverted.length, icon: <XCircle className="h-4 w-4" /> },
    { label: 'Avg Time', value: `${avgConversionTime}h`, icon: <Timer className="h-4 w-4" /> },
  ];

  const columns: ReportColumn<Incident>[] = [
    { key: 'key', label: 'Key', minWidth: 100, render: (i) => <span className="font-mono text-primary font-medium">{i.incident_key}</span> },
    { key: 'summary', label: 'Summary', minWidth: 260, canGrow: true, render: (i) => <span className="truncate block">{i.title}</span> },
    { key: 'severity', label: 'Sev', minWidth: 70, centered: true, render: (i) => <SeverityBadge severity={i.severity} /> },
    { key: 'status', label: 'Status', minWidth: 100, centered: true, render: (i) => <StatusBadge status={i.status} /> },
    { key: 'converted', label: 'Converted?', minWidth: 85, centered: true, render: (i) => (
      i.converted_to_type 
        ? <CheckCircle className="h-4 w-4 text-emerald-500" />
        : <span className="text-muted-foreground">—</span>
    )},
    { key: 'targetType', label: 'Target', minWidth: 90, centered: true, render: (i) => (
      i.converted_to_type ? (
        <Badge variant="outline" className={cn('text-[10px]',
          i.converted_to_type === 'epic' ? 'bg-violet-500/10 text-violet-600 border-violet-500/20' :
          i.converted_to_type === 'feature' ? 'bg-sky-500/10 text-sky-600 border-sky-500/20' :
          'bg-teal-500/10 text-teal-600 border-teal-500/20'
        )}>
          {i.converted_to_type.toUpperCase()}
        </Badge>
      ) : <span className="text-muted-foreground">—</span>
    )},
    { key: 'linkedItem', label: 'Linked', minWidth: 100, render: (i) => <span className="font-mono text-muted-foreground truncate">{i.converted_to_id || '—'}</span> },
    { key: 'convertedAt', label: 'Converted At', minWidth: 100, render: (i) => (
      <span className="text-muted-foreground text-xs">{i.converted_at ? new Date(i.converted_at).toLocaleDateString() : '—'}</span>
    )},
    { key: 'timeToConvert', label: 'Time', minWidth: 70, centered: true, render: (i) => {
      if (!i.converted_at || !i.created_at) return <span className="text-muted-foreground">—</span>;
      const hours = Math.round((new Date(i.converted_at).getTime() - new Date(i.created_at).getTime()) / (1000 * 60 * 60));
      return <span className="font-mono text-xs">{hours}h</span>;
    }},
  ];

  return (
    <>
      <ExecutiveInsightStrip title="CONVERSION FUNNEL SUMMARY" insights={insights} />
      <ReportTable 
        data={convertedIncidents} 
        columns={columns} 
        getRowId={(i) => i.id}
        onRowClick={(i) => onRowClick(i.id)}
        emptyMessage="No converted incidents"
      />
    </>
  );
}

// =============================================
// SEVERITY VS PRIORITY REPORT
// =============================================
function DistributionReport({ incidents, onRowClick }: { incidents: Incident[]; onRowClick: (id: string) => void }) {
  const sev1LowPriority = incidents.filter(i => i.severity === 'SEV1' && (i.priority === 'P3' || i.priority === 'P4')).length;
  const triageMismatches = incidents.filter(i => {
    const sevNum = parseInt(i.severity?.replace('SEV', '') || '4');
    const priNum = parseInt(i.priority?.replace('P', '') || '4');
    return Math.abs(sevNum - priNum) >= 2;
  }).length;

  const insights = [
    { label: 'Total Incidents', value: incidents.length, icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'SEV1 Low Priority', value: sev1LowPriority, highlight: sev1LowPriority > 0 ? 'danger' as const : undefined, icon: <AlertTriangle className="h-4 w-4" /> },
    { label: 'Triage Mismatches', value: triageMismatches, highlight: triageMismatches > 0 ? 'warning' as const : undefined, icon: <AlertCircle className="h-4 w-4" /> },
  ];

  const columns: ReportColumn<Incident>[] = [
    { key: 'key', label: 'Key', minWidth: 100, render: (i) => <span className="font-mono text-primary font-medium">{i.incident_key}</span> },
    { key: 'summary', label: 'Summary', minWidth: 260, canGrow: true, render: (i) => <span className="truncate block">{i.title}</span> },
    { key: 'severity', label: 'Sev', minWidth: 70, centered: true, render: (i) => <SeverityBadge severity={i.severity} /> },
    { key: 'priority', label: 'Priority', minWidth: 80, centered: true, render: (i) => <PriorityBadge priority={i.priority} /> },
    { key: 'status', label: 'Status', minWidth: 100, centered: true, render: (i) => <StatusBadge status={i.status} /> },
    { key: 'assignee', label: 'Assignee', minWidth: 140, render: (i) => <span className="truncate">{i.assignee?.full_name || '—'}</span> },
    { key: 'age', label: 'Age', minWidth: 60, centered: true, render: (i) => <span className="font-mono text-xs">{getAgingTime(i.created_at)}</span> },
    { key: 'slaState', label: 'SLA', minWidth: 70, centered: true, render: (i) => (
      <Badge variant="outline" className={cn('text-[10px]', 
        i.sla?.response_breached || i.sla?.resolution_breached 
          ? 'bg-destructive/10 text-destructive border-destructive/20' 
          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      )}>
        {i.sla?.response_breached || i.sla?.resolution_breached ? 'BREACH' : 'OK'}
      </Badge>
    )},
    { key: 'triageFlag', label: 'Triage', minWidth: 80, centered: true, render: (i) => {
      const sevNum = parseInt(i.severity?.replace('SEV', '') || '4');
      const priNum = parseInt(i.priority?.replace('P', '') || '4');
      const mismatch = Math.abs(sevNum - priNum) >= 2;
      return mismatch ? (
        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
          REVIEW
        </Badge>
      ) : <span className="text-muted-foreground">—</span>;
    }},
  ];

  return (
    <>
      <ExecutiveInsightStrip title="SEVERITY VS PRIORITY ANALYSIS" insights={insights} />
      <ReportTable 
        data={incidents} 
        columns={columns} 
        getRowId={(i) => i.id}
        onRowClick={(i) => onRowClick(i.id)}
        emptyMessage="No incidents found"
      />
    </>
  );
}

// =============================================
// MAIN REPORTS PAGE
// =============================================
export default function IncidentReportsPage() {
  const navigate = useNavigate();
  const [activeReport, setActiveReport] = useState<ReportType>('sla_breach');
  
  const { data: incidents = [], isLoading, error } = useIncidents();

  const handleRowClick = (id: string) => {
    navigate(`/release/incidents/${id}`);
  };

  const handleExport = () => {
    const csvContent = [
      ['Key', 'Summary', 'Severity', 'Priority', 'Status', 'Support Level', 'Created At'].join(','),
      ...incidents.map(i => [
        i.incident_key,
        `"${i.title.replace(/"/g, '""')}"`,
        i.severity,
        i.priority || '',
        i.status,
        i.support_level || '',
        i.created_at
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-report-${activeReport}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeConfig = REPORT_CONFIGS.find(r => r.id === activeReport)!;

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm font-medium text-destructive">Failed to load reports</p>
          <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background min-h-0">
      {/* Header with breadcrumb */}
      <GlobalPageHeader
        sectionLabel="RELEASE"
        pageTitle={`Incident Reports / ${activeConfig.title}`}
        showDivider={false}
        rightActions={
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        }
      />

      {/* Content - flex row with proper overflow handling */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Report Navigation */}
        <div className="w-56 border-r border-border bg-muted/30 flex-shrink-0 overflow-y-auto">
          <div className="p-3">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reports</div>
            <div className="space-y-0.5">
              {REPORT_CONFIGS.map(report => {
                const Icon = report.icon;
                const isActive = activeReport === report.id;
                return (
                  <button
                    key={report.id}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors text-sm",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted text-foreground"
                    )}
                    onClick={() => setActiveReport(report.id)}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate font-medium">{report.title}</span>
                    {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel - Report Content - single scroll surface */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {activeReport === 'sla_breach' && <SLABreachReport incidents={incidents} onRowClick={handleRowClick} />}
                {activeReport === 'aging' && <AgingReport incidents={incidents} onRowClick={handleRowClick} />}
                {activeReport === 'committee' && <CommitteeReport onRowClick={handleRowClick} />}
                {activeReport === 'conversion' && <ConversionReport incidents={incidents} onRowClick={handleRowClick} />}
                {activeReport === 'distribution' && <DistributionReport incidents={incidents} onRowClick={handleRowClick} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
