/**
 * TEST REPORTS PAGE
 * Executive reporting hub with configurable dashboards, 
 * trend analysis, and scheduled report generation
 */

import React, { useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Users, LayoutDashboard } from 'lucide-react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Download,
  Calendar,
  FileText,
  AlertTriangle,
  Target,
  Bug,
  Clock,
  ChevronRight,
  Loader2,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Share2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { exportToCSV } from '@/lib/exportUtils';
import { jsPDF } from 'jspdf';
import { UserActivityReport } from '../components/UserActivityReport';
import { DashboardBuilder } from '../components/reports/DashboardBuilder';
import {
  ExecutionOverviewGadget,
  DefectSummaryGadget,
  TraceabilitySummaryGadget,
  ExecutionDistributionGadget,
  BurnupGadget,
  UserActivityGadget,
  ProjectActivityGadget,
  TraceabilityDetailGadget,
} from '../components/reports/ReportGadgets';

export function TestsReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const programId = searchParams.get('programId') || projectId || '';
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [dateRange, setDateRange] = useState<'7' | '14' | '30'>('14');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch pass rate trend data
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['test-pass-rate-trend', projectId, dateRange],
    queryFn: async () => {
      if (!projectId) return [];
      
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days));
      
      // Get all executions in date range
      const { data: executions } = await supabase
        .from('test_cycle_executions')
        .select(`
          id, status, executed_at,
          test_cycle:test_cycles(id, project_id)
        `)
        .gte('executed_at', startDate.toISOString())
        .order('executed_at');
      
      // Filter by project
      const projectExecs = (executions || []).filter(
        (e: any) => e.test_cycle?.project_id === projectId
      );
      
      // Group by day
      const dayInterval = eachDayOfInterval({
        start: startDate,
        end: new Date(),
      });
      
      return dayInterval.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayExecs = projectExecs.filter((e: any) => 
          e.executed_at && format(new Date(e.executed_at), 'yyyy-MM-dd') === dayStr
        );
        
        const total = dayExecs.length;
        const passed = dayExecs.filter((e: any) => e.status === 'passed').length;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : null;
        
        return {
          date: format(day, 'MMM d'),
          passRate,
          total,
          passed,
        };
      });
    },
    enabled: !!projectId,
  });

  // Fetch failure hotspots (top failing features/stories)
  const { data: failureHotspots, isLoading: hotspotsLoading } = useQuery({
    queryKey: ['test-failure-hotspots', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data: failures } = await supabase
        .from('test_cycle_executions')
        .select(`
          id, status,
          test_case:test_cases(
            id, title,
            linked_feature_id, linked_story_id
          ),
          test_cycle:test_cycles(id, project_id)
        `)
        .eq('status', 'failed');
      
      // Filter by project and aggregate by feature
      const projectFailures = (failures || []).filter(
        (e: any) => e.test_cycle?.project_id === projectId
      );
      
      // Group by linked feature
      const featureFailures = new Map<string, { id: string; title: string; count: number }>();
      
      projectFailures.forEach((f: any) => {
        const featureId = f.test_case?.linked_feature_id;
        const title = f.test_case?.title || 'Unlinked Tests';
        const key = featureId || 'unlinked';
        
        if (featureFailures.has(key)) {
          featureFailures.get(key)!.count++;
        } else {
          featureFailures.set(key, { id: key, title, count: 1 });
        }
      });
      
      return Array.from(featureFailures.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
    enabled: !!projectId,
  });

  // Fetch risk indicators (release blockers)
  const { data: riskData, isLoading: risksLoading } = useQuery({
    queryKey: ['test-risk-indicators', projectId],
    queryFn: async () => {
      if (!projectId) return { criticalFailures: 0, blockedTests: 0, defectDensity: 0, risks: [] };
      
      // Get failed critical tests
      const { data: criticalFailures } = await supabase
        .from('test_cycle_executions')
        .select(`
          id, status,
          test_case:test_cases(id, priority),
          test_cycle:test_cycles(id, project_id)
        `)
        .eq('status', 'failed');
      
      const projectCritical = (criticalFailures || []).filter(
        (e: any) => e.test_cycle?.project_id === projectId && 
                    (e.test_case?.priority === 'critical' || e.test_case?.priority === 'high')
      );
      
      // Get blocked tests
      const { data: blocked } = await supabase
        .from('test_cycle_executions')
        .select(`id, test_cycle:test_cycles(id, project_id)`)
        .eq('status', 'blocked');
      
      const projectBlocked = (blocked || []).filter(
        (e: any) => e.test_cycle?.project_id === projectId
      );
      
      // Get defect count linked to project
      const { data: defects } = await supabase
        .from('defects')
        .select('id')
        .eq('project_id', projectId)
        .in('workflow_status', ['open', 'in_progress']);
      
      // Build risk list
      const risks: { id: string; type: string; severity: string; message: string; count: number }[] = [];
      
      if (projectCritical.length > 0) {
        risks.push({
          id: 'critical-failures',
          type: 'failure',
          severity: 'high',
          message: 'Critical/High priority test failures',
          count: projectCritical.length,
        });
      }
      
      if (projectBlocked.length > 5) {
        risks.push({
          id: 'blocked-tests',
          type: 'blocked',
          severity: 'medium',
          message: 'Tests blocked - environment or dependency issues',
          count: projectBlocked.length,
        });
      }
      
      if ((defects?.length || 0) > 10) {
        risks.push({
          id: 'defect-density',
          type: 'defects',
          severity: 'high',
          message: 'High open defect count',
          count: defects?.length || 0,
        });
      }
      
      return {
        criticalFailures: projectCritical.length,
        blockedTests: projectBlocked.length,
        defectDensity: defects?.length || 0,
        risks,
      };
    },
    enabled: !!projectId,
  });

  // Fetch overall summary for report
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['test-report-summary', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const { data: executions } = await supabase
        .from('test_cycle_executions')
        .select(`
          id, status,
          test_cycle:test_cycles(id, project_id)
        `);
      
      const projectExecs = (executions || []).filter(
        (e: any) => e.test_cycle?.project_id === projectId
      );
      
      const total = projectExecs.length;
      const passed = projectExecs.filter((e: any) => e.status === 'passed').length;
      const failed = projectExecs.filter((e: any) => e.status === 'failed').length;
      const blocked = projectExecs.filter((e: any) => e.status === 'blocked').length;
      const notRun = total - passed - failed - blocked;
      
      return {
        total,
        passed,
        failed,
        blocked,
        notRun,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      };
    },
    enabled: !!projectId,
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (reportType: 'daily' | 'weekly') => {
      if (!user || !projectId) throw new Error('Not authenticated');
      
      const config = {
        type: reportType,
        dateRange,
        generatedAt: new Date().toISOString(),
        summary,
        trendData,
        failureHotspots,
        riskData,
      };
      
      const { data, error } = await supabase
        .from('test_reports')
        .insert({
          report_type: reportType,
          program_id: projectId, // Using project_id as program_id
          config,
          generated_by: user.id,
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      
      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'report_generated',
        entity_type: 'test_report',
        entity_id: data.id,
        entity_title: `${reportType} Report`,
        description: `Generated ${reportType} test report`,
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-reports', projectId] });
      toast.success(`Report generated successfully`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (!summary || !trendData) return;
    
    const reportData = [
      { metric: 'Total Executions', value: summary.total },
      { metric: 'Passed', value: summary.passed },
      { metric: 'Failed', value: summary.failed },
      { metric: 'Blocked', value: summary.blocked },
      { metric: 'Not Run', value: summary.notRun },
      { metric: 'Pass Rate', value: `${summary.passRate}%` },
      { metric: 'Critical Failures', value: riskData?.criticalFailures || 0 },
      { metric: 'Open Defects', value: riskData?.defectDensity || 0 },
    ];
    
    exportToCSV(reportData, `test-report-${format(new Date(), 'yyyy-MM-dd')}`, ['metric', 'value']);
    toast.success('Report exported to CSV');
  };

  // Export to PDF
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;
      
      // Title
      doc.setFontSize(18);
      doc.text('Test Execution Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      // Summary section
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Execution Summary', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      const summaryLines = [
        `Total Executions: ${summary?.total || 0}`,
        `Passed: ${summary?.passed || 0}`,
        `Failed: ${summary?.failed || 0}`,
        `Blocked: ${summary?.blocked || 0}`,
        `Pass Rate: ${summary?.passRate || 0}%`,
      ];
      
      summaryLines.forEach(line => {
        doc.text(line, 25, yPos);
        yPos += 7;
      });
      
      yPos += 10;
      
      // Risk indicators
      doc.setFontSize(14);
      doc.text('Risk Indicators', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      const riskLines = [
        `Critical/High Failures: ${riskData?.criticalFailures || 0}`,
        `Blocked Tests: ${riskData?.blockedTests || 0}`,
        `Open Defects: ${riskData?.defectDensity || 0}`,
      ];
      
      riskLines.forEach(line => {
        doc.text(line, 25, yPos);
        yPos += 7;
      });
      
      // Save
      doc.save(`test-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Report exported to PDF');
    } catch (error) {
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const navigateToExecutions = (filter?: string) => {
    const base = `/projects/${projectId}/tests/executions`;
    navigate(filter ? `${base}?status=${filter}` : base);
  };

  const isLoading = trendLoading || hotspotsLoading || risksLoading || summaryLoading;

  return (
    <div className="space-y-6 max-w-7xl mx-auto" ref={reportRef}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Test Reports</h2>
          <p className="text-sm text-text-tertiary">Command Center & Analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as '7' | '14' | '30')}>
            <SelectTrigger className="w-[140px] bg-surface-2 border-border-default">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-1 border-border-default">
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="14">Last 14 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-surface-2 border border-border-default">
          <TabsTrigger value="dashboard">Command Center</TabsTrigger>
          <TabsTrigger value="custom-dashboards" className="flex items-center gap-1">
            <LayoutDashboard className="h-4 w-4" />
            Custom Dashboards
          </TabsTrigger>
          <TabsTrigger value="user-activity" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            User Activity
          </TabsTrigger>
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Report</TabsTrigger>
        </TabsList>

        {/* Command Center Tab */}
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card 
              className="bg-surface-2 border-border-default cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => navigateToExecutions()}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-tertiary">Total Executions</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">
                      {summaryLoading ? <Skeleton className="h-8 w-16" /> : summary?.total || 0}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-accent-primary/50" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-surface-2 border-border-default cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => navigateToExecutions('passed')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-tertiary">Pass Rate</p>
                    <p className={cn(
                      'text-2xl font-bold mt-1',
                      (summary?.passRate || 0) >= 80 ? 'text-status-success' :
                      (summary?.passRate || 0) >= 50 ? 'text-status-warning' : 'text-status-error'
                    )}>
                      {summaryLoading ? <Skeleton className="h-8 w-16" /> : `${summary?.passRate || 0}%`}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-status-success/50" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-surface-2 border-border-default cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => navigateToExecutions('failed')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-tertiary">Failed</p>
                    <p className="text-2xl font-bold text-status-error mt-1">
                      {summaryLoading ? <Skeleton className="h-8 w-16" /> : summary?.failed || 0}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-status-error/50" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-surface-2 border-border-default cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => navigateToExecutions('blocked')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-tertiary">Blocked</p>
                    <p className="text-2xl font-bold text-status-warning mt-1">
                      {summaryLoading ? <Skeleton className="h-8 w-16" /> : summary?.blocked || 0}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-status-warning/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pass Rate Trend */}
            <Card className="bg-surface-2 border-border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-text-primary flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-status-success" />
                  Pass Rate Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData?.filter(d => d.passRate !== null) || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: 'hsl(var(--text-tertiary))', fontSize: 11 }}
                        axisLine={{ stroke: 'hsl(var(--border-default))' }}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tick={{ fill: 'hsl(var(--text-tertiary))', fontSize: 11 }}
                        axisLine={{ stroke: 'hsl(var(--border-default))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--surface-1))', 
                          border: '1px solid hsl(var(--border-default))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--text-primary))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="passRate" 
                        stroke="hsl(var(--status-success))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--status-success))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Failure Hotspots */}
            <Card className="bg-surface-2 border-border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-text-primary flex items-center gap-2">
                  <Bug className="h-4 w-4 text-status-error" />
                  Failure Hotspots
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hotspotsLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : failureHotspots?.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-text-tertiary">
                    <div className="text-center">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-status-success" />
                      <p className="text-sm">No failure hotspots detected</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={failureHotspots} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--text-tertiary))', fontSize: 11 }} />
                      <YAxis 
                        type="category" 
                        dataKey="title" 
                        width={120}
                        tick={{ fill: 'hsl(var(--text-tertiary))', fontSize: 11 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--surface-1))', 
                          border: '1px solid hsl(var(--border-default))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {failureHotspots?.map((_, index) => (
                          <Cell key={`cell-${index}`} fill="hsl(var(--status-error))" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Risk Indicators */}
          <Card className="bg-surface-2 border-border-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-text-primary flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-status-warning" />
                Release Readiness Risks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {risksLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : riskData?.risks.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-status-success mb-3" />
                  <h3 className="text-lg font-medium text-text-primary">All Clear</h3>
                  <p className="text-text-secondary text-sm">No release blockers detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {riskData?.risks.map((risk) => (
                    <div 
                      key={risk.id}
                      className="flex items-center gap-3 p-3 bg-surface-3 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
                      onClick={() => {
                        if (risk.type === 'failure') navigateToExecutions('failed');
                        else if (risk.type === 'blocked') navigateToExecutions('blocked');
                        else navigate(`/projects/${projectId}/defects`);
                      }}
                    >
                      <div className={cn(
                        'p-2 rounded-lg',
                        risk.severity === 'high' ? 'bg-status-error/10' : 'bg-status-warning/10'
                      )}>
                        {risk.type === 'failure' && <XCircle className={cn(
                          'h-5 w-5',
                          risk.severity === 'high' ? 'text-status-error' : 'text-status-warning'
                        )} />}
                        {risk.type === 'blocked' && <Clock className="h-5 w-5 text-status-warning" />}
                        {risk.type === 'defects' && <Bug className="h-5 w-5 text-status-error" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-text-primary font-medium">{risk.message}</p>
                        <p className="text-xs text-text-tertiary">{risk.count} items</p>
                      </div>
                      <Badge className={cn(
                        'text-xs',
                        risk.severity === 'high' 
                          ? 'bg-status-error/10 text-status-error' 
                          : 'bg-status-warning/10 text-status-warning'
                      )}>
                        {risk.severity}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-text-tertiary" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Report Tab */}
        <TabsContent value="daily" className="space-y-6 mt-6">
          <Card className="bg-surface-2 border-border-default">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-accent-primary" />
                  Daily Test Report
                </span>
                <Button 
                  onClick={() => generateReportMutation.mutate('daily')}
                  disabled={generateReportMutation.isPending}
                >
                  {generateReportMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4 mr-2" />
                  )}
                  Generate Report
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Today's Summary */}
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-3">Today's Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface-3 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-text-primary">{summary?.total || 0}</p>
                    <p className="text-xs text-text-tertiary">Total Executed</p>
                  </div>
                  <div className="bg-surface-3 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-status-success">{summary?.passed || 0}</p>
                    <p className="text-xs text-text-tertiary">Passed</p>
                  </div>
                  <div className="bg-surface-3 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-status-error">{summary?.failed || 0}</p>
                    <p className="text-xs text-text-tertiary">Failed</p>
                  </div>
                  <div className="bg-surface-3 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-accent-primary">{summary?.passRate || 0}%</p>
                    <p className="text-xs text-text-tertiary">Pass Rate</p>
                  </div>
                </div>
              </div>

              {/* Risk Summary */}
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-3">Risk Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-status-error/10 rounded-lg p-3">
                    <p className="text-lg font-bold text-status-error">{riskData?.criticalFailures || 0}</p>
                    <p className="text-xs text-text-secondary">Critical Failures</p>
                  </div>
                  <div className="bg-status-warning/10 rounded-lg p-3">
                    <p className="text-lg font-bold text-status-warning">{riskData?.blockedTests || 0}</p>
                    <p className="text-xs text-text-secondary">Blocked Tests</p>
                  </div>
                  <div className="bg-accent-subtle rounded-lg p-3">
                    <p className="text-lg font-bold text-accent-primary">{riskData?.defectDensity || 0}</p>
                    <p className="text-xs text-text-secondary">Open Defects</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly Report Tab */}
        <TabsContent value="weekly" className="space-y-6 mt-6">
          <Card className="bg-surface-2 border-border-default">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-accent-primary" />
                  Weekly Test Report
                </span>
                <Button 
                  onClick={() => generateReportMutation.mutate('weekly')}
                  disabled={generateReportMutation.isPending}
                >
                  {generateReportMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4 mr-2" />
                  )}
                  Generate Report
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Weekly Trend */}
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-3">Weekly Pass Rate Trend</h4>
                {trendLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData?.filter(d => d.passRate !== null) || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: 'hsl(var(--text-tertiary))', fontSize: 11 }}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tick={{ fill: 'hsl(var(--text-tertiary))', fontSize: 11 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--surface-1))', 
                          border: '1px solid hsl(var(--border-default))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="passRate" 
                        stroke="hsl(var(--status-success))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--status-success))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Weekly Summary Stats */}
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-3">Weekly Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-surface-3 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-text-primary">{summary?.total || 0}</p>
                    <p className="text-xs text-text-tertiary">Total</p>
                  </div>
                  <div className="bg-surface-3 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-status-success">{summary?.passed || 0}</p>
                    <p className="text-xs text-text-tertiary">Passed</p>
                  </div>
                  <div className="bg-surface-3 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-status-error">{summary?.failed || 0}</p>
                    <p className="text-xs text-text-tertiary">Failed</p>
                  </div>
                  <div className="bg-surface-3 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-status-warning">{summary?.blocked || 0}</p>
                    <p className="text-xs text-text-tertiary">Blocked</p>
                  </div>
                  <div className="bg-surface-3 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-text-tertiary">{summary?.notRun || 0}</p>
                    <p className="text-xs text-text-tertiary">Not Run</p>
                  </div>
                </div>
              </div>

              {/* Top Failure Areas */}
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-3">Top Failure Areas</h4>
                {failureHotspots?.length === 0 ? (
                  <p className="text-text-tertiary text-sm py-4 text-center">No failures this week</p>
                ) : (
                  <div className="space-y-2">
                    {failureHotspots?.slice(0, 3).map((item, idx) => (
                      <div 
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-surface-3 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
                        onClick={() => navigateToExecutions('failed')}
                      >
                        <span className="text-lg font-bold text-text-tertiary">#{idx + 1}</span>
                        <div className="flex-1">
                          <p className="text-text-primary font-medium truncate">{item.title}</p>
                        </div>
                        <Badge variant="outline" className="text-status-error border-status-error/20">
                          {item.count} failures
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-text-tertiary" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Dashboards Tab */}
        <TabsContent value="custom-dashboards" className="mt-6">
          <DashboardBuilder projectId={projectId || ''} programId={programId} />
        </TabsContent>

        {/* User Activity Tab */}
        <TabsContent value="user-activity" className="mt-6">
          <UserActivityReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
