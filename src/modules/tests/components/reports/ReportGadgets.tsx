/**
 * Report Gadget Components
 * Individual gadgets for CIO-grade executive reporting
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Target,
  Bug,
  Link2,
  Users,
  Activity,
} from 'lucide-react';

interface GadgetProps {
  projectId: string;
  config?: {
    dateRange?: '7' | '14' | '30' | '90';
    cycleIds?: string[];
    showLegend?: boolean;
    compactMode?: boolean;
  };
  className?: string;
}

const STATUS_COLORS = {
  passed: 'hsl(142, 76%, 36%)',
  failed: 'hsl(0, 84%, 60%)',
  blocked: 'hsl(38, 92%, 50%)',
  skipped: 'hsl(215, 14%, 55%)',
  not_run: 'hsl(215, 14%, 75%)',
  in_progress: 'hsl(217, 91%, 60%)',
};

const PRIORITY_COLORS = {
  critical: 'hsl(0, 84%, 60%)',
  high: 'hsl(25, 95%, 53%)',
  medium: 'hsl(38, 92%, 50%)',
  low: 'hsl(142, 76%, 36%)',
};

// ==================== EXECUTION OVERVIEW ====================
export function ExecutionOverviewGadget({ projectId, config, className }: GadgetProps) {
  const dateRange = config?.dateRange || '14';

  const { data, isLoading } = useQuery({
    queryKey: ['gadget-execution-overview', projectId, dateRange],
    queryFn: async () => {
      const { data: executions } = await supabase
        .from('test_executions')
        .select(`
          id, status, execution_date,
          test_cycle:test_cycles(id, project_id)
        `)
        .not('status', 'is', null);

      const projectExecs = (executions || []).filter(
        (e: any) => e.test_cycle?.project_id === projectId
      );

      const total = projectExecs.length;
      const passed = projectExecs.filter((e: any) => e.status === 'passed').length;
      const failed = projectExecs.filter((e: any) => e.status === 'failed').length;
      const blocked = projectExecs.filter((e: any) => e.status === 'blocked').length;
      const inProgress = projectExecs.filter((e: any) => e.status === 'in_progress').length;
      const notRun = total - passed - failed - blocked - inProgress;

      return {
        total,
        passed,
        failed,
        blocked,
        inProgress,
        notRun,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
        executionRate: total > 0 ? Math.round(((passed + failed + blocked) / total) * 100) : 0,
      };
    },
    enabled: !!projectId,
  });

  if (isLoading) return <GadgetSkeleton className={className} />;

  return (
    <Card className={cn('bg-surface-2 border-border-default', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-accent-primary" />
          Execution Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-text-primary">{data?.passRate || 0}%</div>
            <div className="text-xs text-text-tertiary">Pass Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-text-primary">{data?.executionRate || 0}%</div>
            <div className="text-xs text-text-tertiary">Executed</div>
          </div>
        </div>
        <div className="space-y-2">
          <StatusBar label="Passed" count={data?.passed || 0} total={data?.total || 1} color="bg-status-success" />
          <StatusBar label="Failed" count={data?.failed || 0} total={data?.total || 1} color="bg-status-error" />
          <StatusBar label="Blocked" count={data?.blocked || 0} total={data?.total || 1} color="bg-status-warning" />
          <StatusBar label="Not Run" count={data?.notRun || 0} total={data?.total || 1} color="bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== DEFECT SUMMARY ====================
export function DefectSummaryGadget({ projectId, config, className }: GadgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['gadget-defect-summary', projectId],
    queryFn: async () => {
      const { data: defects } = await supabase
        .from('defects')
        .select('id, workflow_status, severity, priority, created_at')
        .eq('project_id', projectId);

      const all = defects || [];
      const open = all.filter(d => ['open', 'new', 'in_progress', 'reopened'].includes(d.workflow_status || ''));
      const critical = open.filter(d => d.severity === 'critical' || d.priority === 'critical');
      const high = open.filter(d => d.severity === 'high' || d.priority === 'high');
      const medium = open.filter(d => d.severity === 'medium' || d.priority === 'medium');
      const low = open.filter(d => d.severity === 'low' || d.priority === 'low');

      // Last 7 days trend
      const sevenDaysAgo = subDays(new Date(), 7);
      const recent = all.filter(d => new Date(d.created_at) >= sevenDaysAgo);

      return {
        total: all.length,
        open: open.length,
        critical: critical.length,
        high: high.length,
        medium: medium.length,
        low: low.length,
        newLast7Days: recent.length,
      };
    },
    enabled: !!projectId,
  });

  if (isLoading) return <GadgetSkeleton className={className} />;

  return (
    <Card className={cn('bg-surface-2 border-border-default', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bug className="h-4 w-4 text-status-error" />
          Defect Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-surface-3 rounded-lg">
            <div className="text-2xl font-bold text-status-error">{data?.open || 0}</div>
            <div className="text-xs text-text-tertiary">Open Defects</div>
          </div>
          <div className="text-center p-3 bg-surface-3 rounded-lg">
            <div className="text-2xl font-bold text-text-primary">{data?.newLast7Days || 0}</div>
            <div className="text-xs text-text-tertiary">New (7 days)</div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-status-error font-medium">Critical</span>
            <Badge variant="outline" className="bg-red-50 text-status-error border-red-200">{data?.critical || 0}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-orange-600 font-medium">High</span>
            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">{data?.high || 0}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-yellow-600 font-medium">Medium</span>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">{data?.medium || 0}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-green-600 font-medium">Low</span>
            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">{data?.low || 0}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== TRACEABILITY SUMMARY ====================
export function TraceabilitySummaryGadget({ projectId, config, className }: GadgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['gadget-traceability-summary', projectId],
    queryFn: async () => {
      // Get all stories for project
      const { data: features } = await supabase
        .from('features')
        .select('id')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      const featureIds = features?.map(f => f.id) || [];

      const { data: stories } = await supabase
        .from('stories')
        .select('id')
        .in('feature_id', featureIds.length > 0 ? featureIds : ['none'])
        .is('deleted_at', null);

      const storyIds = stories?.map(s => s.id) || [];

      // Get test case links
      const { data: links } = await supabase
        .from('test_case_work_item_links')
        .select('work_item_id')
        .in('work_item_id', storyIds.length > 0 ? storyIds : ['none']);

      const linkedStoryIds = new Set((links || []).map(l => l.work_item_id));
      const storiesWithCoverage = storyIds.filter(id => linkedStoryIds.has(id)).length;
      const storiesWithoutCoverage = storyIds.length - storiesWithCoverage;
      const coveragePercentage = storyIds.length > 0 
        ? Math.round((storiesWithCoverage / storyIds.length) * 100) 
        : 0;

      return {
        totalStories: storyIds.length,
        covered: storiesWithCoverage,
        uncovered: storiesWithoutCoverage,
        coveragePercentage,
      };
    },
    enabled: !!projectId,
  });

  if (isLoading) return <GadgetSkeleton className={className} />;

  return (
    <Card className={cn('bg-surface-2 border-border-default', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4 text-accent-primary" />
          Traceability Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-text-primary">{data?.coveragePercentage || 0}%</div>
          <div className="text-xs text-text-tertiary">Requirements Coverage</div>
        </div>
        <Progress value={data?.coveragePercentage || 0} className="h-2 mb-4" />
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-surface-3 rounded">
            <div className="font-bold text-text-primary">{data?.totalStories || 0}</div>
            <div className="text-text-tertiary">Total</div>
          </div>
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
            <div className="font-bold text-status-success">{data?.covered || 0}</div>
            <div className="text-text-tertiary">Covered</div>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
            <div className="font-bold text-status-error">{data?.uncovered || 0}</div>
            <div className="text-text-tertiary">Uncovered</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== EXECUTION DISTRIBUTION ====================
export function ExecutionDistributionGadget({ projectId, config, className }: GadgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['gadget-execution-distribution', projectId],
    queryFn: async () => {
      const { data: executions } = await supabase
        .from('test_executions')
        .select(`
          id, status,
          test_cycle:test_cycles(id, project_id)
        `)
        .not('status', 'is', null);

      const projectExecs = (executions || []).filter(
        (e: any) => e.test_cycle?.project_id === projectId
      );

      const statusCounts = projectExecs.reduce((acc: Record<string, number>, exec: any) => {
        const status = exec.status || 'not_run';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: count,
        color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.not_run,
      }));
    },
    enabled: !!projectId,
  });

  if (isLoading) return <GadgetSkeleton className={className} />;

  return (
    <Card className={cn('bg-surface-2 border-border-default', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent-primary" />
          Execution Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data || []}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {(data || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                background: 'hsl(var(--surface-1))', 
                border: '1px solid hsl(var(--border-default))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {(data || []).map((item, i) => (
            <div key={i} className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-text-secondary">{item.name}: {item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== BURNUP CHART ====================
export function BurnupGadget({ projectId, config, className }: GadgetProps) {
  const dateRange = config?.dateRange || '14';

  const { data, isLoading } = useQuery({
    queryKey: ['gadget-burnup', projectId, dateRange],
    queryFn: async () => {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days));

      const { data: executions } = await supabase
        .from('test_executions')
        .select(`
          id, status, execution_date,
          test_cycle:test_cycles(id, project_id)
        `)
        .gte('execution_date', startDate.toISOString())
        .not('execution_date', 'is', null)
        .order('execution_date');

      const projectExecs = (executions || []).filter(
        (e: any) => e.test_cycle?.project_id === projectId
      );

      const dayInterval = eachDayOfInterval({ start: startDate, end: new Date() });
      let cumulativePassed = 0;
      let cumulativeTotal = 0;

      return dayInterval.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayExecs = projectExecs.filter(
          (e: any) => e.execution_date && format(new Date(e.execution_date), 'yyyy-MM-dd') === dayStr
        );

        cumulativeTotal += dayExecs.length;
        cumulativePassed += dayExecs.filter((e: any) => e.status === 'passed').length;

        return {
          date: format(day, 'MMM d'),
          total: cumulativeTotal,
          passed: cumulativePassed,
        };
      });
    },
    enabled: !!projectId,
  });

  if (isLoading) return <GadgetSkeleton className={className} />;

  return (
    <Card className={cn('bg-surface-2 border-border-default', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-status-success" />
          Test Burnup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'hsl(var(--text-tertiary))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border-default))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--text-tertiary))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border-default))' }}
            />
            <Tooltip 
              contentStyle={{ 
                background: 'hsl(var(--surface-1))', 
                border: '1px solid hsl(var(--border-default))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="hsl(var(--accent-primary))" 
              fill="hsl(var(--accent-primary) / 0.1)"
              name="Total Executed"
            />
            <Area 
              type="monotone" 
              dataKey="passed" 
              stroke="hsl(var(--status-success))" 
              fill="hsl(var(--status-success) / 0.2)"
              name="Passed"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ==================== USER ACTIVITY ====================
export function UserActivityGadget({ projectId, config, className }: GadgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['gadget-user-activity', projectId],
    queryFn: async () => {
      const { data: activity } = await supabase
        .from('test_activity_log')
        .select(`
          id, user_id, activity_type, created_at,
          user:profiles(display_name, avatar_url)
        `)
        .eq('program_id', projectId)
        .gte('created_at', subDays(new Date(), 7).toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      // Aggregate by user
      const userActivity = new Map<string, { name: string; avatar?: string; count: number }>();
      
      (activity || []).forEach((a: any) => {
        const userId = a.user_id;
        const userName = a.user?.display_name || 'Unknown';
        
        if (userActivity.has(userId)) {
          userActivity.get(userId)!.count++;
        } else {
          userActivity.set(userId, {
            name: userName,
            avatar: a.user?.avatar_url,
            count: 1,
          });
        }
      });

      return Array.from(userActivity.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
    enabled: !!projectId,
  });

  if (isLoading) return <GadgetSkeleton className={className} />;

  return (
    <Card className={cn('bg-surface-2 border-border-default', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-accent-primary" />
          Top Contributors (7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {(data || []).length === 0 ? (
            <div className="text-center text-text-tertiary text-sm py-4">
              No activity recorded
            </div>
          ) : (
            (data || []).map((user, i) => (
              <div key={user.id} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-accent-primary/20 flex items-center justify-center text-xs font-medium text-accent-primary">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">{user.name}</div>
                </div>
                <Badge variant="secondary" className="text-xs">{user.count}</Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== PROJECT ACTIVITY ADVANCED ====================
export function ProjectActivityGadget({ projectId, config, className }: GadgetProps) {
  const dateRange = config?.dateRange || '14';

  const { data, isLoading } = useQuery({
    queryKey: ['gadget-project-activity', projectId, dateRange],
    queryFn: async () => {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days));

      const { data: activity } = await supabase
        .from('test_activity_log')
        .select('id, activity_type, created_at')
        .eq('program_id', projectId)
        .gte('created_at', startDate.toISOString());

      const dayInterval = eachDayOfInterval({ start: startDate, end: new Date() });

      return dayInterval.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayActivities = (activity || []).filter(
          (a: any) => format(new Date(a.created_at), 'yyyy-MM-dd') === dayStr
        );

        const executions = dayActivities.filter(a => a.activity_type?.includes('execution')).length;
        const cases = dayActivities.filter(a => a.activity_type?.includes('case')).length;
        const defects = dayActivities.filter(a => a.activity_type?.includes('defect')).length;

        return {
          date: format(day, 'MMM d'),
          executions,
          cases,
          defects,
          total: dayActivities.length,
        };
      });
    },
    enabled: !!projectId,
  });

  if (isLoading) return <GadgetSkeleton className={className} />;

  return (
    <Card className={cn('bg-surface-2 border-border-default', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent-primary" />
          Project Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'hsl(var(--text-tertiary))', fontSize: 10 }}
            />
            <YAxis tick={{ fill: 'hsl(var(--text-tertiary))', fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ 
                background: 'hsl(var(--surface-1))', 
                border: '1px solid hsl(var(--border-default))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="executions" fill="hsl(var(--status-success))" name="Executions" stackId="a" />
            <Bar dataKey="cases" fill="hsl(var(--accent-primary))" name="Cases" stackId="a" />
            <Bar dataKey="defects" fill="hsl(var(--status-error))" name="Defects" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ==================== TRACEABILITY DETAIL ====================
export function TraceabilityDetailGadget({ projectId, config, className }: GadgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['gadget-traceability-detail', projectId],
    queryFn: async () => {
      // Get features with their stories and test case counts
      const { data: features } = await supabase
        .from('features')
        .select('id, name, display_id')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .limit(10);

      const featureData = await Promise.all((features || []).map(async (feature) => {
        // Get stories for this feature
        const { data: stories } = await supabase
          .from('stories')
          .select('id')
          .eq('feature_id', feature.id)
          .is('deleted_at', null);

        const storyIds = stories?.map(s => s.id) || [];

        // Get test cases linked to these stories
        const { data: links } = await supabase
          .from('test_case_work_item_links')
          .select('id')
          .in('work_item_id', storyIds.length > 0 ? storyIds : ['none']);

        return {
          id: feature.id,
          name: feature.name,
          key: feature.display_id,
          stories: storyIds.length,
          testCases: links?.length || 0,
          coverage: storyIds.length > 0 
            ? Math.round((new Set((links || []).map(l => l.id)).size / storyIds.length) * 100)
            : 0,
        };
      }));

      return featureData;
    },
    enabled: !!projectId,
  });

  if (isLoading) return <GadgetSkeleton className={className} />;

  return (
    <Card className={cn('bg-surface-2 border-border-default', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4 text-accent-primary" />
          Traceability by Feature
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[220px]">
          <div className="px-4 pb-4">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-2">
                <tr className="border-b border-border-default">
                  <th className="text-left py-2 font-medium text-text-secondary">Feature</th>
                  <th className="text-center py-2 font-medium text-text-secondary">Stories</th>
                  <th className="text-center py-2 font-medium text-text-secondary">Tests</th>
                  <th className="text-right py-2 font-medium text-text-secondary">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).map((feature) => (
                  <tr key={feature.id} className="border-b border-border-default/50">
                    <td className="py-2 text-text-primary truncate max-w-[120px]" title={feature.name}>
                      {feature.name}
                    </td>
                    <td className="py-2 text-center text-text-secondary">{feature.stories}</td>
                    <td className="py-2 text-center text-text-secondary">{feature.testCases}</td>
                    <td className="py-2 text-right">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-[10px]',
                          feature.coverage >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                          feature.coverage >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        )}
                      >
                        {feature.coverage}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ==================== HELPER COMPONENTS ====================
function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-secondary w-16">{label}</span>
      <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs text-text-tertiary w-10 text-right">{count}</span>
    </div>
  );
}

function GadgetSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('bg-surface-2 border-border-default', className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[160px] w-full" />
      </CardContent>
    </Card>
  );
}
