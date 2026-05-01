/**
 * Command Center - Executive Dashboard
 * Based on 9.8 Specification
 * 
 * Features:
 * - KPI Overview with trend indicators (clickable to filter)
 * - Release Health cards with progress rings
 * - Test Progress stacked bar chart
 * - Defect Trends line chart
 * - Quality Gates status (clickable)
 * - Activity Feed (clickable items)
 * - Team Performance
 * - Upcoming Milestones
 * - Auto-refresh (2 min default)
 * - Export: PDF, CSV, Excel
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  RefreshCw, Download, ChevronDown, Settings,
  TestTube2, CheckCircle2, Bug, AlertTriangle,
  TrendingUp, TrendingDown, Minus,
  Calendar, Clock, User, MessageSquare,
  Shield, Target, Users, Flag, FileText, FileSpreadsheet, Table2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lozenge, Tooltip as UITooltip } from '@/components/ads';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { catalystToast } from '@/lib/catalystToast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Area, AreaChart
} from 'recharts';
import { useQueryClient } from '@tanstack/react-query';

// Export utilities
import { exportToExcel, exportToCsv, exportToPdf } from '@/utils/exports';
import type { ExportColumn } from '@/utils/exports/types';
import { downloadDocumentation } from '@/utils/releaseModuleDocumentation';
import { downloadFeatureTree } from '@/utils/releaseModuleFeatureTree';
import { downloadCompleteSpec } from '@/utils/releaseModuleCompleteSpec';

// Import real data hooks
import {
  useCommandCenterKPIs,
  useReleaseHealth,
  useDefectTrends,
  useQualityGates,
  useTestProgress,
  useTeamPerformance,
  useActivities,
  useMilestones,
} from '@/modules/command-center/hooks';

import type { 
  KPIMetric, 
  ReleaseHealthData, 
  QualityGate, 
  TeamMemberPerformance, 
  ActivityItem as ActivityItemType, 
  Milestone,
  KPIColor,
  AvatarColor,
  ActivityType,
  MilestoneUrgency,
} from '@/modules/command-center/types';

// MOCK DATA REMOVED - Using live hooks from @/modules/command-center/hooks
// All data now comes from: useCommandCenterKPIs, useReleaseHealth, useDefectTrends,
// useQualityGates, useTestProgress, useTeamPerformance, useActivities, useMilestones

// ============================================
// HELPER COMPONENTS
// ============================================

// KPI Card with click handler and tooltip
function KPICard({ 
  kpi, 
  index, 
  onClick 
}: { 
  kpi: Omit<KPIMetric, 'icon'> & { icon: React.ComponentType<any> }; 
  index: number;
  onClick?: () => void;
}) {
  const colorMap = {
    primary: { border: CATALYST_V5.primary, bg: CATALYST_V5.primaryLighter, icon: CATALYST_V5.primary },
    teal: { border: CATALYST_V5.teal, bg: CATALYST_V5.tealLighter, icon: CATALYST_V5.teal },
    warning: { border: CATALYST_V5.warning, bg: CATALYST_V5.warningLighter, icon: CATALYST_V5.warning },
    danger: { border: CATALYST_V5.danger, bg: CATALYST_V5.dangerLighter, icon: CATALYST_V5.danger },
  };
  
  const colors = colorMap[kpi.color];
  const Icon = kpi.icon;
  const TrendIcon = kpi.trend.direction === 'up' ? TrendingUp : kpi.trend.direction === 'down' ? TrendingDown : Minus;
  
  // Determine trend tooltip text
  const trendLabel = kpi.trend.direction === 'up' ? 'increased' : kpi.trend.direction === 'down' ? 'decreased' : 'unchanged';
  const trendTooltip = `${kpi.trend.percentage}% ${trendLabel} from last period`;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "relative bg-card border rounded-xl p-5 overflow-hidden transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/30"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${kpi.label}: ${kpi.formattedValue}. ${trendTooltip}`}
    >
      {/* Top color accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: colors.border }}
      />

      <div className="flex items-start justify-between">
        <div
          className="w-11 h-11 rounded-[10px] flex items-center justify-center"
          style={{ backgroundColor: colors.bg }}
        >
          <Icon className="w-5 h-5" style={{ color: colors.icon }} />
        </div>

        <UITooltip position="top" content={trendTooltip}>
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md cursor-help",
              kpi.trend.isPositive
                ? "bg-[#f0fdfa] text-[#0d9488]"
                : "bg-[var(--ds-background-danger,#fef2f2)] text-[var(--ds-text-danger,#ef4444)]"
            )}
          >
            <TrendIcon className="w-3 h-3" />
            {kpi.trend.percentage}%
          </div>
        </UITooltip>
      </div>

      <div className="mt-4">
        <div className="text-[32px] font-bold text-foreground leading-none mb-1">
          {kpi.formattedValue}
        </div>
        <div className="text-[13px] text-muted-foreground">{kpi.label}</div>
      </div>

      {onClick && (
        <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/60">
          Click to filter
        </div>
      )}
    </motion.div>
  );
}

// Progress Ring for Release Health
function ProgressRing({ percentage, status, size = 48 }: { percentage: number; status: 'healthy' | 'at-risk' | 'critical'; size?: number }) {
  const colorMap = {
    healthy: CATALYST_V5.teal,
    'at-risk': CATALYST_V5.warning,
    critical: CATALYST_V5.danger,
  };
  const color = colorMap[status];
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--ds-border, #e2e8f0)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div 
        className="absolute inset-0 flex items-center justify-center text-xs font-bold"
        style={{ color }}
      >
        {percentage}%
      </div>
    </div>
  );
}

// Release Health Item
function ReleaseHealthItem({ release, onClick }: { release: ReleaseHealthData; onClick: () => void }) {
  return (
    <div 
      className="flex items-center gap-4 p-4 bg-muted/50 rounded-[10px] cursor-pointer hover:bg-muted/80 transition-colors"
      onClick={onClick}
    >
      <ProgressRing percentage={release.passRate} status={release.healthStatus} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground truncate">{release.name}</span>
          <Lozenge appearance="default">{release.version}</Lozenge>
        </div>
        <div className="text-xs text-muted-foreground">{release.product} • {release.sprint}</div>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[#f0fdfa] text-[#0d9488]">
          {release.passed} Passed
        </span>
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[var(--ds-background-danger,#fef2f2)] text-[var(--ds-text-danger,#ef4444)]">
          {release.failed} Failed
        </span>
        {release.blocked > 0 && (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[#fef3c7] text-[var(--ds-text-warning,#d97706)]">
            {release.blocked} Blocked
          </span>
        )}
      </div>
    </div>
  );
}

// Quality Gate Item - Clickable
function QualityGateItem({ gate, onClick }: { gate: QualityGate; onClick?: () => void }) {
  const statusConfig = {
    passed: { bg: 'bg-[#f0fdfa]', text: 'text-[#0d9488]', icon: CheckCircle2 },
    warning: { bg: 'bg-[#fef3c7]', text: 'text-[var(--ds-text-warning,#d97706)]', icon: AlertTriangle },
    failed: { bg: 'bg-[var(--ds-background-danger,#fef2f2)]', text: 'text-[var(--ds-text-danger,#ef4444)]', icon: AlertTriangle },
  };
  const config = statusConfig[gate.status];
  const Icon = config.icon;
  
  return (
    <UITooltip
      position="left"
      content={`${gate.status === 'passed' ? 'Gate passing' : gate.status === 'warning' ? 'Gate at risk' : 'Gate failing'} — Click to view details`}
    >
      <div
        className={cn(
          "flex items-center gap-3 p-3 bg-muted/50 rounded-lg transition-colors",
          onClick && "cursor-pointer hover:bg-muted/80"
        )}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
          <Icon className={cn('w-4 h-4', config.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">{gate.name}</div>
          <div className="text-xs text-muted-foreground">{gate.threshold}</div>
        </div>
        <div className={cn('text-sm font-semibold', config.text)}>{gate.currentValue}</div>
      </div>
    </UITooltip>
  );
}

// Activity Item - Clickable
function ActivityItem({ activity, onSubjectClick }: { activity: ActivityItemType; onSubjectClick?: (activity: ActivityItemType) => void }) {
  const typeConfig = {
    passed: { bg: 'bg-[#f0fdfa]', text: 'text-[#0d9488]', icon: CheckCircle2 },
    failed: { bg: 'bg-[var(--ds-background-danger,#fef2f2)]', text: 'text-[var(--ds-text-danger,#ef4444)]', icon: AlertTriangle },
    defect: { bg: 'bg-[#fef3c7]', text: 'text-[var(--ds-text-warning,#d97706)]', icon: Bug },
    comment: { bg: 'bg-[var(--ds-background-selected,#eff6ff)]', text: 'text-[var(--ds-text-brand,#2563eb)]', icon: MessageSquare },
  };
  const config = typeConfig[activity.type];
  const Icon = config.icon;
  
  return (
    <div className="flex gap-3 py-3.5 border-b border-border last:border-0">
      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', config.bg)}>
        <Icon className={cn('w-4 h-4', config.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-foreground leading-relaxed">
          <span className="font-semibold">{activity.user}</span>
          {' '}{activity.action}{' '}
          <UITooltip position="top" content={activity.title}>
            <button
              className="text-primary font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
              onClick={() => onSubjectClick?.(activity)}
            >
              {activity.subject}
            </button>
          </UITooltip>
        </div>
        <div className="text-xs text-muted-foreground truncate" title={activity.title}>{activity.title}</div>
        <div className="text-[11px] text-muted-foreground/70 mt-1">{activity.time}</div>
      </div>
    </div>
  );
}

// Team Member Item
function TeamMemberItem({ member }: { member: TeamMemberPerformance }) {
  const colorMap = {
    blue: CATALYST_V5.primary,
    teal: CATALYST_V5.teal,
    purple: '#8b5cf6',
    orange: CATALYST_V5.warning,
  };
  
  return (
    <div className="flex items-center gap-3 py-2">
      <div 
        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold"
        style={{ backgroundColor: colorMap[member.color] }}
      >
        {member.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{member.name}</div>
        <div className="text-xs text-muted-foreground">{member.role}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-foreground">{member.testsToday} tests</div>
        <div className="text-xs text-muted-foreground">{member.passRate}% pass</div>
      </div>
    </div>
  );
}

// Milestone Item
function MilestoneItem({ milestone }: { milestone: Milestone }) {
  const urgencyConfig: Record<string, { border: string; text: string }> = {
    normal: { border: CATALYST_V5.primary, text: 'text-foreground' },
    warning: { border: CATALYST_V5.warning, text: 'text-[var(--ds-text-warning,#d97706)]' },
    danger: { border: CATALYST_V5.danger, text: 'text-[var(--ds-text-danger,#ef4444)]' },
  };
  const config = urgencyConfig[milestone.urgency] ?? urgencyConfig.normal;
  const date = new Date(milestone.dueDate);
  
  return (
    <div 
      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
      style={{ borderLeft: `3px solid ${config.border}` }}
    >
      <div className="text-center px-3 py-2 bg-card rounded-md min-w-[48px]">
        <div className="text-lg font-bold text-foreground">{date.getDate()}</div>
        <div className="text-[10px] font-semibold text-muted-foreground uppercase">
          {date.toLocaleString('default', { month: 'short' })}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{milestone.title}</div>
        <div className="text-xs text-muted-foreground">{milestone.related}</div>
      </div>
      <div className={cn('text-xs font-semibold', config.text)}>
        {milestone.daysRemaining === 1 ? 'Tomorrow' : 
         milestone.daysRemaining < 0 ? 'Overdue' : 
         `${milestone.daysRemaining} days`}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function CommandCenterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  // Real data hooks
  const { data: kpis, isLoading: kpisLoading, refetch: refetchKpis } = useCommandCenterKPIs();
  const { data: releases, isLoading: releasesLoading, refetch: refetchReleases } = useReleaseHealth(5);
  const { data: defectTrends, isLoading: defectsLoading, refetch: refetchDefects } = useDefectTrends('30d');
  const { data: qualityGates, isLoading: gatesLoading, refetch: refetchGates } = useQualityGates();
  const { data: testProgress, isLoading: progressLoading, refetch: refetchProgress } = useTestProgress(6);
  const { data: teamPerformance, isLoading: teamLoading, refetch: refetchTeam } = useTeamPerformance(5);
  const { data: activities, isLoading: activitiesLoading, refetch: refetchActivities } = useActivities(10);
  const { data: milestones, isLoading: milestonesLoading, refetch: refetchMilestones } = useMilestones(4);

  const isLoading = kpisLoading || releasesLoading;
  
  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 120000);
    return () => clearInterval(interval);
  }, []);
  
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchKpis(),
        refetchReleases(),
        refetchDefects(),
        refetchGates(),
        refetchProgress(),
        refetchTeam(),
        refetchActivities(),
        refetchMilestones(),
      ]);
      setLastUpdated(new Date());
      catalystToast.success('Dashboard refreshed');
    } catch (e) {
      catalystToast.error('Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchKpis, refetchReleases, refetchDefects, refetchGates, refetchProgress, refetchTeam, refetchActivities, refetchMilestones]);
  
  // Export handlers with real functionality
  const handleExportPdf = useCallback(async () => {
    const loadingId = catalystToast.loading('Generating PDF...');
    try {
      // Prepare KPI data for export
      const kpiData = (kpis || []).map(k => ({
        metric: k.label,
        value: k.formattedValue,
        trend: `${k.trend.direction === 'up' ? '↑' : k.trend.direction === 'down' ? '↓' : '→'} ${k.trend.percentage}%`,
        status: k.trend.isPositive ? 'Positive' : 'Negative',
      }));

      // Export KPIs to PDF
      const columns: ExportColumn<typeof kpiData[0]>[] = [
        { key: 'metric', header: 'Metric' },
        { key: 'value', header: 'Value' },
        { key: 'trend', header: 'Trend' },
        { key: 'status', header: 'Status' },
      ];

      await exportToPdf(kpiData, columns, {
        filename: 'command-center-report',
        title: 'Command Center Report',
        subtitle: `Generated on ${new Date().toLocaleString()}`,
        orientation: 'landscape',
        brandName: 'Catalyst Platform',
      });
      
      catalystToast.dismiss(loadingId);
      catalystToast.success('PDF exported successfully');
    } catch (error) {
      catalystToast.dismiss(loadingId);
      catalystToast.error('Failed to export PDF');
      console.error('PDF export error:', error);
    }
  }, [kpis]);

  const handleExportExcel = useCallback(() => {
    const loadingId = catalystToast.loading('Generating Excel...');
    try {
      const kpiData = (kpis || []).map(k => ({
        metric: k.label,
        value: k.formattedValue,
        trend: `${k.trend.percentage}%`,
        direction: k.trend.direction,
        status: k.trend.isPositive ? 'Positive' : 'Negative',
      }));
      
      const columns: ExportColumn<typeof kpiData[0]>[] = [
        { key: 'metric', header: 'Metric' },
        { key: 'value', header: 'Value' },
        { key: 'trend', header: 'Trend %' },
        { key: 'direction', header: 'Direction' },
        { key: 'status', header: 'Status' },
      ];

      exportToExcel(kpiData, columns, {
        filename: 'command-center-report',
        sheetName: 'KPIs',
        title: 'Command Center Report',
      });
      
      catalystToast.dismiss(loadingId);
      catalystToast.success('Excel exported successfully');
    } catch (error) {
      catalystToast.dismiss(loadingId);
      catalystToast.error('Failed to export Excel');
      console.error('Excel export error:', error);
    }
  }, [kpis]);

  const handleExportCsv = useCallback(() => {
    const loadingId = catalystToast.loading('Generating CSV...');
    try {
      const kpiData = (kpis || []).map(k => ({
        metric: k.label,
        value: k.formattedValue,
        trend: `${k.trend.percentage}%`,
        direction: k.trend.direction,
        status: k.trend.isPositive ? 'Positive' : 'Negative',
      }));
      
      const columns: ExportColumn<typeof kpiData[0]>[] = [
        { key: 'metric', header: 'Metric' },
        { key: 'value', header: 'Value' },
        { key: 'trend', header: 'Trend %' },
        { key: 'direction', header: 'Direction' },
        { key: 'status', header: 'Status' },
      ];

      exportToCsv(kpiData, columns, {
        filename: 'command-center-report',
      });
      
      catalystToast.dismiss(loadingId);
      catalystToast.success('CSV exported successfully');
    } catch (error) {
      catalystToast.dismiss(loadingId);
      catalystToast.error('Failed to export CSV');
      console.error('CSV export error:', error);
    }
  }, [kpis]);

  // KPI click handlers - navigate to filtered views
  const handleKpiClick = useCallback((kpiId: string) => {
    switch (kpiId) {
      case 'total_tests':
        navigate('/releases/test-cases');
        break;
      case 'pass_rate':
        navigate('/releases/test-cases?status=passed');
        break;
      case 'open_defects':
        navigate('/releases/defects?status=open');
        break;
      case 'blocked_tests':
        navigate('/releases/test-cases?status=blocked');
        break;
      default:
        break;
    }
  }, [navigate]);

  // Quality gate click handler
  const handleQualityGateClick = useCallback((gate: QualityGate) => {
    // Navigate to quality gates with the specific gate highlighted
    navigate(`/releases/quality-gates?highlight=${gate.id}`);
  }, [navigate]);

  // Activity item click handler
  const handleActivityClick = useCallback((activity: ActivityItemType) => {
    // Navigate based on activity type
    if (activity.type === 'defect') {
      navigate(`/releases/defects?search=${activity.subject}`);
    } else if (activity.type === 'passed' || activity.type === 'failed') {
      navigate(`/releases/test-cases?search=${activity.subject}`);
    } else {
      // For comments and other types, navigate to a general activity view
      navigate('/releases/activity');
    }
  }, [navigate]);
  
  const getTimeAgo = () => {
    const diffMs = Date.now() - lastUpdated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    return `${diffMins} min ago`;
  };

  // Derive KPI data with icons for display
  const displayKpis = (kpis || []).map(kpi => ({
    ...kpi,
    icon: kpi.id === 'total_tests' ? TestTube2 
        : kpi.id === 'pass_rate' ? CheckCircle2 
        : kpi.id === 'open_defects' ? Bug 
        : AlertTriangle,
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-xl col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" ref={dashboardRef} id="command-center-dashboard">
      {/* Page Header */}
      <CatalystPageHeader
        title="Command Center"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, color: 'var(--text-3, hsl(var(--muted-foreground)))' }}>
              Last updated: {getTimeAgo()}
            </span>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing} aria-label="Refresh data">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Export dashboard">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                  <ChevronDown className="h-3 w-3 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleExportPdf} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCsv} className="gap-2">
                  <Table2 className="h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  downloadFeatureTree('markdown');
                  catalystToast.success('Feature tree downloaded');
                }} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Feature Hierarchy Tree (.md)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  downloadDocumentation();
                  catalystToast.success('Documentation downloaded');
                }} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Module Documentation (.md)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  downloadCompleteSpec();
                  catalystToast.success('Complete specification downloaded');
                }} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Complete Technical Spec (.md)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      
      {/* Dashboard Content */}
      <div className="p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayKpis.map((kpi, i) => (
            <KPICard 
              key={kpi.id} 
              kpi={kpi} 
              index={i} 
              onClick={() => handleKpiClick(kpi.id)}
            />
          ))}
        </div>
        
        {/* Main Grid: 2fr : 1fr */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2fr) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Release Health */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Release Health</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-primary"
                    onClick={() => navigate('/releases')}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(releases || []).map(release => (
                  <ReleaseHealthItem 
                    key={release.id} 
                    release={release} 
                    onClick={() => navigate(`/releases/${release.id}/dashboard`)}
                  />
                ))}
              </CardContent>
            </Card>
            
            {/* Test Progress */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold">Test Progress by Sprint</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={testProgress || []} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border, #e2e8f0)" vertical={false} />
                      <XAxis 
                        dataKey="sprint" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: 'var(--ds-text-subtlest, #94a3b8)' }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: 'var(--ds-text-subtlest, #94a3b8)' }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(value: number, name: string) => [`${value}%`, name.charAt(0).toUpperCase() + name.slice(1)]}
                      />
                      <Bar dataKey="passed" stackId="a" fill={CATALYST_V5.teal} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="failed" stackId="a" fill={CATALYST_V5.danger} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="blocked" stackId="a" fill={CATALYST_V5.warning} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="notRun" stackId="a" fill="var(--ds-border, #e2e8f0)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CATALYST_V5.teal }} />
                    Passed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CATALYST_V5.danger }} />
                    Failed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CATALYST_V5.warning }} />
                    Blocked
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[var(--ds-border,#e2e8f0)]" />
                    Not Run
                  </span>
                </div>
              </CardContent>
            </Card>
            
            {/* Defect Trends */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Defect Trends (30 days)</CardTitle>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CATALYST_V5.danger }} />
                      Opened
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CATALYST_V5.teal }} />
                      Closed
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={defectTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border, #e2e8f0)" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: 'var(--ds-text-subtlest, #94a3b8)' }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: 'var(--ds-text-subtlest, #94a3b8)' }}
                      />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Area 
                        type="monotone" 
                        dataKey="opened" 
                        stroke={CATALYST_V5.danger} 
                        fill="rgba(239, 68, 68, 0.1)" 
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="closed" 
                        stroke={CATALYST_V5.teal} 
                        fill="rgba(13, 148, 136, 0.1)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column (1fr) */}
          <div className="space-y-6">
            {/* Quality Gates */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Quality Gates</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-primary"
                    onClick={() => navigate('/releases/quality-gates')}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(qualityGates || []).map(gate => (
                  <QualityGateItem 
                    key={gate.id} 
                    gate={gate} 
                    onClick={() => handleQualityGateClick(gate)}
                  />
                ))}
              </CardContent>
            </Card>
            
            {/* Activity Feed */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-primary"
                    onClick={() => navigate('/releases/activity')}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4">
                {(activities || []).map(activity => (
                  <ActivityItem 
                    key={activity.id} 
                    activity={activity} 
                    onSubjectClick={handleActivityClick}
                  />
                ))}
              </CardContent>
            </Card>
            
            {/* Team Performance */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold">Team Performance (Today)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {(teamPerformance || []).map(member => (
                  <TeamMemberItem key={member.id} member={member} />
                ))}
              </CardContent>
            </Card>
            
            {/* Upcoming Milestones */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold">Upcoming Milestones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(milestones || []).map(milestone => (
                  <MilestoneItem key={milestone.id} milestone={milestone} />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
