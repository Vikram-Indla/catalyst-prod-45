import { useState } from 'react';
import { Search, Filter, Settings, Download, Plus } from 'lucide-react';
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
import { ObjectiveDetailsPanelNew } from '@/components/okr/ObjectiveDetailsPanelNew';
import { OKRColumnsDialog } from '@/components/okr/OKRColumnsDialog';
import { useObjectives } from '@/hooks/useObjectives';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Column {
  key: string;
  label: string;
  enabled: boolean;
}

const defaultColumns: Column[] = [
  { key: 'id', label: 'ID', enabled: true },
  { key: 'summary', label: 'Summary', enabled: true },
  { key: 'level', label: 'Level', enabled: true },
  { key: 'score', label: 'Score', enabled: true },
  { key: 'kr_progress', label: 'KR Progress %', enabled: true },
  { key: 'work_progress', label: 'Work Progress %', enabled: true },
  { key: 'status', label: 'Status', enabled: true },
  { key: 'pi', label: 'Program Increment(s)', enabled: true },
  { key: 'owner', label: 'Owner', enabled: true },
  { key: 'parent', label: 'Parent Goal/Objective', enabled: false },
  { key: 'kr_count', label: '# of Key Results', enabled: false },
  { key: 'work_count', label: '# of Aligned Work Items', enabled: false },
];

interface OKRHubProps {
  scopeType?: 'enterprise' | 'portfolio' | 'program' | 'team';
  scopeId?: string;
}

export function OKRHub({ scopeType = 'enterprise', scopeId }: OKRHubProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [piFilter, setPiFilter] = useState<string>('');
  const [myObjectivesOnly, setMyObjectivesOnly] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [columns, setColumns] = useState<Column[]>(defaultColumns);

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

  // Fetch objectives with filters
  const { data: objectives = [], isLoading } = useObjectives({
    tier: levelFilter ? [levelFilter] : undefined,
    statuses: statusFilter ? [statusFilter] : undefined,
    ownerIds: ownerFilter ? [ownerFilter] : undefined,
    search: searchQuery || undefined,
    myObjectives: myObjectivesOnly,
  });

  const getScoreColor = (score: number | null): string => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    if (status === 'on_track') return 'default';
    if (status === 'at_risk') return 'secondary';
    return 'destructive';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      on_track: 'On Track',
      at_risk: 'At Risk',
      off_track: 'Off Track',
      completed: 'Completed',
      blocked: 'Blocked',
    };
    return labels[status] || status;
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
    const enabledCols = columns.filter((c) => c.enabled);
    const headers = enabledCols.map((c) => c.label).join(',');
    const rows = objectives.map((obj) => {
      return enabledCols
        .map((col) => {
          switch (col.key) {
            case 'id':
              return obj.id.slice(0, 8);
            case 'summary':
              return `"${obj.summary}"`;
            case 'level':
              return getLevelLabel(obj.tier);
            case 'score':
              return obj.confidence_score?.toFixed(1) || 'N/A';
            case 'kr_progress':
              return `${Math.round((obj.key_result_progress || 0) * 100)}%`;
            case 'work_progress':
              return `${Math.round((obj.work_progress || 0) * 100)}%`;
            case 'status':
              return getStatusLabel(obj.status);
            case 'owner':
              return obj.owner_id || 'Unassigned';
            default:
              return '';
          }
        })
        .join(',');
    });

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `okr-hub-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const enabledColumns = columns.filter((c) => c.enabled);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">OKR Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage objectives and key results across all levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setColumnsDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Columns
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Objective
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search objectives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Levels</SelectItem>
            <SelectItem value="strategic_goal">Strategic Goal</SelectItem>
            <SelectItem value="portfolio">Portfolio</SelectItem>
            <SelectItem value="program">Program</SelectItem>
            <SelectItem value="team">Team</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="on_track">On Track</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
            <SelectItem value="off_track">Off Track</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={myObjectivesOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMyObjectivesOnly(!myObjectivesOnly)}
        >
          My Objectives
        </Button>

        {(searchQuery || levelFilter || statusFilter || myObjectivesOnly) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setLevelFilter('');
              setStatusFilter('');
              setMyObjectivesOnly(false);
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Quick Status Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Quick filter:</span>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setStatusFilter('on_track')}
        >
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
          On Track
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setStatusFilter('at_risk')}
        >
          <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
          At Risk
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setStatusFilter('off_track')}
        >
          <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
          Off Track
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setStatusFilter('completed')}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
          Completed
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setStatusFilter('blocked')}
        >
          <span className="w-2 h-2 rounded-full bg-gray-500 mr-2" />
          Blocked
        </Button>
      </div>

      {/* Objectives Grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                {enabledColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-background divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={enabledColumns.length} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : objectives.length === 0 ? (
                <tr>
                  <td colSpan={enabledColumns.length} className="px-4 py-8 text-center text-muted-foreground">
                    No objectives found matching your filters
                  </td>
                </tr>
              ) : (
                objectives.map((objective) => (
                  <tr
                    key={objective.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedObjectiveId(objective.id)}
                  >
                    {enabledColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm">
                        {col.key === 'id' && (
                          <span className="text-muted-foreground">{objective.id.slice(0, 8)}</span>
                        )}
                        {col.key === 'summary' && (
                          <span className="text-primary hover:underline">{objective.summary}</span>
                        )}
                        {col.key === 'level' && (
                          <Badge variant="outline">{getLevelLabel(objective.tier)}</Badge>
                        )}
                        {col.key === 'score' && (
                          <span className={`font-semibold ${getScoreColor(objective.confidence_score)}`}>
                            {objective.confidence_score?.toFixed(1) || 'N/A'}
                          </span>
                        )}
                        {col.key === 'kr_progress' && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 max-w-[100px] h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${(objective.key_result_progress || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Math.round((objective.key_result_progress || 0) * 100)}%
                            </span>
                          </div>
                        )}
                        {col.key === 'work_progress' && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 max-w-[100px] h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-secondary rounded-full"
                                style={{ width: `${(objective.work_progress || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Math.round((objective.work_progress || 0) * 100)}%
                            </span>
                          </div>
                        )}
                        {col.key === 'status' && (
                          <Badge variant={getStatusBadgeVariant(objective.status)}>
                            {getStatusLabel(objective.status)}
                          </Badge>
                        )}
                        {col.key === 'owner' && (
                          <span className="text-muted-foreground">
                            {objective.owner_id ? objective.owner_id.slice(0, 8) : 'Unassigned'}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {objectives.length} objective{objectives.length !== 1 ? 's' : ''}
      </div>

      {/* Objective Details Panel */}
      <ObjectiveDetailsPanelNew
        objectiveId={selectedObjectiveId}
        open={!!selectedObjectiveId}
        onClose={() => setSelectedObjectiveId(null)}
      />

      {/* Columns Dialog */}
      <OKRColumnsDialog
        open={columnsDialogOpen}
        onClose={() => setColumnsDialogOpen(false)}
        columns={columns}
        onSave={setColumns}
      />
    </div>
  );
}

export default OKRHub;
