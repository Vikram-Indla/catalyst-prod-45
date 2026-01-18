/**
 * TestPlansPage — Enterprise Test Plans management page
 * 
 * Features:
 * - List/Grid view modes
 * - Filtering by status, owner, release, search
 * - CRUD operations for test plans
 * - Health metrics dashboard
 * - Bulk actions support
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Download,
  FileText,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Loader2,
  ClipboardList,
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useTestPlans,
  useDeleteTestPlan,
  useCloneTestPlan,
} from '@/hooks/test-management';
import { useProjects } from '@/hooks/test-management/useProjects';
import { TMTestPlan, TestPlanStatus } from '@/types/test-management';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CreateTestPlanDialog } from '@/components/test-plans/CreateTestPlanDialog';

type ViewMode = 'list' | 'grid';

const STATUS_CONFIG: Record<TestPlanStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  active: { label: 'Active', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  completed: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
  archived: { label: 'Archived', color: 'text-amber-600', bgColor: 'bg-amber-100' },
};

export default function TestPlansPage() {
  const navigate = useNavigate();

  // Get current project
  const { data: projects } = useProjects();
  const projectId = projects?.[0]?.id;

  // Fetch test plans
  const { data: testPlans, isLoading, refetch } = useTestPlans(projectId);
  const deletePlanMutation = useDeleteTestPlan();
  const clonePlanMutation = useCloneTestPlan();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    if (!testPlans) return [];
    return testPlans.filter(plan => {
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        if (
          !plan.name.toLowerCase().includes(search) &&
          !plan.plan_key.toLowerCase().includes(search) &&
          !(plan.description || '').toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      if (statusFilter !== 'all' && plan.status !== statusFilter) return false;
      if (ownerFilter !== 'all' && plan.owner_id !== ownerFilter) return false;
      return true;
    });
  }, [testPlans, searchQuery, statusFilter, ownerFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!testPlans) return { total: 0, active: 0, completed: 0, overdue: 0, avgPassRate: 0 };
    
    const active = testPlans.filter(p => p.status === 'active').length;
    const completed = testPlans.filter(p => p.status === 'completed').length;
    const now = new Date();
    const overdue = testPlans.filter(p => 
      p.status === 'active' && p.end_date && new Date(p.end_date) < now
    ).length;
    
    const passRates = testPlans.map(p => {
      const executed = p.passed_count + p.failed_count + p.blocked_count;
      return executed > 0 ? (p.passed_count / executed) * 100 : 0;
    });
    const avgPassRate = passRates.length > 0 
      ? Math.round(passRates.reduce((a, b) => a + b, 0) / passRates.length)
      : 0;

    return { total: testPlans.length, active, completed, overdue, avgPassRate };
  }, [testPlans]);

  // Unique owners for filter
  const owners = useMemo(() => {
    if (!testPlans) return [];
    const ownerMap = new Map<string, { id: string; name: string }>();
    testPlans.forEach(plan => {
      if (plan.owner_id && plan.owner?.full_name) {
        ownerMap.set(plan.owner_id, { id: plan.owner_id, name: plan.owner.full_name });
      }
    });
    return Array.from(ownerMap.values());
  }, [testPlans]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success('Test plans refreshed');
  }, [refetch]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredPlans.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [filteredPlans]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deletePlanMutation.mutateAsync(id);
      toast.success('Test plan deleted');
    } catch (error) {
      toast.error('Failed to delete test plan');
    }
  }, [deletePlanMutation]);

  const handleClone = useCallback(async (id: string) => {
    try {
      await clonePlanMutation.mutateAsync(id);
      toast.success('Test plan cloned');
    } catch (error) {
      toast.error('Failed to clone test plan');
    }
  }, [clonePlanMutation]);

  const handleExport = useCallback((format: 'csv' | 'xlsx') => {
    toast.info(`Exporting as ${format.toUpperCase()}...`);
    // TODO: Implement export
  }, []);

  const getProgressInfo = (plan: TMTestPlan) => {
    const executed = plan.passed_count + plan.failed_count + plan.blocked_count + plan.skipped_count;
    const progress = plan.total_tests > 0 ? Math.round((executed / plan.total_tests) * 100) : 0;
    const passRate = executed > 0 ? Math.round((plan.passed_count / executed) * 100) : 0;
    return { progress, passRate, executed };
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Breadcrumb & Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground uppercase tracking-wide">RELEASES</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">Test Plans</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCcw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Test Plan
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Plans</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Pass Rate</p>
                <p className="text-2xl font-bold">{stats.avgPassRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search test plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Owners" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="all">All Owners</SelectItem>
            {owners.map(owner => (
              <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear Selection
          </Button>
          <Button variant="destructive" size="sm">
            Delete Selected
          </Button>
        </div>
      )}

      {/* Content */}
      {filteredPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="w-16 h-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Test Plans Found</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {searchQuery || statusFilter !== 'all' || ownerFilter !== 'all'
              ? "No test plans match your current filters. Try adjusting your search criteria."
              : "Get started by creating your first test plan to organize and track your testing efforts."
            }
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Test Plan
          </Button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedIds.size === filteredPlans.length && filteredPlans.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[100px]">Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[120px]">Owner</TableHead>
                <TableHead className="w-[100px]">Tests</TableHead>
                <TableHead className="w-[150px]">Progress</TableHead>
                <TableHead className="w-[100px]">Pass Rate</TableHead>
                <TableHead className="w-[110px]">End Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map(plan => {
                const { progress, passRate } = getProgressInfo(plan);
                const statusConfig = STATUS_CONFIG[plan.status];
                const isOverdue = plan.status === 'active' && plan.end_date && new Date(plan.end_date) < new Date();

                return (
                  <TableRow
                    key={plan.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/releases/test-plans/${plan.id}`)}
                  >
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(plan.id)}
                        onCheckedChange={(checked) => handleSelectOne(plan.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {plan.plan_key}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground truncate max-w-[300px]">
                        {plan.name}
                      </div>
                      {plan.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {plan.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(statusConfig.bgColor, statusConfig.color, 'border-0')}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {plan.owner ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={plan.owner.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {(plan.owner.full_name || 'U').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-[80px]">
                            {plan.owner.full_name?.split(' ')[0]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {plan.total_tests}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-2 w-20" />
                        <span className="text-xs text-muted-foreground">{progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "font-medium",
                        passRate >= 80 ? "text-green-600" : passRate >= 50 ? "text-amber-600" : "text-red-600"
                      )}>
                        {passRate}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {plan.end_date ? (
                        <div className={cn("text-sm", isOverdue && "text-red-600 font-medium")}>
                          {format(new Date(plan.end_date), 'MMM d, yyyy')}
                          {isOverdue && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.map(plan => {
            const { progress, passRate } = getProgressInfo(plan);
            const statusConfig = STATUS_CONFIG[plan.status];
            const isOverdue = plan.status === 'active' && plan.end_date && new Date(plan.end_date) < new Date();

            return (
              <Card
                key={plan.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/releases/test-plans/${plan.id}`)}
              >
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-mono text-xs text-muted-foreground">{plan.plan_key}</p>
                      <h3 className="font-semibold text-foreground line-clamp-2">{plan.name}</h3>
                    </div>
                    <Badge variant="outline" className={cn(statusConfig.bgColor, statusConfig.color, 'border-0')}>
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {plan.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{plan.description}</p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Tests:</span>
                      <span className="font-medium">{plan.total_tests}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Pass Rate:</span>
                      <span className={cn(
                        "font-medium",
                        passRate >= 80 ? "text-green-600" : passRate >= 50 ? "text-amber-600" : "text-red-600"
                      )}>
                        {passRate}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    {plan.owner ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={plan.owner.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {(plan.owner.full_name || 'U').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          {plan.owner.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No owner</span>
                    )}

                    {plan.end_date && (
                      <div className={cn("flex items-center gap-1 text-sm", isOverdue && "text-red-600")}>
                        <Calendar className="w-3 h-3" />
                        {format(new Date(plan.end_date), 'MMM d')}
                        {isOverdue && <AlertTriangle className="w-3 h-3" />}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateTestPlanDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        projectId={projectId}
      />
    </div>
  );
}
