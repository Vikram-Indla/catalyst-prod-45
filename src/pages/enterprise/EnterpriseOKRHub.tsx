import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Download, SlidersHorizontal, CheckCircle2, AlertTriangle, XCircle, Circle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ObjectiveDetailsPanelNew } from '@/components/okr/ObjectiveDetailsPanelNew';
import { ObjectiveDialogNew } from '@/components/forms/ObjectiveDialogNew';
import { toast } from 'sonner';

interface Objective {
  id: string;
  summary: string;
  tier: string;
  status: string;
  score: number | null;
  key_result_progress: number;
  owner_id: string | null;
  snapshot_id: string | null;
  goal_id: string | null;
}

export default function EnterpriseOKRHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['okr-hub-objectives', searchQuery, tierFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('objectives')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('summary', `%${searchQuery}%`);
      }

      if (tierFilter !== 'all') {
        query = query.eq('tier', tierFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Objective[];
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'at_risk': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'off_track': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      case 'blocked': return <Circle className="h-4 w-4 text-gray-600" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'at_risk': return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'off_track': return 'bg-red-500/20 text-red-700 dark:text-red-400';
      case 'completed': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'blocked': return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
      default: return 'bg-muted';
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 0.7) return 'text-green-600 dark:text-green-400';
    if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const handleExport = () => {
    toast.info('Export feature coming soon');
  };

  const quickFilterCounts = {
    on_track: objectives.filter(o => o.status === 'on_track').length,
    at_risk: objectives.filter(o => o.status === 'at_risk').length,
    off_track: objectives.filter(o => o.status === 'off_track').length,
    completed: objectives.filter(o => o.status === 'completed').length,
    blocked: objectives.filter(o => o.status === 'blocked').length,
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">OKR Hub</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Objective
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="px-6 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All ({objectives.length})
          </Button>
          <Button
            variant={statusFilter === 'on_track' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('on_track')}
            className="gap-1"
          >
            <CheckCircle2 className="h-3 w-3" />
            On Track ({quickFilterCounts.on_track})
          </Button>
          <Button
            variant={statusFilter === 'at_risk' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('at_risk')}
            className="gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            At Risk ({quickFilterCounts.at_risk})
          </Button>
          <Button
            variant={statusFilter === 'off_track' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('off_track')}
            className="gap-1"
          >
            <XCircle className="h-3 w-3" />
            Off Track ({quickFilterCounts.off_track})
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('completed')}
            className="gap-1"
          >
            <CheckCircle2 className="h-3 w-3" />
            Completed ({quickFilterCounts.completed})
          </Button>
          <Button
            variant={statusFilter === 'blocked' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('blocked')}
            className="gap-1"
          >
            <Circle className="h-3 w-3" />
            Blocked ({quickFilterCounts.blocked})
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mx-6 mt-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search objectives..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tier</label>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="strategic">Strategic Goals</SelectItem>
                  <SelectItem value="portfolio">Portfolio Objectives</SelectItem>
                  <SelectItem value="program">Program Objectives</SelectItem>
                  <SelectItem value="team">Team Objectives</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="off_track">Off Track</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Objectives Grid */}
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : objectives.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No objectives found
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50" style={{ height: 'var(--grid-hdr)' }}>
                    <th className="text-left px-4 text-sm font-medium">ID</th>
                    <th className="text-left px-4 text-sm font-medium">Summary</th>
                    <th className="text-left px-4 text-sm font-medium">Tier</th>
                    <th className="text-left px-4 text-sm font-medium">Status</th>
                    <th className="text-left px-4 text-sm font-medium">Score</th>
                    <th className="text-left px-4 text-sm font-medium">KR Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {objectives.map((objective) => (
                    <tr 
                      key={objective.id} 
                      className="border-b hover:bg-accent cursor-pointer" 
                      style={{ height: 'var(--grid-row)' }}
                      onClick={() => setSelectedObjectiveId(objective.id)}
                    >
                      <td className="px-4 text-sm font-mono">{objective.id.slice(0, 8)}</td>
                      <td className="px-4 text-sm font-medium">{objective.summary}</td>
                      <td className="px-4 text-sm capitalize">
                        {objective.tier.replace('_', ' ')}
                      </td>
                      <td className="px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(objective.status)}
                          <Badge className={`text-xs ${getStatusColor(objective.status)}`}>
                            {objective.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4">
                        <span className={`text-sm font-semibold ${getScoreColor(objective.score)}`}>
                          {objective.score !== null ? objective.score.toFixed(2) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[120px]">
                            <div 
                              className="h-full bg-primary transition-all"
                              style={{ width: `${Math.round(objective.key_result_progress * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground min-w-[40px]">
                            {Math.round(objective.key_result_progress * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Objective Details Panel */}
      {selectedObjectiveId && (
        <ObjectiveDetailsPanelNew
          objectiveId={selectedObjectiveId}
          open={!!selectedObjectiveId}
          onClose={() => setSelectedObjectiveId(null)}
        />
      )}

      {/* New Objective Dialog */}
      <ObjectiveDialogNew
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
      />
    </div>
  );
}
