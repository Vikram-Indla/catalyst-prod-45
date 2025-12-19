import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Clock, AlertTriangle, GitBranch, BarChart3, 
  Download, ArrowLeft, Loader2, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIncidents } from '@/hooks/useIncidents';
import type { Incident } from '@/types/incident';
import { 
  StatusBadge, 
  SeverityBadge, 
  PriorityBadge,
  SupportLevelBadge,
  getAgingTime 
} from '@/components/incidents/badges/IncidentBadges';

// ============================================
// REPORTS PAGE - TABLE-BASED, JIRA-STYLE
// ALL DATA FROM useIncidents HOOK ONLY
// ============================================

type ReportType = 'sla_breach' | 'aging' | 'committee' | 'conversion' | 'distribution';

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ElementType;
}

const REPORT_CONFIGS: ReportConfig[] = [
  { id: 'sla_breach', title: 'SLA Breach Report', description: 'Incidents with breached response or resolution SLA', icon: Clock },
  { id: 'aging', title: 'Incident Aging Report', description: 'Open incidents by age bucket', icon: AlertTriangle },
  { id: 'committee', title: 'Committee Queue Report', description: 'L3 incidents pending or processed by committee', icon: BarChart3 },
  { id: 'conversion', title: 'Conversion Funnel Report', description: 'Incidents converted to work items', icon: GitBranch },
  { id: 'distribution', title: 'Severity vs Priority', description: 'Distribution of incidents by severity and priority', icon: BarChart3 },
];

function ReportTable({ 
  incidents, 
  columns,
  onRowClick 
}: { 
  incidents: Incident[];
  columns: { key: string; label: string; render: (inc: Incident) => React.ReactNode }[];
  onRowClick: (id: string) => void;
}) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No incidents match this report criteria
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted/80 z-10">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc) => (
            <tr 
              key={inc.id} 
              className="hover:bg-muted/30 cursor-pointer border-b border-border/50"
              onClick={() => onRowClick(inc.id)}
            >
              {columns.map(col => (
                <td key={col.key} className="px-3 py-2">
                  {col.render(inc)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SLABreachReport({ incidents, onRowClick }: { incidents: Incident[]; onRowClick: (id: string) => void }) {
  // Filter incidents with SLA breaches - STRICTLY from sla_records backend fields
  const breachedIncidents = useMemo(() => 
    incidents.filter(i => i.sla?.response_breached || i.sla?.resolution_breached),
    [incidents]
  );

  const columns = [
    { key: 'key', label: 'Key', render: (i: Incident) => <span className="font-mono text-brand-primary font-medium">{i.incident_key}</span> },
    { key: 'summary', label: 'Summary', render: (i: Incident) => <span className="truncate max-w-[200px] block">{i.title}</span> },
    { key: 'severity', label: 'Severity', render: (i: Incident) => <SeverityBadge severity={i.severity} /> },
    { key: 'response', label: 'Response SLA', render: (i: Incident) => (
      <Badge variant="outline" className={cn('text-[10px]', i.sla?.response_breached ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200')}>
        {i.sla?.response_breached ? 'BREACHED' : 'MET'}
      </Badge>
    )},
    { key: 'resolution', label: 'Resolution SLA', render: (i: Incident) => (
      <Badge variant="outline" className={cn('text-[10px]', i.sla?.resolution_breached ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200')}>
        {i.sla?.resolution_breached ? 'BREACHED' : 'MET'}
      </Badge>
    )},
    { key: 'status', label: 'Status', render: (i: Incident) => <StatusBadge status={i.status} /> },
    { key: 'age', label: 'Age', render: (i: Incident) => <span className="text-muted-foreground font-mono">{getAgingTime(i.created_at)}</span> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">{breachedIncidents.length} incidents with SLA breaches</div>
      </div>
      <ReportTable incidents={breachedIncidents} columns={columns} onRowClick={onRowClick} />
    </div>
  );
}

function AgingReport({ incidents, onRowClick }: { incidents: Incident[]; onRowClick: (id: string) => void }) {
  // Filter open incidents - Aging = now - incident.created_at
  const openIncidents = useMemo(() => 
    incidents.filter(i => ['open', 'triage', 'to_committee', 'in_progress'].includes(i.status)),
    [incidents]
  );

  const sortedByAge = useMemo(() => 
    [...openIncidents].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [openIncidents]
  );

  const columns = [
    { key: 'key', label: 'Key', render: (i: Incident) => <span className="font-mono text-brand-primary font-medium">{i.incident_key}</span> },
    { key: 'summary', label: 'Summary', render: (i: Incident) => <span className="truncate max-w-[200px] block">{i.title}</span> },
    { key: 'severity', label: 'Severity', render: (i: Incident) => <SeverityBadge severity={i.severity} /> },
    { key: 'priority', label: 'Priority', render: (i: Incident) => <PriorityBadge priority={i.priority} /> },
    { key: 'level', label: 'Level', render: (i: Incident) => <SupportLevelBadge level={i.support_level} /> },
    { key: 'status', label: 'Status', render: (i: Incident) => <StatusBadge status={i.status} /> },
    { key: 'age', label: 'Age', render: (i: Incident) => {
      const days = Math.floor((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return (
        <span className={cn('font-mono', days >= 7 ? 'text-red-600 font-semibold' : days >= 3 ? 'text-orange-600' : 'text-muted-foreground')}>
          {getAgingTime(i.created_at)}
        </span>
      );
    }},
    { key: 'assignee', label: 'Assignee', render: (i: Incident) => <span className="text-muted-foreground">{i.assignee?.full_name || '-'}</span> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">{sortedByAge.length} open incidents (oldest first)</div>
      </div>
      <ReportTable incidents={sortedByAge} columns={columns} onRowClick={onRowClick} />
    </div>
  );
}

function CommitteeReport({ incidents, onRowClick }: { incidents: Incident[]; onRowClick: (id: string) => void }) {
  // L3 incidents only - committee workflow
  const l3Incidents = useMemo(() => 
    incidents.filter(i => i.support_level === 'L3'),
    [incidents]
  );

  const columns = [
    { key: 'key', label: 'Key', render: (i: Incident) => <span className="font-mono text-brand-primary font-medium">{i.incident_key}</span> },
    { key: 'summary', label: 'Summary', render: (i: Incident) => <span className="truncate max-w-[180px] block">{i.title}</span> },
    { key: 'severity', label: 'Severity', render: (i: Incident) => <SeverityBadge severity={i.severity} /> },
    { key: 'status', label: 'Status', render: (i: Incident) => <StatusBadge status={i.status} /> },
    { key: 'committee', label: 'Committee Status', render: (i: Incident) => (
      <Badge variant="outline" className={cn('text-[10px]',
        i.committee?.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
        i.committee?.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
        'bg-yellow-100 text-yellow-700 border-yellow-200'
      )}>
        {i.committee?.status || 'Not Submitted'}
      </Badge>
    )},
    { key: 'age', label: 'Age', render: (i: Incident) => <span className="text-muted-foreground font-mono">{getAgingTime(i.created_at)}</span> },
    { key: 'assignee', label: 'Assignee', render: (i: Incident) => <span className="text-muted-foreground">{i.assignee?.full_name || '-'}</span> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">{l3Incidents.length} L3 incidents (committee workflow)</div>
      </div>
      <ReportTable incidents={l3Incidents} columns={columns} onRowClick={onRowClick} />
    </div>
  );
}

function ConversionReport({ incidents, onRowClick }: { incidents: Incident[]; onRowClick: (id: string) => void }) {
  // Converted incidents - converted_to_type IS NOT NULL
  const convertedIncidents = useMemo(() => 
    incidents.filter(i => i.converted_to_type != null),
    [incidents]
  );

  const columns = [
    { key: 'key', label: 'Incident Key', render: (i: Incident) => <span className="font-mono text-brand-primary font-medium">{i.incident_key}</span> },
    { key: 'summary', label: 'Summary', render: (i: Incident) => <span className="truncate max-w-[180px] block">{i.title}</span> },
    { key: 'severity', label: 'Severity', render: (i: Incident) => <SeverityBadge severity={i.severity} /> },
    { key: 'convertedTo', label: 'Converted To', render: (i: Incident) => (
      <Badge variant="outline" className={cn('text-[10px]',
        i.converted_to_type === 'epic' ? 'bg-purple-100 text-purple-700 border-purple-200' :
        i.converted_to_type === 'feature' ? 'bg-blue-100 text-blue-700 border-blue-200' :
        'bg-teal-100 text-teal-700 border-teal-200'
      )}>
        {i.converted_to_type?.toUpperCase()}
      </Badge>
    )},
    { key: 'workItemId', label: 'Work Item ID', render: (i: Incident) => (
      <span className="font-mono text-muted-foreground">{i.converted_to_id || '-'}</span>
    )},
    { key: 'convertedAt', label: 'Converted At', render: (i: Incident) => (
      <span className="text-muted-foreground">{i.converted_at ? new Date(i.converted_at).toLocaleDateString() : '-'}</span>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">{convertedIncidents.length} incidents converted to work items</div>
      </div>
      <ReportTable incidents={convertedIncidents} columns={columns} onRowClick={onRowClick} />
    </div>
  );
}

function DistributionReport({ incidents }: { incidents: Incident[] }) {
  // Severity vs Priority matrix
  const matrix = useMemo(() => {
    const severities = ['SEV1', 'SEV2', 'SEV3', 'SEV4'];
    const priorities = ['P1', 'P2', 'P3', 'P4'];
    
    const data: Record<string, Record<string, number>> = {};
    severities.forEach(sev => {
      data[sev] = {};
      priorities.forEach(pri => {
        data[sev][pri] = incidents.filter(i => i.severity === sev && i.priority === pri).length;
      });
    });
    
    return { severities, priorities, data };
  }, [incidents]);

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-3">Severity vs Priority distribution ({incidents.length} total incidents)</div>
      <div className="overflow-auto">
        <table className="w-full text-xs border border-border">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground border-r border-border">Severity \ Priority</th>
              {matrix.priorities.map(pri => (
                <th key={pri} className="px-3 py-2 text-center font-semibold text-muted-foreground border-r border-border last:border-r-0">{pri}</th>
              ))}
              <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {matrix.severities.map(sev => {
              const rowTotal = matrix.priorities.reduce((sum, pri) => sum + matrix.data[sev][pri], 0);
              return (
                <tr key={sev} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground border-r border-border">{sev}</td>
                  {matrix.priorities.map(pri => (
                    <td key={pri} className={cn(
                      "px-3 py-2 text-center border-r border-border last:border-r-0",
                      matrix.data[sev][pri] > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}>
                      {matrix.data[sev][pri] || '-'}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-semibold text-brand-primary">{rowTotal}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-border bg-muted/30">
              <td className="px-3 py-2 font-semibold text-foreground border-r border-border">Total</td>
              {matrix.priorities.map(pri => {
                const colTotal = matrix.severities.reduce((sum, sev) => sum + matrix.data[sev][pri], 0);
                return (
                  <td key={pri} className="px-3 py-2 text-center font-semibold text-brand-primary border-r border-border last:border-r-0">{colTotal}</td>
                );
              })}
              <td className="px-3 py-2 text-center font-bold text-brand-primary">{incidents.length}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function IncidentReportsPage() {
  const navigate = useNavigate();
  const [activeReport, setActiveReport] = useState<ReportType>('sla_breach');
  
  // SINGLE SOURCE OF TRUTH - ALL DATA FROM useIncidents
  const { data: incidents = [], isLoading, error } = useIncidents();

  const handleRowClick = (id: string) => {
    navigate(`/release/incidents/${id}`);
  };

  const handleExport = async () => {
    // Export current report as CSV
    const reportIncidents = incidents;
    const csvContent = [
      ['Key', 'Summary', 'Severity', 'Priority', 'Status', 'Support Level', 'Created At'].join(','),
      ...reportIncidents.map(i => [
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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

  const activeConfig = REPORT_CONFIGS.find(r => r.id === activeReport)!;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b border-border bg-card flex-shrink-0 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate('/release/incidents/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-base font-semibold text-foreground">Incident Reports</h1>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExport}>
          <Download className="h-3 w-3 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar - Report Selection */}
        <div className="w-64 border-r border-border bg-muted/30 p-3 flex-shrink-0 overflow-auto">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reports</div>
          <div className="space-y-1">
            {REPORT_CONFIGS.map(report => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded text-left transition-colors",
                    activeReport === report.id 
                      ? "bg-brand-primary/10 text-brand-primary" 
                      : "hover:bg-muted text-foreground"
                  )}
                  onClick={() => setActiveReport(report.id)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{report.title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{report.description}</div>
                  </div>
                  {activeReport === report.id && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Report Area */}
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">{activeConfig.title}</h2>
            <p className="text-xs text-muted-foreground">{activeConfig.description}</p>
          </div>
          
          {activeReport === 'sla_breach' && <SLABreachReport incidents={incidents} onRowClick={handleRowClick} />}
          {activeReport === 'aging' && <AgingReport incidents={incidents} onRowClick={handleRowClick} />}
          {activeReport === 'committee' && <CommitteeReport incidents={incidents} onRowClick={handleRowClick} />}
          {activeReport === 'conversion' && <ConversionReport incidents={incidents} onRowClick={handleRowClick} />}
          {activeReport === 'distribution' && <DistributionReport incidents={incidents} />}
        </div>
      </div>
    </div>
  );
}
