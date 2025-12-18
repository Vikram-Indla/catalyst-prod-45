import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, AlertTriangle, Clock, TrendingUp, Users, Timer, ChevronRight, Zap, 
  CheckCircle2, XCircle, FileText, Download, Calendar, ArrowRight, GitBranch,
  Shield, Vote, Ban, TimerOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useIncidents } from '@/hooks/useIncidents';
import type { Incident, SupportLevel } from '@/types/incident';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

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

function SmallStatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  onClick 
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  color: string;
  onClick: () => void;
}) {
  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded", color.replace('text-', 'bg-').replace('-600', '-100'))}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <span className="text-xs text-muted-foreground">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className={cn("text-lg font-bold", color)}>{value}</span>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      </div>
    </div>
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
        <div className="grid grid-cols-4 gap-2">
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

function ReportsSection({ 
  incidents, 
  onExport 
}: { 
  incidents: Incident[];
  onExport: (reportType: string) => void;
}) {
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  const reportMetrics = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    
    switch (reportPeriod) {
      case 'daily':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'weekly':
        startDate = startOfWeek(now, { weekStartsOn: 0 });
        endDate = endOfWeek(now, { weekStartsOn: 0 });
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
    }
    
    const periodIncidents = incidents.filter(i => {
      const created = new Date(i.created_at);
      return created >= startDate && created <= endDate;
    });
    
    const closedIncidents = periodIncidents.filter(i => i.status === 'closed' || i.status === 'resolved');
    const majorIncidents = periodIncidents.filter(i => i.is_major_incident);
    const slaBreaches = periodIncidents.filter(i => i.sla?.response_breached || i.sla?.resolution_breached);
    const l1Count = periodIncidents.filter(i => i.support_level === 'L1').length;
    const l2Count = periodIncidents.filter(i => i.support_level === 'L2').length;
    const l3Count = periodIncidents.filter(i => i.support_level === 'L3').length;
    const convertedIncidents = periodIncidents.filter(i => i.status === 'converted');
    
    return {
      total: periodIncidents.length,
      closed: closedIncidents.length,
      major: majorIncidents.length,
      slaBreaches: slaBreaches.length,
      l1Count,
      l2Count,
      l3Count,
      converted: convertedIncidents.length,
      startDate,
      endDate,
    };
  }, [incidents, reportPeriod]);

  const reportTitle = {
    daily: 'Daily Incident Report',
    weekly: 'Weekly Incident Report',
    monthly: 'Monthly Incident Report',
  }[reportPeriod];

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={reportPeriod} onValueChange={(v) => setReportPeriod(v as typeof reportPeriod)}>
              <TabsList className="h-7">
                <TabsTrigger value="daily" className="text-xs px-2 h-5">Daily</TabsTrigger>
                <TabsTrigger value="weekly" className="text-xs px-2 h-5">Weekly</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs px-2 h-5">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => onExport(reportPeriod)}
            >
              <Download className="h-3 w-3 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-3">
          {format(reportMetrics.startDate, 'MMM d, yyyy')} - {format(reportMetrics.endDate, 'MMM d, yyyy')}
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold text-foreground">{reportMetrics.total}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Total Logged</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{reportMetrics.closed}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Closed</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{reportMetrics.major}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Major</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">{reportMetrics.slaBreaches}</p>
            <p className="text-[10px] text-muted-foreground uppercase">SLA Breaches</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-3">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-lg font-bold text-green-600">{reportMetrics.l1Count}</p>
            <p className="text-[10px] text-muted-foreground uppercase">L1</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-lg font-bold text-blue-600">{reportMetrics.l2Count}</p>
            <p className="text-[10px] text-muted-foreground uppercase">L2</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-lg font-bold text-purple-600">{reportMetrics.l3Count}</p>
            <p className="text-[10px] text-muted-foreground uppercase">L3</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-lg font-bold text-teal-600">{reportMetrics.converted}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Converted</p>
          </div>
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const openStatuses = ['open', 'triage', 'to_committee', 'in_progress'];
    const openIncidents = incidents.filter(i => openStatuses.includes(i.status));
    const newToday = incidents.filter(i => new Date(i.created_at) >= today);
    const closedToday = incidents.filter(i => 
      (i.status === 'closed' || i.status === 'resolved') && 
      i.updated_at && new Date(i.updated_at) >= today
    );
    const majorActive = incidents.filter(i => i.is_major_incident && openStatuses.includes(i.status));
    
    // SLA breaches - separate response and resolution
    const responseSlaBreaches = incidents.filter(i => 
      openStatuses.includes(i.status) && i.sla?.response_breached
    );
    const resolutionSlaBreaches = incidents.filter(i => 
      openStatuses.includes(i.status) && i.sla?.resolution_breached
    );

    // Support level distribution
    const l1Count = openIncidents.filter(i => i.support_level === 'L1').length;
    const l2Count = openIncidents.filter(i => i.support_level === 'L2').length;
    const l3Count = openIncidents.filter(i => i.support_level === 'L3').length;

    // Workgroup distribution
    const operationsCount = openIncidents.filter(i => i.assignee_workgroup?.name === 'Operations').length;
    const deliveryCount = openIncidents.filter(i => i.assignee_workgroup?.name === 'Delivery').length;

    // Aging buckets
    const getAgingDays = (createdAt: string) => {
      return Math.floor((now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    };

    const agingBuckets = [
      { bucket: '< 24h', count: openIncidents.filter(i => getAgingDays(i.created_at) < 1).length, color: 'bg-green-500' },
      { bucket: '1-3 days', count: openIncidents.filter(i => { const d = getAgingDays(i.created_at); return d >= 1 && d < 3; }).length, color: 'bg-blue-500' },
      { bucket: '3-7 days', count: openIncidents.filter(i => { const d = getAgingDays(i.created_at); return d >= 3 && d < 7; }).length, color: 'bg-yellow-500' },
      { bucket: '> 7 days', count: openIncidents.filter(i => getAgingDays(i.created_at) >= 7).length, color: 'bg-red-500' },
    ];

    // Delivery stage distribution (using lowercase values as per type)
    const stageCount = openIncidents.filter(i => i.delivery_stage === 'stage').length;
    const qaCount = openIncidents.filter(i => i.delivery_stage === 'qa').length;
    const betaCount = openIncidents.filter(i => i.delivery_stage === 'beta').length;
    const productionCount = openIncidents.filter(i => i.delivery_stage === 'prod').length;

    // Conversion analytics (using lowercase values as per type)
    const convertedToStory = incidents.filter(i => 
      i.status === 'converted' && i.converted_to_type === 'story'
    ).length;
    const convertedToFeature = incidents.filter(i => 
      i.status === 'converted' && i.converted_to_type === 'feature'
    ).length;
    const convertedToEpic = incidents.filter(i => 
      i.status === 'converted' && i.converted_to_type === 'epic'
    ).length;

    // Committee governance insights
    const pendingApprovals = incidents.filter(i => 
      i.support_level === 'L3' && 
      i.committee && 
      i.committee.votes?.some(v => v.vote === 'pending')
    ).length;
    
    const approvedToday = incidents.filter(i => {
      if (!i.committee?.votes) return false;
      return i.committee.votes.some(v => 
        v.vote === 'approved' && 
        v.voted_at && 
        new Date(v.voted_at) >= today
      );
    }).length;
    
    const vetoedDecisions = incidents.filter(i => 
      i.committee?.votes?.some(v => v.vote === 'vetoed')
    ).length;

    // Average approval time (mock calculation - would need actual data)
    const avgApprovalTimeHours = 24; // Placeholder

    // By work group
    const byWorkgroup = openIncidents.reduce((acc, i) => {
      const name = i.assignee_workgroup?.name || 'Unassigned';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // By business process (using description field or workgroup name as proxy)
    const byBusinessProcess = openIncidents.reduce((acc, i) => {
      const name = i.assignee_workgroup?.description || i.assignee_workgroup?.name || 'Unassigned';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      openCount: openIncidents.length,
      newToday: newToday.length,
      closedToday: closedToday.length,
      majorActive: majorActive.length,
      responseSlaBreaches: responseSlaBreaches.length,
      resolutionSlaBreaches: resolutionSlaBreaches.length,
      l1Count,
      l2Count,
      l3Count,
      operationsCount,
      deliveryCount,
      agingBuckets,
      stageCount,
      qaCount,
      betaCount,
      productionCount,
      convertedToStory,
      convertedToFeature,
      convertedToEpic,
      pendingApprovals,
      approvedToday,
      vetoedDecisions,
      avgApprovalTimeHours,
      byWorkgroup: Object.entries(byWorkgroup).map(([name, count], idx) => ({
        label: name,
        count,
        color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'][idx % 4],
      })),
      byBusinessProcess: Object.entries(byBusinessProcess).slice(0, 5).map(([name, count], idx) => ({
        label: name,
        count,
        color: ['bg-indigo-500', 'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-lime-500'][idx % 5],
      })),
    };
  }, [incidents]);

  const coreWidgets: DashboardWidget[] = [
    { id: 'open', title: 'Total Open', value: metrics.openCount, delta: 3, icon: AlertCircle, color: 'text-blue-600' },
    { id: 'new', title: 'New Today', value: metrics.newToday, icon: TrendingUp, color: 'text-green-600' },
    { id: 'closed', title: 'Closed Today', value: metrics.closedToday, icon: CheckCircle2, color: 'text-emerald-600' },
    { id: 'major', title: 'Major Active', value: metrics.majorActive, icon: Zap, color: 'text-red-600' },
  ];

  const supportLevelData = [
    { label: 'L1 - First Line', count: metrics.l1Count, color: 'bg-green-500' },
    { label: 'L2 - Second Line', count: metrics.l2Count, color: 'bg-blue-500' },
    { label: 'L3 - Third Line', count: metrics.l3Count, color: 'bg-purple-500' },
  ];

  const workgroupData = [
    { label: 'Operations', count: metrics.operationsCount, color: 'bg-blue-500' },
    { label: 'Delivery', count: metrics.deliveryCount, color: 'bg-green-500' },
  ];

  const deliveryStageData = [
    { label: 'Stage', count: metrics.stageCount, color: 'bg-gray-500', value: 'stage' },
    { label: 'QA', count: metrics.qaCount, color: 'bg-yellow-500', value: 'qa' },
    { label: 'Beta', count: metrics.betaCount, color: 'bg-blue-500', value: 'beta' },
    { label: 'Production', count: metrics.productionCount, color: 'bg-green-500', value: 'prod' },
  ];

  const handleWidgetClick = (widgetId: string) => {
    const params = new URLSearchParams();
    if (widgetId === 'open') params.set('status', 'open,triage,to_committee,in_progress');
    if (widgetId === 'new') params.set('created_today', 'true');
    if (widgetId === 'closed') params.set('status', 'closed,resolved');
    if (widgetId === 'major') params.set('major', 'true');
    if (widgetId === 'response_sla') params.set('sla_response_breach', 'true');
    if (widgetId === 'resolution_sla') params.set('sla_resolution_breach', 'true');
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

  const handleDeliveryStageClick = (label: string) => {
    const stageItem = deliveryStageData.find(d => d.label === label);
    navigate(`/release/incidents?delivery_stage=${encodeURIComponent(stageItem?.value || label.toLowerCase())}`);
  };

  const handleConversionClick = (type: string) => {
    navigate(`/release/incidents?status=converted&converted_to=${type.toLowerCase()}`);
  };

  const handleGovernanceClick = (type: string) => {
    if (type === 'pending') {
      navigate(`/release/committee-queue?status=pending`);
    } else if (type === 'approved') {
      navigate(`/release/committee-queue?status=approved&today=true`);
    } else if (type === 'vetoed') {
      navigate(`/release/committee-queue?status=vetoed`);
    }
  };

  const handleBusinessProcessClick = (label: string) => {
    navigate(`/release/incidents?business_process=${encodeURIComponent(label)}`);
  };

  const handleExportReport = async (reportType: string) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let title: string;
    
    switch (reportType) {
      case 'daily':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        title = 'Daily Incident Report';
        break;
      case 'weekly':
        startDate = startOfWeek(now, { weekStartsOn: 0 });
        endDate = endOfWeek(now, { weekStartsOn: 0 });
        title = 'Weekly Incident Report';
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        title = 'Monthly Incident Report';
        break;
      default:
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        title = 'Incident Report';
    }
    
    const periodIncidents = incidents.filter(i => {
      const created = new Date(i.created_at);
      return created >= startDate && created <= endDate;
    });
    
    const closedCount = periodIncidents.filter(i => i.status === 'closed' || i.status === 'resolved').length;
    const majorCount = periodIncidents.filter(i => i.is_major_incident).length;
    const slaBreachCount = periodIncidents.filter(i => i.sla?.response_breached || i.sla?.resolution_breached).length;
    const l1Count = periodIncidents.filter(i => i.support_level === 'L1').length;
    const l2Count = periodIncidents.filter(i => i.support_level === 'L2').length;
    const l3Count = periodIncidents.filter(i => i.support_level === 'L3').length;
    const convertedCount = periodIncidents.filter(i => i.status === 'converted').length;
    
    // Build PDF
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`, 20, 30);
    doc.text(`Generated: ${format(now, 'MMM d, yyyy HH:mm')}`, 20, 36);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Metrics', 20, 50);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const metrics = [
      ['Total Incidents Logged', periodIncidents.length.toString()],
      ['Total Closed', closedCount.toString()],
      ['Major Incidents', majorCount.toString()],
      ['SLA Breaches', slaBreachCount.toString()],
      ['L1 Incidents', l1Count.toString()],
      ['L2 Incidents', l2Count.toString()],
      ['L3 Incidents', l3Count.toString()],
      ['Converted to Work Items', convertedCount.toString()],
    ];
    
    let yPos = 60;
    metrics.forEach(([label, value]) => {
      doc.text(`${label}:`, 20, yPos);
      doc.text(value, 100, yPos);
      yPos += 8;
    });
    
    // Incident list summary
    if (periodIncidents.length > 0) {
      yPos += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Incident Details', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      periodIncidents.slice(0, 20).forEach((inc) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${inc.incident_key || 'N/A'} - ${inc.severity} - ${inc.title?.substring(0, 60) || 'Untitled'}`, 20, yPos);
        yPos += 6;
      });
      
      if (periodIncidents.length > 20) {
        doc.text(`... and ${periodIncidents.length - 20} more incidents`, 20, yPos);
      }
    }
    
    doc.save(`${title.toLowerCase().replace(/ /g, '-')}-${format(now, 'yyyy-MM-dd')}.pdf`);
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
      <div className="h-12 border-b border-border bg-card flex-shrink-0 px-4 flex items-center justify-between">
        <h1 className="text-base font-semibold text-foreground">Incident Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => navigate('/release/incidents')}
          >
            View All Incidents
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Core Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {coreWidgets.map((widget) => (
            <StatCard 
              key={widget.id} 
              widget={widget} 
              onClick={() => handleWidgetClick(widget.id)} 
            />
          ))}
        </div>

        {/* SLA Breaches Row */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-border"
            onClick={() => handleWidgetClick('response_sla')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Response SLA Breaches</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{metrics.responseSlaBreaches}</p>
                </div>
                <div className="p-2 rounded-lg bg-orange-100">
                  <Timer className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-border"
            onClick={() => handleWidgetClick('resolution_sla')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resolution SLA Breaches</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{metrics.resolutionSlaBreaches}</p>
                </div>
                <div className="p-2 rounded-lg bg-red-100">
                  <TimerOff className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribution Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Support Level Distribution */}
          <DistributionCard
            title="Support Level Distribution"
            data={supportLevelData}
            onItemClick={handleSupportLevelClick}
          />

          {/* Workgroup Distribution */}
          <DistributionCard
            title="Workgroup Distribution"
            data={workgroupData}
            onItemClick={handleWorkgroupClick}
          />

          {/* Aging Buckets */}
          <AgingBucketsCard
            data={metrics.agingBuckets}
            onBucketClick={handleAgingClick}
          />

          {/* Delivery Stage Distribution */}
          <DistributionCard
            title="Delivery Stage"
            data={deliveryStageData}
            onItemClick={handleDeliveryStageClick}
          />
        </div>

        {/* Conversion & Governance Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Conversion Analytics */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Conversion Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SmallStatCard
                title="Converted to Story"
                value={metrics.convertedToStory}
                icon={FileText}
                color="text-blue-600"
                onClick={() => handleConversionClick('Story')}
              />
              <SmallStatCard
                title="Converted to Feature"
                value={metrics.convertedToFeature}
                icon={FileText}
                color="text-purple-600"
                onClick={() => handleConversionClick('Feature')}
              />
              <SmallStatCard
                title="Converted to Epic"
                value={metrics.convertedToEpic}
                icon={FileText}
                color="text-orange-600"
                onClick={() => handleConversionClick('Epic')}
              />
            </CardContent>
          </Card>

          {/* Committee Governance Insights */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Committee Governance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SmallStatCard
                title="Pending CAP Approvals"
                value={metrics.pendingApprovals}
                icon={Clock}
                color="text-yellow-600"
                onClick={() => handleGovernanceClick('pending')}
              />
              <SmallStatCard
                title="Approved Today"
                value={metrics.approvedToday}
                icon={Vote}
                color="text-green-600"
                onClick={() => handleGovernanceClick('approved')}
              />
              <SmallStatCard
                title="Vetoed Decisions"
                value={metrics.vetoedDecisions}
                icon={Ban}
                color="text-red-600"
                onClick={() => handleGovernanceClick('vetoed')}
              />
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-blue-100">
                    <Timer className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Avg. Approval Time</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{metrics.avgApprovalTimeHours}h</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Business Process & Reports Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By Business Process */}
          <DistributionCard
            title="By Business Process"
            data={metrics.byBusinessProcess}
            onItemClick={handleBusinessProcessClick}
          />

          {/* Reports Section */}
          <ReportsSection 
            incidents={incidents} 
            onExport={handleExportReport}
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
