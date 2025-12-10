import { useState, useMemo } from 'react';
import { Search, Filter, Settings, Download, Plus, ArrowRight, GitBranch, MessageSquare, Star, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ObjectiveDetailsPanelNew } from '@/components/okr/ObjectiveDetailsPanelNew';
import { OKRColumnsDialog } from '@/components/okr/OKRColumnsDialog';
import { CreateObjectiveDialog } from '@/modules/objectives/components/ObjectivePanel/CreateObjectiveDialog';
import { useObjectives } from '@/hooks/useObjectives';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { exportOKRsToCSV } from '@/lib/okrExportUtils';
import { useNavigate, useParams } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';
import { ObjectiveTierBadge } from '@/modules/objectives/components/shared/ObjectiveTierBadge';
import { ObjectiveHierarchyDialog } from '@/modules/objectives/components/ObjectiveHierarchyDialog';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  label: string;
  enabled: boolean;
}

const defaultColumns: Column[] = [
  { key: 'id', label: 'ID and Summary', enabled: true },
  { key: 'tier', label: 'Tier', enabled: true },
  { key: 'status', label: 'Status', enabled: true },
  { key: 'work_progress', label: 'Work progress', enabled: true },
  { key: 'kr_progress', label: 'Key results progress', enabled: true },
  { key: 'kr_count', label: 'Key results', enabled: true },
  { key: 'pi', label: 'Quarter', enabled: true },
  { key: 'owner', label: 'Owner', enabled: true },
  { key: 'team', label: 'Team', enabled: true },
  { key: 'due_date', label: 'Due date', enabled: true },
  { key: 'view_tree', label: 'View tree', enabled: true },
];

interface OKRHubProps {
  scopeType?: 'enterprise' | 'portfolio' | 'program' | 'team';
  scopeId?: string;
}

export function OKRHub({ scopeType = 'enterprise', scopeId }: OKRHubProps = {}) {
  const navigate = useNavigate();
  const params = useParams();
  const navigationContext = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [portfolioFilter, setPortfolioFilter] = useState<string>('');
  const [piFilter, setPiFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [myObjectivesOnly, setMyObjectivesOnly] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [hierarchyObjectiveId, setHierarchyObjectiveId] = useState<string | null>(null);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  
  // Tree expand/collapse state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Quick filter states
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [quickStatusFilter, setQuickStatusFilter] = useState<string>('');

  // Fetch snapshots for context
  const { data: snapshots = [] } = useQuery({
    queryKey: ['strategy-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .select('*')
        .order('created_at', { ascending: false});
      if (error) throw error;
      return data;
    },
  });

  // Fetch context-aware portfolios
  const { data: portfolios = [] } = useQuery({
    queryKey: ['portfolios-for-filter', scopeType, scopeId],
    queryFn: async () => {
      if (scopeType === 'portfolio' && scopeId) {
        // If in portfolio context, only show current portfolio
        const { data } = await supabase
          .from('portfolios')
          .select('id, name')
          .eq('id', scopeId);
        return data || [];
      }
      // Otherwise show all portfolios
      const { data } = await supabase
        .from('portfolios')
        .select('id, name')
        .order('name');
      return data || [];
    },
  });

  // Fetch context-aware program increments
  const { data: programIncrements = [] } = useQuery({
    queryKey: ['pis-for-filter', scopeType, scopeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('program_increments')
        .select('id, name')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const effectiveSnapshotId = selectedSnapshotId || snapshots[0]?.id || '';

  // Build filters object with context-aware filtering
  const filters: any = useMemo(() => {
    const baseFilters: any = {
      tier: tierFilter ? [tierFilter] : undefined,
      portfolioIds: portfolioFilter ? [portfolioFilter] : undefined,
      piIds: piFilter ? [piFilter] : undefined,
      statuses: quickStatusFilter || statusFilter ? [quickStatusFilter || statusFilter] : undefined,
      ownerIds: ownerFilter ? [ownerFilter] : undefined,
      search: searchQuery || undefined,
      myObjectives: myObjectivesOnly,
      blockedOnly: showBlockedOnly,
    };

    // Context-sensitive filtering based on scope
    if (scopeType === 'team' && scopeId) {
      baseFilters.teamIds = [scopeId];
      baseFilters.includeParentHierarchy = true;
    } else if (scopeType === 'program' && scopeId) {
      baseFilters.programIds = [scopeId];
      baseFilters.includeChildTeams = true;
      baseFilters.includeParentHierarchy = true;
    } else if (scopeType === 'portfolio' && scopeId) {
      baseFilters.portfolioIds = [scopeId];
      baseFilters.includeAllChildren = true;
    }

    // Also check navigation context from URL params
    const teamId = params.teamId || navigationContext.selectedTeamId;
    const programId = params.programId || navigationContext.selectedProgramId;
    const portfolioId = params.portfolioId || navigationContext.selectedProgramId;

    if (teamId && !baseFilters.teamIds) {
      baseFilters.teamIds = [teamId];
      baseFilters.includeParentHierarchy = true;
    } else if (programId && !baseFilters.programIds) {
      baseFilters.programIds = [programId];
      baseFilters.includeChildTeams = true;
      baseFilters.includeParentHierarchy = true;
    } else if (portfolioId && !baseFilters.portfolioIds) {
      baseFilters.portfolioIds = [portfolioId];
      baseFilters.includeAllChildren = true;
    }

    return baseFilters;
  }, [
    tierFilter,
    portfolioFilter,
    piFilter,
    statusFilter,
    quickStatusFilter,
    ownerFilter,
    searchQuery,
    myObjectivesOnly,
    showBlockedOnly,
    scopeType,
    scopeId,
    params,
    navigationContext,
  ]);

  // Fetch objectives with filters - returns { tree, flat } structure
  const { data: objectivesData, isLoading } = useObjectives(filters);
  const objectives = objectivesData?.flat || [];
  const objectivesTree = objectivesData?.tree || [];

  // Toggle expand/collapse for tree rows
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getScoreColor = (score: number | null): string => {
    if (score === null || score === undefined) return 'text-muted-foreground';
    if (score >= 0.7) return 'text-success';
    if (score >= 0.4) return 'text-warning';
    return 'text-destructive';
  };

  const getStatusBadgeVariant = (status: string) => {
    const statusColors: Record<string, string> = {
      on_track: 'bg-success/10 text-success border-success/20',
      at_risk: 'bg-warning/10 text-warning border-warning/20',
      off_track: 'bg-destructive/10 text-destructive border-destructive/20',
      completed: 'bg-info/10 text-info border-info/20',
      pending: 'bg-muted text-muted-foreground border-border',
      blocked: 'bg-warning/10 text-warning border-warning/20',
    };
    return statusColors[status] || statusColors.pending;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      on_track: 'ON TRACK',
      at_risk: 'AT RISK',
      off_track: 'OFF TRACK',
      completed: 'COMPLETED',
      blocked: 'BLOCKED',
      pending: 'PENDING',
    };
    return labels[status] || 'PENDING';
  };

  const getLevelLabel = (tier: string): string => {
    const labels: Record<string, string> = {
      strategic_goal: 'Strategic Goal',
      portfolio: 'Portfolio',
      program: 'Program',
      team: 'Team',
    };
    return labels[tier] || tier;
  };

  const handleExportCSV = () => {
    const exportData = objectives.map(obj => ({
      id: obj.id,
      summary: obj.summary,
      status: getStatusLabel(obj.status),
      score: obj.score || 0,
      kr_progress: `${obj.key_result_progress || 0}%`,
      work_progress: `${obj.work_progress || 0}%`,
      tier: getLevelLabel(obj.tier),
      program_increment: obj.program_increment_ids?.join(', ') || 'N/A',
      owner: obj.owner_id || 'Unassigned',
      start_date: obj.start_date || 'N/A',
      due_date: obj.due_date || 'N/A',
    }));
    exportOKRsToCSV(exportData, `okr-hub-export-${new Date().toISOString()}.csv`);
  };

  const enabledColumns = columns.filter(col => col.enabled);

  // Count objectives by status
  const statusCounts = {
    blocked: objectives.filter(o => o.is_blocked).length,
    off_track: objectives.filter(o => o.status === 'off_track').length,
    at_risk: objectives.filter(o => o.status === 'at_risk').length,
    on_track: objectives.filter(o => o.status === 'on_track').length,
    completed: objectives.filter(o => o.status === 'completed').length,
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - align header pattern */}
      <div className="h-[72px] border-b border-border bg-background flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Star className="h-5 w-5 text-brand-gold" />
          <h1 className="text-lg font-semibold text-foreground">OKR Hub</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/enterprise/okr-tree')}>
            <GitBranch className="h-4 w-4 mr-2" />
            Tree View
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="bg-brand-gold hover:bg-brand-gold/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Objective
          </Button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="border-b bg-card px-6 py-4">

        {/* Filter Row with responsive grid and design tokens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-[var(--s3)] mb-[var(--s4)]">
          <div className="relative w-full sm:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search objectives or tags"
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Tier</div>
            <Select value={tierFilter || "all"} onValueChange={(val) => setTierFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-full h-9 text-sm bg-background">
                <SelectValue placeholder="Portfolio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="portfolio">Portfolio</SelectItem>
                <SelectItem value="program">Program</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Portfolios</div>
            <Select value={portfolioFilter || "all"} onValueChange={(val) => setPortfolioFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-full h-9 text-sm bg-background">
                <SelectValue placeholder="All Portfolios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Portfolios</SelectItem>
                {portfolios.map((portfolio) => (
                  <SelectItem key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Quarter</div>
            <Select value={piFilter || "all"} onValueChange={(val) => setPiFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-full h-9 text-sm bg-background">
                <SelectValue placeholder="All Quarters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                {programIncrements.map((pi) => (
                  <SelectItem key={pi.id} value={pi.id}>
                    {pi.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Status</div>
            <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-full h-9 text-sm bg-background">
                <SelectValue placeholder="At Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="on_track">On Track</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="off_track">Off Track</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Owner</div>
            <Select value={ownerFilter || "all"} onValueChange={(val) => setOwnerFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-full h-9 text-sm bg-background">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Filters with responsive layout */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-[var(--s2)] sm:gap-[var(--s3)]">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Quick filters</div>
          <div className="flex flex-wrap items-center gap-[var(--s2)]">
            <div className="flex items-center gap-[var(--s2)]">
              <Checkbox
                id="blocked"
                checked={showBlockedOnly}
                onCheckedChange={(checked) => setShowBlockedOnly(!!checked)}
              />
              <label htmlFor="blocked" className="text-sm text-muted-foreground cursor-pointer">
                Only blocked
              </label>
            </div>
            <Button
              variant={quickStatusFilter === 'off_track' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 text-xs px-3 rounded-full"
              onClick={() => setQuickStatusFilter(quickStatusFilter === 'off_track' ? '' : 'off_track')}
            >
              {statusCounts.off_track} Off track
            </Button>
            <Button
              variant={quickStatusFilter === 'at_risk' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 text-xs px-3 rounded-full"
              onClick={() => setQuickStatusFilter(quickStatusFilter === 'at_risk' ? '' : 'at_risk')}
            >
              {statusCounts.at_risk} At risk
            </Button>
            <Button
              variant={quickStatusFilter === 'on_track' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 text-xs px-3 rounded-full"
              onClick={() => setQuickStatusFilter(quickStatusFilter === 'on_track' ? '' : 'on_track')}
            >
              {statusCounts.on_track} On track
            </Button>
            <Button
              variant={quickStatusFilter === 'completed' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 text-xs px-3 rounded-full"
              onClick={() => setQuickStatusFilter(quickStatusFilter === 'completed' ? '' : 'completed')}
            >
              {statusCounts.completed} Completed
            </Button>
          </div>
        </div>
      </div>

      {/* Table Header Actions with responsive padding */}
      <div className="border-b bg-card px-[var(--s3)] sm:px-[var(--s6)] py-[var(--s3)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[var(--s3)]">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Objectives</h2>
          <div className="flex flex-wrap items-center gap-[var(--s2)]">
            <Button variant="ghost" size="sm" onClick={handleExportCSV} className="text-xs sm:text-sm">
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setColumnsDialogOpen(true)} className="text-xs sm:text-sm">
              Columns
            </Button>
            <div className="flex items-center gap-[var(--s2)]">
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">Show only my objectives</span>
              <span className="text-xs sm:text-sm text-muted-foreground sm:hidden">My only</span>
              <Checkbox
                checked={myObjectivesOnly}
                onCheckedChange={(checked) => setMyObjectivesOnly(!!checked)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto px-3 sm:px-6 py-4">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b-2">
              {enabledColumns.map(col => (
                <TableHead key={col.key} className="text-xs font-semibold uppercase text-muted-foreground">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={enabledColumns.length} className="text-center py-8 text-muted-foreground">
                  Loading objectives...
                </TableCell>
              </TableRow>
            ) : objectivesTree.length === 0 ? (
              <TableRow>
                <TableCell colSpan={enabledColumns.length} className="text-center py-8 text-muted-foreground">
                  No objectives found
                </TableCell>
              </TableRow>
            ) : (
              // Render tree structure recursively
              (() => {
                const renderObjectiveRow = (objective: any, depth: number = 0): React.ReactNode[] => {
                  const hasChildren = objective.children && objective.children.length > 0;
                  const isExpanded = expandedIds.has(objective.id);
                  const rows: React.ReactNode[] = [];
                  
                  rows.push(
                    <TableRow
                      key={objective.id}
                      className={cn(
                        "cursor-pointer hover:bg-accent/50",
                        depth > 0 && "bg-muted/30"
                      )}
                      onClick={() => setSelectedObjectiveId(objective.id)}
                    >
                      {enabledColumns.map(col => {
                        if (col.key === 'id') {
                          return (
                            <TableCell key={col.key}>
                              <div 
                                className="flex items-center gap-2"
                                style={{ paddingLeft: `${depth * 24}px` }}
                              >
                                {/* Expand/Collapse Icon */}
                                <div 
                                  className="w-5 flex items-center justify-center flex-shrink-0"
                                  onClick={(e) => {
                                    if (hasChildren) {
                                      e.stopPropagation();
                                      toggleExpand(objective.id);
                                    }
                                  }}
                                >
                                  {hasChildren ? (
                                    isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                                    )
                                  ) : (
                                    <span className="w-4" />
                                  )}
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">
                                  ◎ {objective.id.slice(0, 4)}
                                </span>
                                <span className="text-sm text-foreground">{objective.name || objective.summary}</span>
                                {hasChildren && (
                                  <GitBranch className="h-4 w-4 text-brand-gold" />
                                )}
                                {objective.is_blocked && (
                                  <GitBranch className="h-4 w-4 text-warning" />
                                )}
                              </div>
                            </TableCell>
                          );
                        }
                        if (col.key === 'tier') {
                          return (
                            <TableCell key={col.key}>
                              <ObjectiveTierBadge tier={objective.tier} size="sm" />
                            </TableCell>
                          );
                        }
                        if (col.key === 'status') {
                          return (
                            <TableCell key={col.key}>
                              <Badge className={`text-xs font-semibold ${getStatusBadgeVariant(objective.status)}`}>
                                {getStatusLabel(objective.status)}
                                {objective.score !== null && objective.score !== undefined && (
                                  <span className="ml-1">{objective.score.toFixed(1)}</span>
                                )}
                              </Badge>
                            </TableCell>
                          );
                        }
                        if (col.key === 'work_progress') {
                          return (
                            <TableCell key={col.key}>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="bg-brand-gold h-2 rounded-full"
                                  style={{ width: `${(objective.work_progress || 0) * 100}%` }}
                                />
                              </div>
                            </TableCell>
                          );
                        }
                        if (col.key === 'kr_progress') {
                          return (
                            <TableCell key={col.key}>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="bg-brand-gold h-2 rounded-full"
                                  style={{ width: `${(objective.key_result_progress || 0) * 100}%` }}
                                />
                              </div>
                            </TableCell>
                          );
                        }
                        if (col.key === 'kr_count') {
                          const krCount = (objective as any).keyResultsCount || 0;
                          return (
                            <TableCell key={col.key}>
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-gold text-brand-dark text-xs font-semibold">
                                {krCount}
                              </div>
                            </TableCell>
                          );
                        }
                        if (col.key === 'pi') {
                          const piNames = objective.program_increment_ids?.length > 0 
                            ? objective.program_increment_ids.map((id: string) => id.slice(0, 6)).join(', ')
                            : '—';
                          return (
                            <TableCell key={col.key} className="text-sm text-foreground">
                              {piNames}
                            </TableCell>
                          );
                        }
                        if (col.key === 'owner') {
                          return (
                            <TableCell key={col.key}>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-brand-gold flex items-center justify-center text-brand-dark text-xs font-semibold">
                                  {objective.owner_id ? objective.owner_id.slice(0, 2).toUpperCase() : 'UN'}
                                </div>
                              </div>
                            </TableCell>
                          );
                        }
                        if (col.key === 'team') {
                          return (
                            <TableCell key={col.key} className="text-sm text-foreground">
                              {objective.program_name || objective.portfolio_name || '—'}
                            </TableCell>
                          );
                        }
                        if (col.key === 'due_date') {
                          return (
                            <TableCell key={col.key} className="text-sm text-foreground">
                              {objective.due_date ? new Date(objective.due_date).toLocaleDateString() : '—'}
                            </TableCell>
                          );
                        }
                        if (col.key === 'view_tree') {
                          return (
                            <TableCell key={col.key}>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHierarchyObjectiveId(objective.id);
                                }}
                              >
                                <GitBranch className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          );
                        }
                        return <TableCell key={col.key}>—</TableCell>;
                      })}
                    </TableRow>
                  );
                  
                  // Render children if expanded
                  if (hasChildren && isExpanded) {
                    objective.children.forEach((child: any) => {
                      rows.push(...renderObjectiveRow(child, depth + 1));
                    });
                  }
                  
                  return rows;
                };
                
                return objectivesTree.flatMap((obj: any) => renderObjectiveRow(obj, 0));
              })()
            )}
          </TableBody>
        </Table>

        {/* Pagination Info */}
        {objectivesTree.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>Showing {objectives.length} objective{objectives.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {selectedObjectiveId && (
        <ObjectiveDetailsPanelNew
          objectiveId={selectedObjectiveId}
          open={!!selectedObjectiveId}
          onClose={() => setSelectedObjectiveId(null)}
        />
      )}

      {hierarchyObjectiveId && (
        <ObjectiveHierarchyDialog
          objectiveId={hierarchyObjectiveId}
          open={!!hierarchyObjectiveId}
          onOpenChange={(open) => !open && setHierarchyObjectiveId(null)}
        />
      )}

      <OKRColumnsDialog
        open={columnsDialogOpen}
        onClose={() => setColumnsDialogOpen(false)}
        columns={columns}
        onSave={setColumns}
      />

      <CreateObjectiveDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        tier="portfolio"
      />
    </div>
  );
}

export default OKRHub;
