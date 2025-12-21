import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Flame,
  ShieldCheck,
  Package,
  Timer,
  Minus,
} from 'lucide-react';
import { useIncidentCommandCenter, type KPITile, type MajorIncident } from '@/hooks/useIncidentCommandCenter';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

const COLOR_MAP = {
  default: 'bg-card border-border',
  critical: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
  warning: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800',
  success: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
};

const TEXT_COLOR_MAP = {
  default: 'text-foreground',
  critical: 'text-red-700 dark:text-red-400',
  warning: 'text-orange-700 dark:text-orange-400',
  success: 'text-green-700 dark:text-green-400',
};

function KPICard({ kpi, onClick }: { kpi: KPITile; onClick: () => void }) {
  const color = kpi.color || 'default';
  
  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-md border',
        COLOR_MAP[color]
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {kpi.label}
          </p>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
        </div>
        <p className={cn('text-3xl font-bold', TEXT_COLOR_MAP[color])}>
          {kpi.value}
        </p>
        {kpi.breakdown && (
          <p className="text-xs text-muted-foreground mt-1">{kpi.breakdown}</p>
        )}
        {kpi.delta !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {kpi.delta > 0 ? (
              <TrendingUp className="h-3 w-3 text-red-500" />
            ) : kpi.delta < 0 ? (
              <TrendingDown className="h-3 w-3 text-green-500" />
            ) : (
              <Minus className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={cn(
              'text-xs',
              kpi.delta > 0 ? 'text-red-600' : kpi.delta < 0 ? 'text-green-600' : 'text-muted-foreground'
            )}>
              {kpi.delta > 0 ? '+' : ''}{kpi.delta} {kpi.deltaLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MajorIncidentSpotlight({ incidents, onIncidentClick }: { 
  incidents: MajorIncident[]; 
  onIncidentClick: (id: string) => void;
}) {
  if (incidents.length === 0) return null;

  return (
    <Card className="border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-red-600" />
          <CardTitle className="text-red-700 dark:text-red-400">Major Incident Alert</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {incidents.map((incident) => (
          <div 
            key={incident.id}
            className="flex items-center gap-4 p-3 bg-white dark:bg-background rounded-lg border border-red-200 dark:border-red-800 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onIncidentClick(incident.id)}
          >
            <div className="flex-shrink-0">
              <Badge variant="destructive" className="text-xs">
                {incident.severity}
              </Badge>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-medium text-brand-primary">
                  {incident.incident_key}
                </span>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {incident.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-foreground truncate">{incident.title}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{incident.hours_open}h open</span>
              </div>
              {incident.assignee_name && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{incident.assignee_name}</span>
                </div>
              )}
              <Badge 
                variant="outline" 
                className={cn(
                  'text-[10px]',
                  incident.sla_status === 'breached' && 'border-red-500 text-red-600 bg-red-50',
                  incident.sla_status === 'at_risk' && 'border-orange-500 text-orange-600 bg-orange-50',
                  incident.sla_status === 'ok' && 'border-green-500 text-green-600 bg-green-50'
                )}
              >
                SLA: {incident.sla_status === 'breached' ? 'Breached' : incident.sla_status === 'at_risk' ? 'At Risk' : 'OK'}
              </Badge>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function IncidentHealthSection({ 
  trends, 
  supportDistribution, 
  slaAtRisk,
  onDrillDown,
}: { 
  trends: { date: string; logged: number; closed: number; converted: number }[];
  supportDistribution: { level: string; count: number; percentage: number }[];
  slaAtRisk: number;
  onDrillDown: (filter: string) => void;
}) {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Trend Chart */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Incident Flow (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="logged" stroke="#3b82f6" strokeWidth={2} name="Logged" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="closed" stroke="#22c55e" strokeWidth={2} name="Closed" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="converted" stroke="#a855f7" strokeWidth={2} name="Converted" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Support Level Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Support Level Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[120px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={supportDistribution}
                  dataKey="count"
                  nameKey="level"
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={2}
                >
                  {supportDistribution.map((entry, index) => (
                    <Cell key={entry.level} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {supportDistribution.map((item, idx) => (
              <div 
                key={item.level} 
                className="flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                onClick={() => onDrillDown(`support_level=${item.level}`)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[idx] }} />
                  <span>{item.level}</span>
                </div>
                <span className="font-medium">{item.count} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
          
          {/* SLA At Risk */}
          <div 
            className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800 cursor-pointer hover:shadow-md"
            onClick={() => onDrillDown('sla_at_risk=true')}
          >
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-400">SLA At Risk</span>
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-1">{slaAtRisk}</p>
            <p className="text-xs text-orange-600">Near breach threshold</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CAPEffectivenessSection({ 
  effectiveness,
  onDrillDown,
}: { 
  effectiveness: {
    averageApprovalTimeMinutes: number;
    oldestPendingDays?: number;
    oldestPendingId?: string;
    approved: number;
    rejected: number;
    vetoed: number;
  };
  onDrillDown: (filter: string) => void;
}) {
  const data = [
    { name: 'Approved', value: effectiveness.approved, color: '#22c55e' },
    { name: 'Rejected', value: effectiveness.rejected, color: '#ef4444' },
    { name: 'Vetoed', value: effectiveness.vetoed, color: '#8b5cf6' },
  ];

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">CAP Committee Effectiveness</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase mb-1">Avg Approval Time</p>
            <p className="text-2xl font-bold">{formatTime(effectiveness.averageApprovalTimeMinutes)}</p>
          </div>
          
          {effectiveness.oldestPendingDays !== undefined && (
            <div 
              className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg cursor-pointer hover:shadow-md"
              onClick={() => effectiveness.oldestPendingId && onDrillDown(`incident_id=${effectiveness.oldestPendingId}`)}
            >
              <p className="text-xs text-orange-600 uppercase mb-1">Oldest Pending</p>
              <p className="text-2xl font-bold text-orange-700">{effectiveness.oldestPendingDays}d</p>
            </div>
          )}

          <div className="col-span-2 flex items-center justify-center gap-8">
            {data.map((item) => (
              <div 
                key={item.name} 
                className="text-center cursor-pointer"
                onClick={() => onDrillDown(`cap_status=${item.name.toLowerCase()}`)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {item.name === 'Approved' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {item.name === 'Rejected' && <XCircle className="h-4 w-4 text-red-600" />}
                  {item.name === 'Vetoed' && <AlertCircle className="h-4 w-4 text-amber-600" />}
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
                <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReleaseImpactSection({ 
  releases,
  missingReleaseCount,
  onDrillDown,
}: { 
  releases: {
    releaseId: string;
    releaseVersion: string;
    releaseDate?: string;
    blocking: number;
    missingRelease: number;
    inTesting: number;
  }[];
  missingReleaseCount: number;
  onDrillDown: (filter: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Release Impact</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* Missing Release Warning */}
        {missingReleaseCount > 0 && (
          <div 
            className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800 cursor-pointer hover:shadow-md"
            onClick={() => onDrillDown('release_version_id=null')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">Missing Release Assignment</span>
              </div>
              <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50">
                {missingReleaseCount}
              </Badge>
            </div>
          </div>
        )}

        {/* Release Table */}
        {releases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Release</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Blocking</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">In Testing</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((release) => (
                  <tr 
                    key={release.releaseId} 
                    className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/50"
                    onClick={() => onDrillDown(`release_version_id=${release.releaseId}`)}
                  >
                    <td className="py-3 font-medium">{release.releaseVersion}</td>
                    <td className="py-3 text-center">
                      {release.blocking > 0 ? (
                        <Badge variant="destructive" className="text-xs">{release.blocking}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {release.inTesting > 0 ? (
                        <Badge variant="outline" className="text-xs">{release.inTesting}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      {release.releaseDate ? new Date(release.releaseDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No release data available</p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function IncidentCommandCenter() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useIncidentCommandCenter();

  const handleDrillDown = (filterUrl: string) => {
    // Navigate to incident list with filters
    const url = filterUrl.startsWith('/') ? filterUrl : `/release/incidents/list?${filterUrl}`;
    navigate(url);
  };

  const handleIncidentClick = (id: string) => {
    navigate(`/release/incidents/${id}`);
  };

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <GlobalPageHeader sectionLabel="RELEASE" pageTitle="Incident Command Center" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">Failed to load command center</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <GlobalPageHeader 
        sectionLabel="RELEASE" 
        pageTitle="Incident Command Center"
        rightActions={
          <Button 
            variant="outline" 
            onClick={() => navigate('/release/incidents')}
          >
            View Incidents
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : data ? (
          <>
            {/* Major Incident Spotlight - Pinned to top */}
            <MajorIncidentSpotlight 
              incidents={data.majorIncidents} 
              onIncidentClick={handleIncidentClick}
            />

            {/* KPI Tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              {data.kpis.map((kpi) => (
                <KPICard 
                  key={kpi.label} 
                  kpi={kpi} 
                  onClick={() => handleDrillDown(kpi.filterUrl)}
                />
              ))}
            </div>

            {/* Incident Health */}
            <IncidentHealthSection
              trends={data.incidentTrends}
              supportDistribution={data.supportLevelDistribution}
              slaAtRisk={data.slaAtRisk}
              onDrillDown={handleDrillDown}
            />

            {/* CAP Committee Effectiveness */}
            <CAPEffectivenessSection
              effectiveness={data.capEffectiveness}
              onDrillDown={handleDrillDown}
            />

            {/* Release Impact */}
            <ReleaseImpactSection
              releases={data.releaseImpacts}
              missingReleaseCount={data.kpis.find(k => k.label === 'Open Incidents')?.value || 0}
              onDrillDown={handleDrillDown}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
