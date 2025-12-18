import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Clock, TrendingUp, Users, Timer, ChevronRight, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIncidents } from '@/hooks/useIncidents';
import type { Incident, SupportLevel } from '@/types/incident';

interface DashboardWidget {
  id: string;
  title: string;
  value: number;
  delta?: number;
  icon: React.ElementType;
  color: string;
  filter?: Record<string, unknown>;
}

function StatCard({ widget, onClick }: { widget: DashboardWidget; onClick: () => void }) {
  const Icon = widget.icon;
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border-border"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{widget.title}</p>
            <p className={cn("text-3xl font-bold mt-1", widget.color)}>{widget.value}</p>
            {widget.delta !== undefined && (
              <p className={cn(
                "text-xs mt-1",
                widget.delta > 0 ? "text-red-600" : widget.delta < 0 ? "text-green-600" : "text-muted-foreground"
              )}>
                {widget.delta > 0 ? '+' : ''}{widget.delta} vs last week
              </p>
            )}
          </div>
          <div className={cn("p-2 rounded-lg", widget.color.replace('text-', 'bg-').replace('-600', '-100'))}>
            <Icon className={cn("h-5 w-5", widget.color)} />
          </div>
        </div>
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
  data: { label: string; count: number; color: string }[];
  onItemClick: (label: string) => void;
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((item) => (
          <div 
            key={item.label}
            className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
            onClick={() => onItemClick(item.label)}
          >
            <div className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", item.color)} />
              <span className="text-xs text-foreground">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{item.count}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        ))}
        {total === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No data</p>
        )}
      </CardContent>
    </Card>
  );
}

function AgingBucketsCard({ 
  data, 
  onBucketClick 
}: { 
  data: { bucket: string; count: number; color: string }[];
  onBucketClick: (bucket: string) => void;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Aging Buckets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {data.map((item) => (
            <div 
              key={item.bucket}
              className={cn(
                "p-3 rounded-lg text-center cursor-pointer hover:opacity-80 transition-opacity",
                item.color
              )}
              onClick={() => onBucketClick(item.bucket)}
            >
              <p className="text-lg font-bold text-white">{item.count}</p>
              <p className="text-[10px] text-white/80">{item.bucket}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function IncidentDashboardPage() {
  const navigate = useNavigate();
  const { data: incidents = [], isLoading } = useIncidents();

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const openStatuses = ['open', 'triage', 'to_committee', 'in_progress'];
    const openIncidents = incidents.filter(i => openStatuses.includes(i.status));
    const newToday = incidents.filter(i => new Date(i.created_at) >= today);
    const majorActive = incidents.filter(i => i.is_major_incident && openStatuses.includes(i.status));
    
    // SLA breaches
    const slaBreaches = incidents.filter(i => 
      openStatuses.includes(i.status) && 
      i.sla && 
      (i.sla.response_breached || i.sla.resolution_breached)
    );

    // Support level distribution
    const l1Count = openIncidents.filter(i => i.support_level === 'L1').length;
    const l2Count = openIncidents.filter(i => i.support_level === 'L2').length;
    const l3Count = openIncidents.filter(i => i.support_level === 'L3').length;

    // Aging buckets
    const getAgingDays = (createdAt: string) => {
      return Math.floor((now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    };

    const agingBuckets = [
      { bucket: '< 1 day', count: openIncidents.filter(i => getAgingDays(i.created_at) < 1).length, color: 'bg-green-500' },
      { bucket: '1-3 days', count: openIncidents.filter(i => { const d = getAgingDays(i.created_at); return d >= 1 && d < 3; }).length, color: 'bg-blue-500' },
      { bucket: '3-7 days', count: openIncidents.filter(i => { const d = getAgingDays(i.created_at); return d >= 3 && d < 7; }).length, color: 'bg-yellow-500' },
      { bucket: '7-14 days', count: openIncidents.filter(i => { const d = getAgingDays(i.created_at); return d >= 7 && d < 14; }).length, color: 'bg-orange-500' },
      { bucket: '> 14 days', count: openIncidents.filter(i => getAgingDays(i.created_at) >= 14).length, color: 'bg-red-500' },
    ];

    // By business process (mock - would need actual data)
    const byWorkgroup = openIncidents.reduce((acc, i) => {
      const name = i.assignee_workgroup?.name || 'Unassigned';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      openCount: openIncidents.length,
      newToday: newToday.length,
      majorActive: majorActive.length,
      slaBreaches: slaBreaches.length,
      l1Count,
      l2Count,
      l3Count,
      agingBuckets,
      byWorkgroup: Object.entries(byWorkgroup).map(([name, count], idx) => ({
        label: name,
        count,
        color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'][idx % 4],
      })),
    };
  }, [incidents]);

  const widgets: DashboardWidget[] = [
    { id: 'open', title: 'Open Incidents', value: metrics.openCount, delta: 3, icon: AlertCircle, color: 'text-blue-600' },
    { id: 'new', title: 'New Today', value: metrics.newToday, icon: TrendingUp, color: 'text-green-600' },
    { id: 'major', title: 'Major Incidents', value: metrics.majorActive, icon: Zap, color: 'text-red-600' },
    { id: 'sla', title: 'SLA Breaches', value: metrics.slaBreaches, delta: -1, icon: Timer, color: 'text-orange-600' },
  ];

  const supportLevelData = [
    { label: 'L1 - First Line', count: metrics.l1Count, color: 'bg-green-500' },
    { label: 'L2 - Second Line', count: metrics.l2Count, color: 'bg-blue-500' },
    { label: 'L3 - Third Line', count: metrics.l3Count, color: 'bg-purple-500' },
  ];

  const handleWidgetClick = (widgetId: string) => {
    const params = new URLSearchParams();
    if (widgetId === 'open') params.set('status', 'open,triage,to_committee,in_progress');
    if (widgetId === 'major') params.set('major', 'true');
    if (widgetId === 'sla') params.set('sla_breach', 'true');
    navigate(`/release/incidents?${params.toString()}`);
  };

  const handleSupportLevelClick = (label: string) => {
    const level = label.split(' ')[0] as SupportLevel;
    navigate(`/release/incidents?support_level=${level}`);
  };

  const handleWorkgroupClick = (label: string) => {
    navigate(`/release/incidents?workgroup=${encodeURIComponent(label)}`);
  };

  const handleAgingClick = (bucket: string) => {
    navigate(`/release/incidents?aging=${encodeURIComponent(bucket)}`);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b border-border bg-card flex-shrink-0 px-4 flex items-center">
        <h1 className="text-base font-semibold text-foreground">Incident Dashboard</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Top Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {widgets.map((widget) => (
            <StatCard 
              key={widget.id} 
              widget={widget} 
              onClick={() => handleWidgetClick(widget.id)} 
            />
          ))}
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Support Level Distribution */}
          <DistributionCard
            title="L1 / L2 / L3 Distribution"
            data={supportLevelData}
            onItemClick={handleSupportLevelClick}
          />

          {/* By Work Group */}
          <DistributionCard
            title="By Work Group"
            data={metrics.byWorkgroup}
            onItemClick={handleWorkgroupClick}
          />

          {/* Aging Buckets */}
          <AgingBucketsCard
            data={metrics.agingBuckets}
            onBucketClick={handleAgingClick}
          />
        </div>

        {/* Major Incident Alert */}
        {metrics.majorActive > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">
                    {metrics.majorActive} Active Major Incident{metrics.majorActive > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-red-700">Requires immediate executive attention</p>
                </div>
                <Badge 
                  variant="destructive" 
                  className="cursor-pointer"
                  onClick={() => handleWidgetClick('major')}
                >
                  View All
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
