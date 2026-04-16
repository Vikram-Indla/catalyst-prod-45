import { useMemo } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useNavigate, Link } from 'react-router-dom';
import { 
  AlertCircle, AlertTriangle, Clock, ArrowRight, Loader2, 
  CheckCircle2, GitBranch, Users, Shield, FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
// DASHBOARD - ALL METRICS FROM useIncidents ONLY
// ============================================

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  onClick: () => void;
  subItems?: { label: string; value: number; onClick: () => void }[];
}

function KPICard({ title, value, icon: Icon, colorClass, onClick, subItems }: KPICardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border-border"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={cn("p-2 rounded-lg", colorClass.replace('text-', 'bg-').replace('-600', '-100'))}>
            <Icon className={cn("h-4 w-4", colorClass)} />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className={cn("text-2xl font-bold", colorClass)}>{value}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{title}</div>
        
        {subItems && subItems.length > 0 && (
          <div className="flex gap-2 pt-3 mt-3 border-t border-border">
            {subItems.map((item) => (
              <button
                key={item.label}
                className="flex-1 text-center p-1.5 rounded hover:bg-muted/50 transition-colors"
                onClick={(e) => { e.stopPropagation(); item.onClick(); }}
              >
                <div className="text-sm font-semibold text-foreground">{item.value}</div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DistributionCard({ 
  title, 
  data, 
  onItemClick 
}: { 
  title: string; 
  data: { label: string; count: number; param: string }[];
  onItemClick: (param: string) => void;
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {data.map((item, idx) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div 
              key={item.label}
              className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
              onClick={() => onItemClick(item.param)}
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-foreground font-medium">{item.label}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden mx-2">
                  <div 
                    className="h-full bg-brand-primary rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-foreground min-w-[32px] text-right">{item.count}</span>
            </div>
          );
        })}
        {total === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No data</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function IncidentDashboardPage() {
  const navigate = useNavigate();
  
  // SINGLE SOURCE OF TRUTH - ALL DATA FROM useIncidents
  const { data: incidents = [], isLoading, error } = useIncidents();

  // ALL METRICS DERIVED FROM BACKEND DATA ONLY
  const metrics = useMemo(() => {
    const openStatuses = ['open', 'triage', 'to_committee', 'in_progress'];
    const openIncidents = incidents.filter(i => openStatuses.includes(i.status));
    const closedIncidents = incidents.filter(i => i.status === 'closed' || i.status === 'resolved');
    
    // Core KPIs - backend fields only
    const totalIncidents = incidents.length;
    const openCount = openIncidents.length;
    const closedCount = closedIncidents.length;
    const majorActive = openIncidents.filter(i => i.is_major_incident);
    
    // SLA breaches - STRICTLY from sla_records backend fields
    const responseSlaBreached = incidents.filter(i => i.sla?.response_breached);
    const resolutionSlaBreached = incidents.filter(i => i.sla?.resolution_breached);
    
    // By Severity - backend field
    const bySeverity = {
      SEV1: incidents.filter(i => i.severity === 'SEV1').length,
      SEV2: incidents.filter(i => i.severity === 'SEV2').length,
      SEV3: incidents.filter(i => i.severity === 'SEV3').length,
      SEV4: incidents.filter(i => i.severity === 'SEV4').length,
    };
    
    // By Priority - backend derived field
    const byPriority = {
      P1: incidents.filter(i => i.priority === 'P1').length,
      P2: incidents.filter(i => i.priority === 'P2').length,
      P3: incidents.filter(i => i.priority === 'P3').length,
      P4: incidents.filter(i => i.priority === 'P4').length,
    };
    
    // By Support Level - backend field
    const l1Count = openIncidents.filter(i => i.support_level === 'L1').length;
    const l2Count = openIncidents.filter(i => i.support_level === 'L2').length;
    const l3Count = openIncidents.filter(i => i.support_level === 'L3').length;
    
    // L3 Pending Committee - backend fields only
    const l3PendingCommittee = incidents.filter(i => 
      i.support_level === 'L3' && 
      i.status === 'to_committee' &&
      (!i.committee || i.committee.status === 'pending')
    );
    
    // Converted - backend field (converted_to_type IS NOT NULL)
    const convertedIncidents = incidents.filter(i => i.converted_to_type != null);
    const convertedToStory = convertedIncidents.filter(i => i.converted_to_type === 'story').length;
    const convertedToFeature = convertedIncidents.filter(i => i.converted_to_type === 'feature').length;
    const convertedToEpic = convertedIncidents.filter(i => i.converted_to_type === 'epic').length;
    
    // Aging buckets - derived from incident.created_at (time semantics: now - created_at)
    const now = new Date();
    const getAgingDays = (createdAt: string) => 
      Math.floor((now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    const agingBuckets = {
      under24h: openIncidents.filter(i => getAgingDays(i.created_at) < 1).length,
      days1to3: openIncidents.filter(i => { const d = getAgingDays(i.created_at); return d >= 1 && d < 3; }).length,
      days3to7: openIncidents.filter(i => { const d = getAgingDays(i.created_at); return d >= 3 && d < 7; }).length,
      over7days: openIncidents.filter(i => getAgingDays(i.created_at) >= 7).length,
    };

    return {
      totalIncidents,
      openCount,
      closedCount,
      majorActive,
      responseSlaBreached,
      resolutionSlaBreached,
      bySeverity,
      byPriority,
      l1Count,
      l2Count,
      l3Count,
      l3PendingCommittee,
      convertedIncidents,
      convertedToStory,
      convertedToFeature,
      convertedToEpic,
      agingBuckets,
    };
  }, [incidents]);

  // Navigation handlers - pass backend query params
  const navTo = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    navigate(`/release/incidents?${searchParams.toString()}`);
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
          <p className="text-sm font-medium text-destructive">Failed to load dashboard</p>
          <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Compact Header */}
      <div className="h-12 border-b border-border bg-card flex-shrink-0 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CatalystPageHeader title="Incident Dashboard" />
          <Badge variant="outline" className="text-[10px]">
            {metrics.totalIncidents} total
          </Badge>
        </div>
        <Link to="/release/incidents/reports">
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <FileText className="h-3 w-3 mr-1.5" />
            Reports
          </Button>
        </Link>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Row 1: Core KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            title="Total Open"
            value={metrics.openCount}
            icon={AlertCircle}
            colorClass="text-blue-600"
            onClick={() => navTo({ status: 'open,triage,to_committee,in_progress' })}
            subItems={[
              { label: 'L1', value: metrics.l1Count, onClick: () => navTo({ status: 'open,triage,to_committee,in_progress', support_level: 'L1' }) },
              { label: 'L2', value: metrics.l2Count, onClick: () => navTo({ status: 'open,triage,to_committee,in_progress', support_level: 'L2' }) },
              { label: 'L3', value: metrics.l3Count, onClick: () => navTo({ status: 'open,triage,to_committee,in_progress', support_level: 'L3' }) },
            ]}
          />
          
          <KPICard
            title="Major Active"
            value={metrics.majorActive.length}
            icon={AlertTriangle}
            colorClass={metrics.majorActive.length > 0 ? "text-red-600" : "text-muted-foreground"}
            onClick={() => navTo({ major: 'true' })}
          />
          
          <KPICard
            title="SLA Breached"
            value={metrics.responseSlaBreached.length + metrics.resolutionSlaBreached.length}
            icon={Clock}
            colorClass={(metrics.responseSlaBreached.length + metrics.resolutionSlaBreached.length) > 0 ? "text-orange-600" : "text-muted-foreground"}
            onClick={() => navTo({ sla_breach: 'true' })}
            subItems={[
              { label: 'Response', value: metrics.responseSlaBreached.length, onClick: () => navTo({ sla_response_breach: 'true' }) },
              { label: 'Resolution', value: metrics.resolutionSlaBreached.length, onClick: () => navTo({ sla_resolution_breach: 'true' }) },
            ]}
          />
          
          <KPICard
            title="L3 Pending Committee"
            value={metrics.l3PendingCommittee.length}
            icon={Shield}
            colorClass={metrics.l3PendingCommittee.length > 0 ? "text-amber-600" : "text-muted-foreground"}
            onClick={() => navigate('/release/committee-queue')}
          />
        </div>

        {/* Row 2: Distributions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DistributionCard
            title="By Severity"
            data={[
              { label: 'SEV1 — Critical', count: metrics.bySeverity.SEV1, param: 'SEV1' },
              { label: 'SEV2 — High', count: metrics.bySeverity.SEV2, param: 'SEV2' },
              { label: 'SEV3 — Medium', count: metrics.bySeverity.SEV3, param: 'SEV3' },
              { label: 'SEV4 — Low', count: metrics.bySeverity.SEV4, param: 'SEV4' },
            ]}
            onItemClick={(param) => navTo({ severity: param })}
          />
          
          <DistributionCard
            title="By Priority (Derived)"
            data={[
              { label: 'P1 — Critical', count: metrics.byPriority.P1, param: 'P1' },
              { label: 'P2 — High', count: metrics.byPriority.P2, param: 'P2' },
              { label: 'P3 — Medium', count: metrics.byPriority.P3, param: 'P3' },
              { label: 'P4 — Low', count: metrics.byPriority.P4, param: 'P4' },
            ]}
            onItemClick={(param) => navTo({ priority: param })}
          />
          
          <DistributionCard
            title="Aging (Open Incidents)"
            data={[
              { label: '< 24 hours', count: metrics.agingBuckets.under24h, param: '<24h' },
              { label: '1-3 days', count: metrics.agingBuckets.days1to3, param: '1-3d' },
              { label: '3-7 days', count: metrics.agingBuckets.days3to7, param: '3-7d' },
              { label: '> 7 days', count: metrics.agingBuckets.over7days, param: '>7d' },
            ]}
            onItemClick={(param) => navTo({ aging: param })}
          />
        </div>

        {/* Row 3: Conversions + Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                Converted Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-2">{metrics.convertedIncidents.length}</div>
              <div className="flex gap-3">
                <button 
                  className="flex-1 p-2 bg-sky-50 border border-sky-100 rounded text-center hover:bg-sky-100 transition-colors"
                  onClick={() => navTo({ status: 'converted', converted_to: 'story' })}
                >
                  <div className="text-sm font-semibold text-sky-700">{metrics.convertedToStory}</div>
                  <div className="text-[10px] text-sky-600">Story</div>
                </button>
                <button 
                  className="flex-1 p-2 bg-amber-50 border border-amber-100 rounded text-center hover:bg-amber-100 transition-colors"
                  onClick={() => navTo({ status: 'converted', converted_to: 'feature' })}
                >
                  <div className="text-sm font-semibold text-amber-700">{metrics.convertedToFeature}</div>
                  <div className="text-[10px] text-amber-600">Feature</div>
                </button>
                <button 
                  className="flex-1 p-2 bg-amber-50 border border-amber-100 rounded text-center hover:bg-amber-100 transition-colors"
                  onClick={() => navTo({ status: 'converted', converted_to: 'epic' })}
                >
                  <div className="text-sm font-semibold text-amber-700">{metrics.convertedToEpic}</div>
                  <div className="text-[10px] text-amber-600">Epic</div>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Status Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-sky-50 rounded text-center border border-sky-100">
                  <div className="text-lg font-semibold text-sky-700">{metrics.openCount}</div>
                  <div className="text-[10px] text-sky-600">Open</div>
                </div>
                <div className="p-2 bg-emerald-50 rounded text-center border border-emerald-100">
                  <div className="text-lg font-semibold text-emerald-700">{metrics.closedCount}</div>
                  <div className="text-[10px] text-emerald-600">Closed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Active Major Incidents Table (if any) */}
        {metrics.majorActive.length > 0 && (
          <Card className="border-rose-200 bg-rose-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-rose-800 uppercase tracking-wide">
                Active Major Incidents
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead className="bg-rose-100/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-rose-800">Key</th>
                    <th className="px-3 py-2 text-left font-semibold text-rose-800">Summary</th>
                    <th className="px-3 py-2 text-left font-semibold text-rose-800">Severity</th>
                    <th className="px-3 py-2 text-left font-semibold text-rose-800">Priority</th>
                    <th className="px-3 py-2 text-left font-semibold text-rose-800">Age</th>
                    <th className="px-3 py-2 text-left font-semibold text-rose-800">Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.majorActive.map((inc: Incident) => (
                    <tr 
                      key={inc.id} 
                      className="hover:bg-red-100/50 cursor-pointer border-t border-red-200"
                      onClick={() => navigate(`/release/incidents/${inc.id}`)}
                    >
                      <td className="px-3 py-2 font-mono font-medium text-red-700">{inc.incident_key}</td>
                      <td className="px-3 py-2 text-foreground truncate max-w-[200px]">{inc.title}</td>
                      <td className="px-3 py-2"><SeverityBadge severity={inc.severity} /></td>
                      <td className="px-3 py-2"><PriorityBadge priority={inc.priority} /></td>
                      <td className="px-3 py-2 text-muted-foreground font-mono">{getAgingTime(inc.created_at)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{inc.assignee?.full_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
