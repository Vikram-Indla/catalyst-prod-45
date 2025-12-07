import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams } from '@/hooks/useTeams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Filter, Grid, List } from 'lucide-react';
import { TeamCard } from '@/components/teams/TeamCard';
import { TeamDetailsDrawer } from '@/components/teams/TeamDetailsDrawer';
import { CreateTeamDialog } from '@/components/teams/CreateTeamDialog';

export default function TeamsDirectory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: teams = [], isLoading } = useTeams({
    search,
    status: statusFilter === 'all' ? undefined : statusFilter,
    teamTypes: typeFilter === 'all' ? undefined : [typeFilter as any],
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-[72px] border-b border-border bg-background px-3 sm:px-6 flex items-center">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">Teams</h1>
          <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="flex-shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="AGILE">Agile / Scrum</SelectItem>
                  <SelectItem value="KANBAN">Kanban</SelectItem>
                  <SelectItem value="COP">CoP</SelectItem>
                </SelectContent>
            </Select>

            <div className="flex items-center gap-1 border border-border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p>No teams found</p>
            <Button variant="link" onClick={() => setCreateDialogOpen(true)}>
              Create your first team
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onClick={() => setSelectedTeamId(team.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                variant="list"
                onClick={() => setSelectedTeamId(team.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawers & Dialogs */}
      <TeamDetailsDrawer
        teamId={selectedTeamId}
        open={!!selectedTeamId}
        onOpenChange={(open) => !open && setSelectedTeamId(null)}
      />

      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
