import React, { useState, useMemo } from 'react';
import { 
  CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight,
  Play, RefreshCw, Settings, Plus, Shield, Activity, TrendingUp, TrendingDown,
  Minus, Filter, MoreVertical, Eye, Edit, Trash2, History, Download, Search,
  AlertCircle, ArrowUpRight, Target, Gauge, BarChart3, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { cn } from '@/lib/utils';

// Types
type GateStatus = 'passing' | 'failing' | 'warning' | 'not_evaluated' | 'error';
type GateType = 'execution' | 'coverage' | 'defect' | 'performance' | 'security' | 'documentation' | 'compliance' | 'custom';
type GateCategory = 'blocking' | 'warning' | 'informational';
type RuleStatus = 'pass' | 'fail' | 'warn' | 'error' | 'not_evaluated';

interface GateRule {
  id: string;
  name: string;
  description?: string;
  metric: string;
  operator: string;
  threshold: number;
  warningThreshold?: number;
  currentValue: number;
  status: RuleStatus;
  weight: number;
  isRequired: boolean;
}

interface QualityGate {
  id: string;
  name: string;
  description?: string;
  type: GateType;
  category: GateCategory;
  status: GateStatus;
  score: number;
  rules: GateRule[];
  lastEvaluatedAt?: string;
  isActive: boolean;
  hasOverride: boolean;
  trend: 'improving' | 'stable' | 'degrading';
}

interface BlockingIssue {
  gateId: string;
  gateName: string;
  ruleId: string;
  ruleName: string;
  message: string;
  suggestedAction: string;
  estimatedEffort: 'low' | 'medium' | 'high';
}

interface TrendData {
  date: string;
  passing: number;
  failing: number;
  score: number;
}

// Mock Data
const mockReleases = [
  { id: 'rel-1', name: 'Release 2.5.0', status: 'in_progress', targetDate: '2026-02-15' },
  { id: 'rel-2', name: 'Release 2.4.0', status: 'testing', targetDate: '2026-01-30' },
  { id: 'rel-3', name: 'Release 2.3.0', status: 'released', targetDate: '2026-01-15' },
];

const mockGates: QualityGate[] = [
  {
    id: 'gate-1',
    name: 'Test Execution Gate',
    description: 'Ensures test execution meets quality thresholds',
    type: 'execution',
    category: 'blocking',
    status: 'passing',
    score: 95,
    lastEvaluatedAt: '2026-01-17T08:30:00Z',
    isActive: true,
    hasOverride: false,
    trend: 'improving',
    rules: [
      { id: 'r1', name: 'Pass Rate', metric: 'pass_rate', operator: '>=', threshold: 95, warningThreshold: 90, currentValue: 97.5, status: 'pass', weight: 3, isRequired: true },
      { id: 'r2', name: 'Execution Complete', metric: 'execution_complete', operator: '>=', threshold: 100, warningThreshold: 90, currentValue: 98, status: 'warn', weight: 2, isRequired: false },
      { id: 'r3', name: 'Critical Pass Rate', metric: 'critical_pass_rate', operator: '>=', threshold: 100, currentValue: 100, status: 'pass', weight: 3, isRequired: true },
    ],
  },
  {
    id: 'gate-2',
    name: 'Coverage Gate',
    description: 'Requirements coverage must meet minimum thresholds',
    type: 'coverage',
    category: 'blocking',
    status: 'failing',
    score: 72,
    lastEvaluatedAt: '2026-01-17T08:30:00Z',
    isActive: true,
    hasOverride: false,
    trend: 'degrading',
    rules: [
      { id: 'r4', name: 'Overall Coverage', metric: 'overall_coverage', operator: '>=', threshold: 80, warningThreshold: 70, currentValue: 75, status: 'warn', weight: 2, isRequired: false },
      { id: 'r5', name: 'Critical Coverage', metric: 'critical_coverage', operator: '>=', threshold: 95, currentValue: 68, status: 'fail', weight: 3, isRequired: true },
      { id: 'r6', name: 'High Priority Gaps', metric: 'uncovered_high_priority', operator: '<=', threshold: 0, currentValue: 5, status: 'fail', weight: 2, isRequired: false },
    ],
  },
  {
    id: 'gate-3',
    name: 'Defect Gate',
    description: 'No critical or blocker defects allowed',
    type: 'defect',
    category: 'blocking',
    status: 'passing',
    score: 100,
    lastEvaluatedAt: '2026-01-17T08:30:00Z',
    isActive: true,
    hasOverride: false,
    trend: 'stable',
    rules: [
      { id: 'r7', name: 'Critical Defects', metric: 'critical_count', operator: '==', threshold: 0, currentValue: 0, status: 'pass', weight: 3, isRequired: true },
      { id: 'r8', name: 'Blocker Defects', metric: 'blocker_count', operator: '==', threshold: 0, currentValue: 0, status: 'pass', weight: 3, isRequired: true },
      { id: 'r9', name: 'High Defects', metric: 'high_count', operator: '<=', threshold: 5, currentValue: 3, status: 'pass', weight: 2, isRequired: false },
    ],
  },
  {
    id: 'gate-4',
    name: 'Performance Gate',
    description: 'Application performance benchmarks',
    type: 'performance',
    category: 'warning',
    status: 'warning',
    score: 82,
    lastEvaluatedAt: '2026-01-17T08:30:00Z',
    isActive: true,
    hasOverride: false,
    trend: 'stable',
    rules: [
      { id: 'r10', name: 'Page Load Time', metric: 'page_load_ms', operator: '<=', threshold: 3000, warningThreshold: 2000, currentValue: 2500, status: 'warn', weight: 2, isRequired: false },
      { id: 'r11', name: 'API Response Time', metric: 'api_response_ms', operator: '<=', threshold: 500, currentValue: 320, status: 'pass', weight: 2, isRequired: false },
    ],
  },
  {
    id: 'gate-5',
    name: 'Security Gate',
    description: 'Security vulnerability checks',
    type: 'security',
    category: 'blocking',
    status: 'passing',
    score: 100,
    lastEvaluatedAt: '2026-01-17T08:30:00Z',
    isActive: true,
    hasOverride: false,
    trend: 'stable',
    rules: [
      { id: 'r12', name: 'Critical Vulnerabilities', metric: 'critical_vulns', operator: '==', threshold: 0, currentValue: 0, status: 'pass', weight: 3, isRequired: true },
      { id: 'r13', name: 'High Vulnerabilities', metric: 'high_vulns', operator: '<=', threshold: 0, currentValue: 0, status: 'pass', weight: 2, isRequired: true },
    ],
  },
  {
    id: 'gate-6',
    name: 'Documentation Gate',
    description: 'Release documentation completeness',
    type: 'documentation',
    category: 'informational',
    status: 'not_evaluated',
    score: 0,
    isActive: true,
    hasOverride: false,
    trend: 'stable',
    rules: [
      { id: 'r14', name: 'Release Notes', metric: 'release_notes_complete', operator: '==', threshold: 1, currentValue: 0, status: 'not_evaluated', weight: 1, isRequired: false },
      { id: 'r15', name: 'API Docs Updated', metric: 'api_docs_updated', operator: '==', threshold: 1, currentValue: 0, status: 'not_evaluated', weight: 1, isRequired: false },
    ],
  },
];

const mockBlockingIssues: BlockingIssue[] = [
  {
    gateId: 'gate-2',
    gateName: 'Coverage Gate',
    ruleId: 'r5',
    ruleName: 'Critical Coverage',
    message: 'Critical requirements coverage is at 68%, below the 95% threshold',
    suggestedAction: 'Add test cases for 27 uncovered critical requirements',
    estimatedEffort: 'high',
  },
  {
    gateId: 'gate-2',
    gateName: 'Coverage Gate',
    ruleId: 'r6',
    ruleName: 'High Priority Gaps',
    message: '5 high-priority requirements have no test coverage',
    suggestedAction: 'Create test cases for REQ-145, REQ-167, REQ-189, REQ-201, REQ-215',
    estimatedEffort: 'medium',
  },
];

const mockTrendData: TrendData[] = [
  { date: 'Jan 10', passing: 4, failing: 2, score: 72 },
  { date: 'Jan 11', passing: 4, failing: 2, score: 74 },
  { date: 'Jan 12', passing: 5, failing: 1, score: 78 },
  { date: 'Jan 13', passing: 4, failing: 2, score: 75 },
  { date: 'Jan 14', passing: 5, failing: 1, score: 82 },
  { date: 'Jan 15', passing: 4, failing: 2, score: 78 },
  { date: 'Jan 16', passing: 4, failing: 2, score: 80 },
  { date: 'Jan 17', passing: 4, failing: 2, score: 82 },
];

// Status configuration
const statusConfig = {
  passing: { icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', label: 'Passing' },
  failing: { icon: XCircle, color: 'text-destructive', bg: 'bg-red-50', border: 'border-red-200', label: 'Failing' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Warning' },
  not_evaluated: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-border', label: 'Not Evaluated' },
  error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-red-50', border: 'border-red-200', label: 'Error' },
};

const ruleStatusConfig = {
  pass: { icon: CheckCircle, color: 'text-teal-600' },
  fail: { icon: XCircle, color: 'text-destructive' },
  warn: { icon: AlertTriangle, color: 'text-amber-600' },
  error: { icon: AlertCircle, color: 'text-destructive' },
  not_evaluated: { icon: Clock, color: 'text-muted-foreground' },
};

const categoryConfig = {
  blocking: { label: 'Blocking', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  warning: { label: 'Warning', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  informational: { label: 'Info', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
};

const typeIcons: Record<GateType, React.ElementType> = {
  execution: Activity,
  coverage: Target,
  defect: AlertCircle,
  performance: Gauge,
  security: Shield,
  documentation: BarChart3,
  compliance: Shield,
  custom: Settings,
};

// Components
function ReadinessGauge({ score, status }: { score: number; status: string }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = () => {
    if (score >= 85) return '#0d9488'; // teal
    if (score >= 70) return '#d97706'; // amber
    return '#ef4444'; // red
  };

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="45"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
        />
        <circle
          cx="64"
          cy="64"
          r="45"
          fill="none"
          stroke={getColor()}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{score}%</span>
        <span className="text-xs text-muted-foreground capitalize">{status.replace('_', ' ')}</span>
      </div>
    </div>
  );
}

function GateCard({ 
  gate, 
  expanded, 
  onToggle, 
  onEvaluate,
  onRequestOverride 
}: { 
  gate: QualityGate; 
  expanded: boolean; 
  onToggle: () => void;
  onEvaluate: () => void;
  onRequestOverride: () => void;
}) {
  const config = statusConfig[gate.status];
  const StatusIcon = config.icon;
  const TypeIcon = typeIcons[gate.type];
  const TrendIcon = gate.trend === 'improving' ? TrendingUp : gate.trend === 'degrading' ? TrendingDown : Minus;
  const trendColor = gate.trend === 'improving' ? 'text-teal-600' : gate.trend === 'degrading' ? 'text-destructive' : 'text-muted-foreground';

  const passingRules = gate.rules.filter(r => r.status === 'pass').length;
  const failingRules = gate.rules.filter(r => r.status === 'fail').length;
  const warningRules = gate.rules.filter(r => r.status === 'warn').length;

  return (
    <Card className={cn("transition-all", config.border, expanded && "ring-2 ring-primary/20")}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="p-1 hover:bg-muted rounded"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          <div className={cn("p-2 rounded-lg", config.bg)}>
            <StatusIcon className={cn("w-5 h-5", config.color)} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{gate.name}</h3>
              <Badge variant="outline" className={categoryConfig[gate.category].color}>
                {categoryConfig[gate.category].label}
              </Badge>
              {gate.hasOverride && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/20">
                  Override Active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <TypeIcon className="w-3 h-3" />
                <span className="capitalize">{gate.type}</span>
              </div>
              {gate.lastEvaluatedAt && (
                <span>Last: {new Date(gate.lastEvaluatedAt).toLocaleTimeString()}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Rules Summary */}
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-teal-600">
                <CheckCircle className="w-3.5 h-3.5" /> {passingRules}
              </span>
              {warningRules > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="w-3.5 h-3.5" /> {warningRules}
                </span>
              )}
              {failingRules > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="w-3.5 h-3.5" /> {failingRules}
                </span>
              )}
            </div>

            {/* Score */}
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">{gate.score}%</div>
              <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
                <TrendIcon className="w-3 h-3" />
                <span className="capitalize">{gate.trend}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEvaluate}>
                      <Play className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Run Evaluation</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="w-4 h-4 mr-2" /> View History
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" /> Edit Gate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onRequestOverride}>
                    <Shield className="w-4 h-4 mr-2" /> Request Override
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="ml-8 space-y-2">
            {gate.description && (
              <p className="text-sm text-muted-foreground mb-3">{gate.description}</p>
            )}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Rule</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Threshold</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Current</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {gate.rules.map((rule) => {
                    const ruleConfig = ruleStatusConfig[rule.status];
                    const RuleIcon = ruleConfig.icon;
                    return (
                      <tr key={rule.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{rule.name}</span>
                            {rule.isRequired && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1">Required</Badge>
                            )}
                          </div>
                        </td>
                        <td className="text-center px-3 py-2 text-muted-foreground">
                          {rule.operator} {rule.threshold}
                          {rule.metric.includes('rate') || rule.metric.includes('coverage') ? '%' : ''}
                        </td>
                        <td className="text-center px-3 py-2 font-medium text-foreground">
                          {rule.currentValue}
                          {rule.metric.includes('rate') || rule.metric.includes('coverage') ? '%' : ''}
                        </td>
                        <td className="text-center px-3 py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <RuleIcon className={cn("w-4 h-4", ruleConfig.color)} />
                            <span className={cn("text-xs font-medium capitalize", ruleConfig.color)}>
                              {rule.status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="text-center px-3 py-2 text-muted-foreground">{rule.weight}x</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function BlockingIssueCard({ issue }: { issue: BlockingIssue }) {
  const effortColors = {
    low: 'bg-teal-500/10 text-teal-700',
    medium: 'bg-amber-500/10 text-amber-700',
    high: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="p-3 border border-destructive/20 rounded-lg bg-destructive/5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <XCircle className="w-4 h-4 text-destructive shrink-0" />
            <span className="font-medium text-foreground truncate">{issue.gateName}: {issue.ruleName}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-6">{issue.message}</p>
          <div className="flex items-center gap-2 mt-2 ml-6">
            <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary">{issue.suggestedAction}</span>
          </div>
        </div>
        <Badge variant="secondary" className={cn("shrink-0", effortColors[issue.estimatedEffort])}>
          {issue.estimatedEffort} effort
        </Badge>
      </div>
    </div>
  );
}

function OverrideRequestDialog({ 
  open, 
  onOpenChange, 
  gateName 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  gateName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Override: {gateName}</DialogTitle>
          <DialogDescription>
            Override requests require justification and approval from release managers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Override Type</Label>
            <Select defaultValue="temporary">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temporary">Temporary (until next evaluation)</SelectItem>
                <SelectItem value="one_time">One-time (single release)</SelectItem>
                <SelectItem value="permanent">Permanent (requires executive approval)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Risk Level</Label>
            <Select defaultValue="medium">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Justification *</Label>
            <Textarea 
              placeholder="Explain why this override is necessary..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Mitigation Plan</Label>
            <Textarea 
              placeholder="Describe how risks will be mitigated..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button>Submit Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function QualityGatesPage() {
  const [selectedRelease, setSelectedRelease] = useState(mockReleases[0].id);
  const [expandedGates, setExpandedGates] = useState<Set<string>>(new Set(['gate-2']));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [overrideDialog, setOverrideDialog] = useState<{ open: boolean; gateName: string }>({ open: false, gateName: '' });

  const filteredGates = useMemo(() => {
    return mockGates.filter(gate => {
      if (statusFilter !== 'all' && gate.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && gate.category !== categoryFilter) return false;
      if (searchQuery && !gate.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [statusFilter, categoryFilter, searchQuery]);

  const summary = useMemo(() => {
    const total = mockGates.length;
    const passing = mockGates.filter(g => g.status === 'passing').length;
    const failing = mockGates.filter(g => g.status === 'failing').length;
    const warning = mockGates.filter(g => g.status === 'warning').length;
    const notEvaluated = mockGates.filter(g => g.status === 'not_evaluated').length;
    
    const totalScore = mockGates.reduce((sum, g) => sum + g.score, 0);
    const readinessScore = Math.round(totalScore / total);
    
    const overallStatus = failing > 0 ? 'not_ready' : warning > 0 ? 'at_risk' : 'ready';
    
    return { total, passing, failing, warning, notEvaluated, readinessScore, overallStatus };
  }, []);

  const toggleGate = (gateId: string) => {
    setExpandedGates(prev => {
      const next = new Set(prev);
      if (next.has(gateId)) {
        next.delete(gateId);
      } else {
        next.add(gateId);
      }
      return next;
    });
  };

  const handleEvaluateAll = () => {
    setIsEvaluating(true);
    setTimeout(() => setIsEvaluating(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Quality Gates</h1>
              <p className="text-sm text-muted-foreground">Automated quality checkpoints for release readiness</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedRelease} onValueChange={setSelectedRelease}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockReleases.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleEvaluateAll} disabled={isEvaluating}>
                <RefreshCw className={cn("w-4 h-4 mr-2", isEvaluating && "animate-spin")} />
                Evaluate All
              </Button>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Gate
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="gates">All Gates</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="overrides">Overrides</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-12 gap-6">
              {/* Readiness Gauge */}
              <Card className="col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Release Readiness</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ReadinessGauge score={summary.readinessScore} status={summary.overallStatus} />
                </CardContent>
              </Card>

              {/* Stats Grid */}
              <Card className="col-span-5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Gate Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-teal-600">{summary.passing}</div>
                      <div className="text-xs text-muted-foreground">Passing</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-destructive">{summary.failing}</div>
                      <div className="text-xs text-muted-foreground">Failing</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-amber-600">{summary.warning}</div>
                      <div className="text-xs text-muted-foreground">Warning</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-muted-foreground">{summary.notEvaluated}</div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                  </div>
                  <Progress 
                    value={(summary.passing / summary.total) * 100} 
                    className="mt-4 h-2"
                  />
                  <div className="text-xs text-muted-foreground text-center mt-1">
                    {summary.passing} of {summary.total} gates passing
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="col-span-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Gate Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Bell className="w-4 h-4 mr-2" />
                    Configure Notifications
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <History className="w-4 h-4 mr-2" />
                    View Evaluation History
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Blocking Issues */}
            {mockBlockingIssues.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      Blocking Issues ({mockBlockingIssues.length})
                    </CardTitle>
                    <Badge variant="destructive">Action Required</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockBlockingIssues.map((issue, i) => (
                    <BlockingIssueCard key={i} issue={issue} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Gates Overview */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Quality Gates</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="passing">Passing</SelectItem>
                        <SelectItem value="failing">Failing</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="not_evaluated">Not Evaluated</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="blocking">Blocking</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="informational">Informational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredGates.map(gate => (
                  <GateCard
                    key={gate.id}
                    gate={gate}
                    expanded={expandedGates.has(gate.id)}
                    onToggle={() => toggleGate(gate.id)}
                    onEvaluate={() => {}}
                    onRequestOverride={() => setOverrideDialog({ open: true, gateName: gate.name })}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Gates Tab */}
          <TabsContent value="gates" className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search gates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="passing">Passing</SelectItem>
                  <SelectItem value="failing">Failing</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="not_evaluated">Not Evaluated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="blocking">Blocking</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="informational">Informational</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {filteredGates.map(gate => (
                <GateCard
                  key={gate.id}
                  gate={gate}
                  expanded={expandedGates.has(gate.id)}
                  onToggle={() => toggleGate(gate.id)}
                  onEvaluate={() => {}}
                  onRequestOverride={() => setOverrideDialog({ open: true, gateName: gate.name })}
                />
              ))}
              {filteredGates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No gates match your filters
                </div>
              )}
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Readiness Score Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#0d9488" 
                          strokeWidth={2}
                          dot={{ fill: '#0d9488', strokeWidth: 0, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Gate Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <Bar dataKey="passing" stackId="a" fill="#0d9488" />
                        <Bar dataKey="failing" stackId="a" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gate Performance Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Gate</th>
                        {mockTrendData.slice(-7).map(d => (
                          <th key={d.date} className="text-center py-2 px-3 font-medium text-muted-foreground">{d.date}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mockGates.slice(0, 5).map(gate => (
                        <tr key={gate.id} className="border-b border-border">
                          <td className="py-2 px-3 font-medium text-foreground">{gate.name}</td>
                          {mockTrendData.slice(-7).map((d, i) => {
                            const status = i % 3 === 0 ? 'pass' : i % 5 === 0 ? 'fail' : 'pass';
                            const config = ruleStatusConfig[status];
                            const Icon = config.icon;
                            return (
                              <td key={d.date} className="text-center py-2 px-3">
                                <Icon className={cn("w-4 h-4 mx-auto", config.color)} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overrides Tab */}
          <TabsContent value="overrides" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Active Overrides</CardTitle>
                  <Badge variant="secondary">0 Active</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No active overrides</p>
                  <p className="text-sm">Override requests will appear here when gates are bypassed</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Override History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Gate</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Requested By</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="py-3 px-3 font-medium text-foreground">Coverage Gate</td>
                        <td className="py-3 px-3 text-muted-foreground">Temporary</td>
                        <td className="py-3 px-3 text-muted-foreground">John Smith</td>
                        <td className="py-3 px-3">
                          <Badge variant="secondary" className="bg-teal-500/10 text-teal-700">Approved</Badge>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">Jan 10, 2026</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-3 px-3 font-medium text-foreground">Performance Gate</td>
                        <td className="py-3 px-3 text-muted-foreground">One-time</td>
                        <td className="py-3 px-3 text-muted-foreground">Sarah Johnson</td>
                        <td className="py-3 px-3">
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700">Expired</Badge>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">Jan 5, 2026</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Override Request Dialog */}
      <OverrideRequestDialog
        open={overrideDialog.open}
        onOpenChange={(open) => setOverrideDialog({ ...overrideDialog, open })}
        gateName={overrideDialog.gateName}
      />
    </div>
  );
}
