import { useState } from 'react';
import { Search, Filter, Settings, Download, Plus, ArrowRight, GitBranch, MessageSquare, Star } from 'lucide-react';
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
import { ObjectiveDialog } from '@/components/forms/ObjectiveDialog';
import { useObjectives } from '@/hooks/useObjectives';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { exportOKRsToCSV } from '@/lib/okrExportUtils';
import { useNavigate } from 'react-router-dom';

interface Column {
  key: string;
  label: string;
  enabled: boolean;
}

const defaultColumns: Column[] = [
  { key: 'id', label: 'ID and Summary', enabled: true },
  { key: 'status', label: 'Status', enabled: true },
  { key: 'work_progress', label: 'Work progress', enabled: true },
  { key: 'kr_progress', label: 'Key results progress', enabled: true },
  { key: 'kr_count', label: 'Key results', enabled: true },
  { key: 'pi', label: 'Program Increment', enabled: true },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [portfolioFilter, setPortfolioFilter] = useState<string>('');
  const [piFilter, setPiFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [myObjectivesOnly, setMyObjectivesOnly] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [columns, setColumns] = useState<Column[]>(defaultColumns);

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
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const effectiveSnapshotId = selectedSnapshotId || snapshots[0]?.id || '';

  // Build filters object
  const filters: any = {
    tier: tierFilter ? [tierFilter] : undefined,
    portfolioIds: portfolioFilter ? [portfolioFilter] : undefined,
    piIds: piFilter ? [piFilter] : undefined,
    statuses: quickStatusFilter || statusFilter ? [quickStatusFilter || statusFilter] : undefined,
    ownerIds: ownerFilter ? [ownerFilter] : undefined,
    search: searchQuery || undefined,
    myObjectives: myObjectivesOnly,
    blockedOnly: showBlockedOnly,
  };

  // Fetch objectives with filters
  const { data: objectives = [], isLoading } = useObjectives(filters);

  const getScoreColor = (score: number | null): string => {
    if (score === null || score === undefined) return 'text-muted-foreground';
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadgeVariant = (status: string) => {
    const statusColors: Record<string, string> = {
      on_track: 'bg-green-100 text-green-800 border-green-200',
      at_risk: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      off_track: 'bg-red-100 text-red-800 border-red-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      pending: 'bg-gray-100 text-gray-800 border-gray-200',
      blocked: 'bg-orange-100 text-orange-800 border-orange-200',
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
    blocked: objectives.filter(o => o.blocked).length,
    off_track: objectives.filter(o => o.status === 'off_track').length,
    at_risk: objectives.filter(o => o.status === 'at_risk').length,
    on_track: objectives.filter(o => o.status === 'on_track').length,
    completed: objectives.filter(o => o.status === 'completed').length,
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with Title and Action Buttons */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Star className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">OKR Hub</h1>
            <Badge variant="secondary" className="text-xs font-medium">NEW</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/enterprise/objectives')}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to all objectives
            </Button>
            <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/enterprise/okr-tree')}>
              <GitBranch className="h-4 w-4 mr-2" />
              Go to objectives tree
            </Button>
            <Button variant="ghost" size="sm" className="text-sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Give feedback
            </Button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search objectives or tags"
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Tier</div>
            <Select value={tierFilter || "all"} onValueChange={(val) => setTierFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-[140px] h-9 text-sm bg-background">
                <SelectValue placeholder="Portfolio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="portfolio">Portfolio</SelectItem>
                <SelectItem value="program">Program</SelectItem>
                <SelectItem value="team">Team</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Portfolios</div>
            <Select value={portfolioFilter || "all"} onValueChange={(val) => setPortfolioFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-[160px] h-9 text-sm bg-background">
                <SelectValue placeholder="Digital Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Portfolios</SelectItem>
                <SelectItem value="portfolio-1">Digital Services</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Program Increments</div>
            <Select value={piFilter || "all"} onValueChange={(val) => setPiFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-[120px] h-9 text-sm bg-background">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PIs</SelectItem>
                <SelectItem value="pi-5">PI-5</SelectItem>
                <SelectItem value="pi-6">PI-6</SelectItem>
                <SelectItem value="pi-7">PI-7</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Statuses</div>
            <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-[120px] h-9 text-sm bg-background">
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

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Owners</div>
            <Select value={ownerFilter || "all"} onValueChange={(val) => setOwnerFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-[120px] h-9 text-sm bg-background">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Quick filters</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
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

      {/* Table Header Actions */}
      <div className="border-b bg-card px-6 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Objectives</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleExportCSV}>
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setColumnsDialogOpen(true)}>
              Columns shown
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show only my objectives</span>
              <Checkbox
                checked={myObjectivesOnly}
                onCheckedChange={(checked) => setMyObjectivesOnly(!!checked)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <Table>
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
            ) : objectives.length === 0 ? (
              <TableRow>
                <TableCell colSpan={enabledColumns.length} className="text-center py-8 text-muted-foreground">
                  No objectives found
                </TableCell>
              </TableRow>
            ) : (
              objectives.map((objective) => (
                <TableRow
                  key={objective.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setSelectedObjectiveId(objective.id)}
                >
                  {enabledColumns.map(col => {
                    if (col.key === 'id') {
                      return (
                        <TableCell key={col.key}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              ◎ {objective.id.slice(0, 4)}
                            </span>
                            <span className="text-sm text-foreground">{objective.summary}</span>
                            {objective.blocked && (
                              <GitBranch className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
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
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gray-800 h-2 rounded-full"
                              style={{ width: `${objective.work_progress || 0}%` }}
                            />
                          </div>
                        </TableCell>
                      );
                    }
                    if (col.key === 'kr_progress') {
                      return (
                        <TableCell key={col.key}>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gray-800 h-2 rounded-full"
                              style={{ width: `${objective.key_result_progress || 0}%` }}
                            />
                          </div>
                        </TableCell>
                      );
                    }
                    if (col.key === 'kr_count') {
                      return (
                        <TableCell key={col.key}>
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-semibold">
                            2
                          </div>
                        </TableCell>
                      );
                    }
                    if (col.key === 'pi') {
                      return (
                        <TableCell key={col.key} className="text-sm text-foreground">
                          {objective.program_increment_ids?.join(', ') || 'PI-5'}
                        </TableCell>
                      );
                    }
                    if (col.key === 'owner') {
                      return (
                        <TableCell key={col.key}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                              JD
                            </div>
                          </div>
                        </TableCell>
                      );
                    }
                    if (col.key === 'team') {
                      return (
                        <TableCell key={col.key} className="text-sm text-foreground">
                          Digital Services
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
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <GitBranch className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      );
                    }
                    return <TableCell key={col.key}>—</TableCell>;
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Info */}
        {objectives.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>1 - 1 of 1</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                ‹
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-3">
                1
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                ›
              </Button>
            </div>
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

      <OKRColumnsDialog
        open={columnsDialogOpen}
        onClose={() => setColumnsDialogOpen(false)}
        columns={columns}
        onSave={setColumns}
      />

      <ObjectiveDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </div>
  );
}

export default OKRHub;
