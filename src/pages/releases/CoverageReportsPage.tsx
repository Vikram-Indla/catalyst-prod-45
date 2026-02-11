/**
 * Coverage Reports Page
 * Route: /releases/coverage
 * 
 * Comprehensive requirements-to-test traceability, coverage analytics,
 * gap identification, and trend analysis.
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  Search,
  Download,
  FileText,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ExternalLink,
  ChevronRight,
  Layers,
  FolderTree,
  LayoutGrid,
  BarChart3,
  ArrowUpRight,
  Clock,
  Target,
  Sparkles,
  FileSpreadsheet,
  FileDown,
} from 'lucide-react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddTestsToCoverageDialog } from '@/components/releases/coverage';

// Simple CoverageRing component
function CoverageRing({ percentage, size = 'md' }: { percentage: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 40, md: 60, lg: 80 };
  const strokeMap = { sm: 4, md: 6, lg: 8 };
  const dim = sizeMap[size];
  const stroke = strokeMap[size];
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            percentage >= 80 ? 'stroke-teal-500' : percentage >= 50 ? 'stroke-amber-500' : 'stroke-red-500'
          )}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
        {percentage}%
      </span>
    </div>
  );
}

// ============================================
// EMPTY DATA - Replace with database hooks
// ============================================
const mockReleases: { id: string; name: string; status: string }[] = [];

const mockModules: { id: string; name: string; requirements: number; covered: number; partial: number; uncovered: number; passRate: number }[] = [];

const mockRequirements: { id: string; title: string; priority: string; module: string; type: string; tests: number; passed: number; failed: number; blocked: number; notRun: number; coverage: string; coveragePercent: number }[] = [];

const mockGaps: { id: string; reqId: string; reqTitle: string; priority: string; module: string; gapType: string; severity: string; riskScore: number; effort: number }[] = [];

const mockTrendData: { week: string; coverage: number; requirements: number }[] = [];

const mockSprintCoverage: { sprint: string; coverage: number; newReqs: number; testedReqs: number }[] = [];

// ============================================
// HELPER COMPONENTS
// ============================================

function CoverageBadge({ status, percent }: { status: string; percent?: number }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    covered: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', icon: <CheckCircle2 className="h-3 w-3" /> },
    partial: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: <Circle className="h-3 w-3 fill-current" /> },
    uncovered: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: <AlertTriangle className="h-3 w-3" /> },
  };
  const c = config[status] || config.uncovered;
  
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', c.bg, c.text)}>
      {c.icon}
      {percent !== undefined ? `${percent}%` : status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-medium capitalize', colors[priority] || colors.medium)}>
      {priority}
    </span>
  );
}

function GapSeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-amber-500 text-white',
    low: 'bg-slate-400 text-white',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-semibold uppercase', colors[severity] || colors.medium)}>
      {severity}
    </span>
  );
}

function ExecutionDots({ passed, failed, blocked, notRun }: { passed: number; failed: number; blocked: number; notRun: number }) {
  const total = passed + failed + blocked + notRun;
  if (total === 0) return <span className="text-muted-foreground text-xs">—</span>;
  
  return (
    <div className="flex items-center gap-1">
      {passed > 0 && <span className="text-xs font-medium text-teal-600 dark:text-teal-400">{passed}P</span>}
      {failed > 0 && <span className="text-xs font-medium text-red-600 dark:text-red-400">{failed}F</span>}
      {blocked > 0 && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{blocked}B</span>}
      {notRun > 0 && <span className="text-xs font-medium text-slate-500">{notRun}N</span>}
    </div>
  );
}

function StatCard({ icon, label, value, subValue, trend, trendUp }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </div>
      {trend && (
        <div className={cn('flex items-center gap-1 text-sm font-medium', trendUp ? 'text-teal-600' : 'text-red-600')}>
          {trendUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {trend}
        </div>
      )}
    </div>
  );
}

// ============================================
// TAB CONTENT COMPONENTS
// ============================================

function ByRequirementTab({ 
  requirements, 
  searchQuery, 
  filters,
  onViewRequirement 
}: { 
  requirements: typeof mockRequirements; 
  searchQuery: string; 
  filters: any;
  onViewRequirement: (reqId: string) => void;
}) {
  const filtered = useMemo(() => {
    return (requirements || []).filter(r => {
      if (!r) return false;
      const matchesSearch = (r.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (r.id || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCoverage = !filters.coverage || filters.coverage === 'all' || r.coverage === filters.coverage;
      const matchesPriority = !filters.priority || filters.priority === 'all' || r.priority === filters.priority;
      return matchesSearch && matchesCoverage && matchesPriority;
    });
  }, [requirements, searchQuery, filters]);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-32">Req ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-24">Priority</TableHead>
              <TableHead className="w-40">Module</TableHead>
              <TableHead className="w-20 text-center">Tests</TableHead>
              <TableHead className="w-32 text-center">Execution</TableHead>
              <TableHead className="w-28 text-center">Coverage</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(req => (
              <TableRow key={req.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium text-primary">{req.id}</TableCell>
                <TableCell className="font-medium">{req.title}</TableCell>
                <TableCell><PriorityBadge priority={req.priority} /></TableCell>
                <TableCell className="text-muted-foreground">{req.module}</TableCell>
                <TableCell className="text-center font-medium">{req.tests}</TableCell>
                <TableCell className="text-center">
                  <ExecutionDots passed={req.passed} failed={req.failed} blocked={req.blocked} notRun={req.notRun} />
                </TableCell>
                <TableCell className="text-center">
                  <CoverageBadge status={req.coverage} percent={req.coveragePercent} />
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => onViewRequirement(req.id)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No requirements match your filters
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ByModuleTab({ modules }: { modules: typeof mockModules }) {
  const safeModules = modules || [];
  const chartData = safeModules.map(m => ({
    name: m.name.length > 15 ? m.name.substring(0, 15) + '...' : m.name,
    fullName: m.name,
    covered: m.requirements > 0 ? Math.round((m.covered / m.requirements) * 100) : 0,
    partial: m.requirements > 0 ? Math.round((m.partial / m.requirements) * 100) : 0,
    uncovered: m.requirements > 0 ? Math.round((m.uncovered / m.requirements) * 100) : 0,
    passRate: m.passRate,
  }));

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Module Coverage Cards */}
      <div className="col-span-2 space-y-4">
        {safeModules.map(mod => {
          const coveragePercent = mod.requirements > 0 ? Math.round((mod.covered / mod.requirements) * 100) : 0;
          return (
            <Card key={mod.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{mod.name}</h3>
                      <p className="text-sm text-muted-foreground">{mod.requirements} requirements</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-teal-600">{mod.covered}</p>
                      <p className="text-xs text-muted-foreground">Covered</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-500">{mod.partial}</p>
                      <p className="text-xs text-muted-foreground">Partial</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-500">{mod.uncovered}</p>
                      <p className="text-xs text-muted-foreground">Uncovered</p>
                    </div>
                    <div className="w-32">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{coveragePercent}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            coveragePercent >= 80 ? 'bg-teal-500' : coveragePercent >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${coveragePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Module Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coverage by Module</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [`${value}%`, name]}
                />
                <Bar dataKey="covered" stackId="a" fill="hsl(var(--success))" name="Covered" />
                <Bar dataKey="partial" stackId="a" fill="hsl(var(--warning))" name="Partial" />
                <Bar dataKey="uncovered" stackId="a" fill="hsl(var(--destructive))" name="Uncovered" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GapAnalysisTab({ gaps, onAddTests }: { gaps: typeof mockGaps; onAddTests: (gap: typeof mockGaps[0]) => void }) {
  const safeGaps = gaps || [];
  const criticalCount = safeGaps.filter(g => g.severity === 'critical').length;
  const highCount = safeGaps.filter(g => g.severity === 'high').length;
  const totalEffort = safeGaps.reduce((sum, g) => sum + g.effort, 0);

  return (
    <div className="space-y-6">
      {/* Gap Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<AlertTriangle className="h-6 w-6" />}
          label="Total Gaps"
          value={gaps.length}
          subValue="Requiring attention"
        />
        <StatCard
          icon={<Target className="h-6 w-6" />}
          label="Critical Gaps"
          value={criticalCount}
          subValue="Must fix before release"
        />
        <StatCard
          icon={<Clock className="h-6 w-6" />}
          label="Est. Effort"
          value={`${totalEffort}h`}
          subValue="To close all gaps"
        />
        <StatCard
          icon={<Sparkles className="h-6 w-6" />}
          label="Risk Score"
          value={safeGaps.length > 0 ? Math.round(safeGaps.reduce((s, g) => s + g.riskScore, 0) / safeGaps.length) : 0}
          subValue="Average risk level"
        />
      </div>

      {/* Gap List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Coverage Gaps
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-28">Severity</TableHead>
                <TableHead className="w-28">Req ID</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead className="w-32">Module</TableHead>
                <TableHead className="w-28">Gap Type</TableHead>
                <TableHead className="w-24 text-center">Risk</TableHead>
                <TableHead className="w-24 text-center">Effort</TableHead>
                <TableHead className="w-32">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeGaps.map(gap => (
                <TableRow key={gap.id} className={cn(
                  'hover:bg-muted/30',
                  gap.severity === 'critical' && 'bg-red-50 dark:bg-red-950/20'
                )}>
                  <TableCell><GapSeverityBadge severity={gap.severity} /></TableCell>
                  <TableCell className="font-mono text-sm font-medium text-primary">{gap.reqId}</TableCell>
                  <TableCell className="font-medium">{gap.reqTitle}</TableCell>
                  <TableCell className="text-muted-foreground">{gap.module}</TableCell>
                  <TableCell>
                    <span className="text-xs font-medium capitalize">{gap.gapType.replace('_', ' ')}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      'font-semibold',
                      gap.riskScore >= 80 ? 'text-red-600' : gap.riskScore >= 50 ? 'text-amber-600' : 'text-slate-600'
                    )}>
                      {gap.riskScore}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{gap.effort}h</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => onAddTests(gap)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Tests
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TrendsTab({ trendData, sprintData }: { trendData: typeof mockTrendData; sprintData: typeof mockSprintCoverage }) {
  const safeTrendData = trendData || [];
  const safeSprintData = sprintData || [];
  const latestCoverage = safeTrendData.length > 0 ? (safeTrendData[safeTrendData.length - 1]?.coverage ?? 0) : 0;
  const previousCoverage = safeTrendData.length > 1 ? (safeTrendData[safeTrendData.length - 2]?.coverage ?? 0) : 0;
  const trendDelta = latestCoverage - previousCoverage;
  const overallTrend = trendDelta > 0 ? 'improving' : trendDelta < 0 ? 'declining' : 'stable';
  const firstCoverage = safeTrendData.length > 0 ? (safeTrendData[0]?.coverage ?? 0) : 0;
  const avgWeeklyChange = safeTrendData.length > 1 ? Math.round((latestCoverage - firstCoverage) / safeTrendData.length) : 0;

  if (safeTrendData.length === 0 && safeSprintData.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">No trend data available</p>
        <p className="text-sm">Coverage trends will appear once requirements and test executions are recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend Summary */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp className="h-6 w-6" />}
          label="Current Coverage"
          value={`${latestCoverage}%`}
          trend={`${trendDelta >= 0 ? '+' : ''}${trendDelta}%`}
          trendUp={trendDelta >= 0}
        />
        <StatCard
          icon={<Target className="h-6 w-6" />}
          label="Target Coverage"
          value="85%"
          subValue={`${85 - latestCoverage}% to go`}
        />
        <StatCard
          icon={<Calendar className="h-6 w-6" />}
          label="Trend Status"
          value={overallTrend.charAt(0).toUpperCase() + overallTrend.slice(1)}
          subValue="Last 8 weeks"
        />
        <StatCard
          icon={<BarChart3 className="h-6 w-6" />}
          label="Avg. Weekly Change"
          value={`+${avgWeeklyChange}%`}
          subValue="Per week"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Coverage Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coverage Trend (8 Weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={safeTrendData}>
                  <defs>
                    <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis domain={[50, 100]} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="coverage"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#coverageGradient)"
                    name="Coverage %"
                  />
                  <Line
                    type="monotone"
                    dataKey="requirements"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    name="Total Requirements"
                    yAxisId={1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sprint Coverage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coverage by Sprint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={safeSprintData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="sprint" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="coverage" fill="hsl(var(--primary))" name="Coverage %" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="newReqs" fill="hsl(var(--muted-foreground))" name="New Reqs" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="testedReqs" fill="hsl(var(--success))" name="Tested Reqs" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function CoverageReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'requirements');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelease, setSelectedRelease] = useState(mockReleases[0]?.id || '');
  const [filters, setFilters] = useState({
    coverage: 'all',
    priority: 'all',
    module: 'all',
  });
  
  // Dialog state for adding tests
  const [addTestsForReq, setAddTestsForReq] = useState<{ id: string; title: string; } | null>(null);

  // Calculate summary metrics
  const totalRequirements = mockRequirements.length;
  const coveredCount = mockRequirements.filter(r => r.coverage === 'covered').length;
  const partialCount = mockRequirements.filter(r => r.coverage === 'partial').length;
  const uncoveredCount = mockRequirements.filter(r => r.coverage === 'uncovered').length;
  const overallCoverage = totalRequirements > 0 ? Math.round(((coveredCount + partialCount * 0.5) / totalRequirements) * 100) : 0;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  const handleViewRequirement = (reqId: string) => {
    // Navigate to requirement detail - using a toast for now as specific route may vary
    toast.info(`Navigating to requirement ${reqId}`);
    navigate(`/releases/${selectedRelease}/requirements?id=${reqId}`);
  };
  
  const handleAddTestsFromGap = (gap: typeof mockGaps[0]) => {
    setAddTestsForReq({ id: gap.reqId, title: gap.reqTitle });
  };
  
  const handleCoverageRefresh = () => {
    // In real implementation, refetch coverage data
    toast.success('Coverage data refreshed');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Coverage Reports</h1>
            <p className="text-sm text-muted-foreground">
              Requirements traceability, coverage analytics, and gap analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedRelease} onValueChange={setSelectedRelease}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select release" />
              </SelectTrigger>
              <SelectContent>
                {mockReleases.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  Export to PDF
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export to CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="col-span-1 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="relative h-16 w-16">
                <svg className="h-16 w-16 -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                  <circle
                    cx="32" cy="32" r="28" fill="none"
                    stroke="hsl(var(--primary))" strokeWidth="6"
                    strokeDasharray={`${(overallCoverage / 100) * 176} 176`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-primary">
                  {overallCoverage}%
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall Coverage</p>
                <p className="text-sm font-medium">{coveredCount + partialCount} of {totalRequirements}</p>
              </div>
            </CardContent>
          </Card>
          
          <StatCard
            icon={<CheckCircle2 className="h-6 w-6 text-teal-600" />}
            label="Covered"
            value={coveredCount}
            subValue={`${totalRequirements > 0 ? Math.round((coveredCount / totalRequirements) * 100) : 0}% of total`}
          />
          <StatCard
            icon={<Circle className="h-6 w-6 text-amber-500 fill-amber-500" />}
            label="Partial"
            value={partialCount}
            subValue={`${totalRequirements > 0 ? Math.round((partialCount / totalRequirements) * 100) : 0}% of total`}
          />
          <StatCard
            icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
            label="Uncovered"
            value={uncoveredCount}
            subValue={`${totalRequirements > 0 ? Math.round((uncoveredCount / totalRequirements) * 100) : 0}% of total`}
          />
          <StatCard
            icon={<Target className="h-6 w-6 text-primary" />}
            label="Critical Gaps"
            value={mockGaps.filter(g => g.severity === 'critical').length}
            subValue="Needs immediate attention"
          />
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requirements..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filters.coverage} onValueChange={v => setFilters(f => ({ ...f, coverage: v }))}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Coverage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="covered">Covered</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="uncovered">Uncovered</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.priority} onValueChange={v => setFilters(f => ({ ...f, priority: v }))}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          {(filters.coverage !== 'all' || filters.priority !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({ coverage: 'all', priority: 'all', module: 'all' })}>
              Clear filters
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="requirements" className="gap-2">
              <FileText className="h-4 w-4" />
              By Requirement
            </TabsTrigger>
            <TabsTrigger value="modules" className="gap-2">
              <Layers className="h-4 w-4" />
              By Module
            </TabsTrigger>
            <TabsTrigger value="gaps" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Gap Analysis
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requirements" className="mt-6">
            <ByRequirementTab 
              requirements={mockRequirements} 
              searchQuery={searchQuery} 
              filters={filters}
              onViewRequirement={handleViewRequirement}
            />
          </TabsContent>

          <TabsContent value="modules" className="mt-6">
            <ByModuleTab modules={mockModules} />
          </TabsContent>

          <TabsContent value="gaps" className="mt-6">
            <GapAnalysisTab gaps={mockGaps} onAddTests={handleAddTestsFromGap} />
          </TabsContent>

          <TabsContent value="trends" className="mt-6">
            <TrendsTab trendData={mockTrendData} sprintData={mockSprintCoverage} />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Add Tests Dialog */}
      <AddTestsToCoverageDialog
        open={!!addTestsForReq}
        requirement={addTestsForReq}
        onOpenChange={(open) => !open && setAddTestsForReq(null)}
        onSuccess={handleCoverageRefresh}
      />
    </div>
  );
}
