import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Download, MoreHorizontal, AlertTriangle, CheckCircle2, Clock, Grid3x3, GitBranch, List } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DependencyDetailsDrawer } from '@/components/dependencies/DependencyDetailsDrawer';
import { DependencyMatrix } from '@/components/dependencies/DependencyMatrix';
import { DependencyWheelMap } from '@/components/dependencies/DependencyWheelMap';
import { DependencyContextMenu } from '@/components/dependencies/DependencyContextMenu';
import { DependenciesSidebar } from '@/components/dependencies/DependenciesSidebar';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';

export default function DependenciesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { programId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [piFilter, setPiFilter] = useState<string | undefined>(undefined);
  const [levelFilter, setLevelFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'yourRequests' | 'toDo' | 'all'>('all');
  const [visualizationMode, setVisualizationMode] = useState<'list' | 'matrix' | 'wheel'>('list');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDependencyId, setSelectedDependencyId] = useState<string | undefined>();

  // Get first program as default if no programId in params
  const { data: defaultProgram } = useQuery({
    queryKey: ['first-program'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id')
        .order('name')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !programId,
  });

  const activeProgramId = programId || defaultProgram?.id;

  // Fetch program increments for filter
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch dependencies with filters
  const { data: dependencies, isLoading } = useQuery({
    queryKey: ['dependencies-grid', piFilter, levelFilter, typeFilter, statusFilter, viewMode],
    queryFn: async () => {
      let query = supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(id, name, display_id, team_id, teams(name), program_id, programs(name)),
          to_feature:features!dependencies_to_feature_id_fkey(id, name, display_id, team_id, teams(name), program_id, programs(name)),
          needed_by_sprint:iterations!dependencies_needed_by_sprint_id_fkey(id, name, start_date),
          committed_by_sprint:iterations!dependencies_committed_by_sprint_id_fkey(id, name, start_date),
          requesting_team:teams!dependencies_requesting_team_id_fkey(id, name),
          depends_on_team:teams!dependencies_depends_on_team_id_fkey(id, name),
          requesting_program:programs!dependencies_requesting_program_id_fkey(id, name),
          depends_on_program:programs!dependencies_depends_on_program_id_fkey(id, name),
          external_entity:external_entities(id, name, entity_type)
        `);

      if (piFilter && piFilter !== 'all') query = query.eq('pi_id', piFilter);
      if (levelFilter && levelFilter !== 'all') query = query.eq('dependency_level', levelFilter as any);
      if (typeFilter && typeFilter !== 'all') query = query.eq('type', typeFilter as any);
      if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter as any);

      // TODO: Implement viewMode filtering based on current user
      // yourRequests: where requesting_team/program matches user's context
      // toDo: where depends_on_team/program matches user's context AND status requires action

      const { data, error } = await query.order('rank_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filteredDependencies = dependencies?.filter(dep => {
    if (!searchTerm) return true;
    return (
      dep.from_feature?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dep.to_feature?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dep.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleRowClick = (depId: string) => {
    setSelectedDependencyId(depId);
    setDrawerOpen(true);
  };

  const handleAddDependency = () => {
    setSelectedDependencyId(undefined);
    setDrawerOpen(true);
  };

  const handleExport = () => {
    if (!filteredDependencies?.length) {
      toast.error('No dependencies to export');
      return;
    }

    const headers = ['Action Required', 'Requesting Team', 'Requested For', 'Depends On Team', 'Need By', 'Commit By', 'Status'];
    const csvData = filteredDependencies.map(dep => [
      dep.from_feature?.name || '',
      dep.requesting_team?.name || dep.requesting_program?.name || '',
      dep.to_feature?.name || '',
      dep.depends_on_team?.name || dep.depends_on_program?.name || '',
      dep.needed_by_date || dep.needed_by_sprint?.start_date || '',
      dep.committed_by_date || dep.committed_by_sprint?.start_date || '',
      dep.status || ''
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dependencies-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Dependencies exported');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      pending_commit: { variant: 'outline', icon: Clock },
      negotiation: { variant: 'secondary', icon: Clock },
      committed: { variant: 'default', icon: CheckCircle2 },
      in_progress: { variant: 'secondary', icon: Clock },
      delivered: { variant: 'default', icon: CheckCircle2 },
      blocked: { variant: 'destructive', icon: AlertTriangle },
      rejected: { variant: 'destructive', icon: AlertTriangle },
      no_work_done: { variant: 'outline', icon: AlertTriangle },
    };

    const config = statusConfig[status] || { variant: 'outline' as const, icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="text-xs gap-1">
        <Icon className="h-3 w-3" />
        {status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <div className="flex h-full overflow-hidden w-full">
      <DependenciesSidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="h-full flex flex-col p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold truncate">Dependencies</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Manage cross-team and cross-program dependencies</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={visualizationMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setVisualizationMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={visualizationMode === 'matrix' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setVisualizationMode('matrix')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={visualizationMode === 'wheel' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setVisualizationMode('wheel')}
                >
                  <GitBranch className="h-4 w-4" />
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4 mr-2" />
                    More Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export to CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/reports/dependencies/maps')}>
                    View Dependency Maps
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/reports/dependencies/story-link-report')}>
                    Story Link Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" onClick={handleAddDependency}>
                <Plus className="h-4 w-4 mr-2" />
                Add Dependency
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 mb-4">
            <div className="relative sm:col-span-2 lg:col-span-3 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search dependencies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <Select value={piFilter} onValueChange={setPiFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All PIs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PIs</SelectItem>
                {programIncrements?.map(pi => (
                  <SelectItem key={pi.id} value={pi.id}>{pi.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="program">Program</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sequential">Sequential</SelectItem>
                <SelectItem value="concurrent">Concurrent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_commit">Pending Commit</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="committed">Committed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Visualization Views */}
          {visualizationMode === 'matrix' && (
            <DependencyMatrix 
              piId={piFilter} 
              onDependencyClick={handleRowClick}
            />
          )}
          
          {visualizationMode === 'wheel' && (
            <DependencyWheelMap 
              piId={piFilter} 
              onDependencyClick={handleRowClick}
            />
          )}

          {visualizationMode === 'list' && (
            <>
              {/* View Mode Tabs */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="mb-4">
                <TabsList>
                  <TabsTrigger value="yourRequests">Your Requests</TabsTrigger>
                  <TabsTrigger value="toDo">To Do</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Dependencies Table */}
              <Card className="flex-1 overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full p-4">
                    <p className="text-muted-foreground text-sm">Loading dependencies...</p>
                  </div>
                ) : !filteredDependencies?.length ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 p-4 sm:p-8">
                    <AlertTriangle className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                    <div className="text-center">
                      <h3 className="font-semibold text-base sm:text-lg mb-2">No Dependencies Found</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                        Create your first dependency to track cross-team commitments
                      </p>
                      <Button onClick={handleAddDependency} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Dependency
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                    <Table className="min-w-[800px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action Required</TableHead>
                          <TableHead>Requesting</TableHead>
                          <TableHead>Requested For</TableHead>
                          <TableHead>Depends On</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Need By</TableHead>
                          <TableHead>Commit By</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDependencies.map((dep) => (
                          <DependencyContextMenu
                            key={dep.id}
                            onEdit={() => handleRowClick(dep.id)}
                            onDelete={async () => {
                              if (confirm('Delete this dependency?')) {
                                await supabase.from('dependencies').delete().eq('id', dep.id);
                                queryClient.invalidateQueries({ queryKey: ['dependencies-grid'] });
                                toast.success('Dependency deleted');
                              }
                            }}
                            onChangeStatus={async (status) => {
                              await supabase.from('dependencies').update({ status: status as any }).eq('id', dep.id);
                              queryClient.invalidateQueries({ queryKey: ['dependencies-grid'] });
                              toast.success('Status updated');
                            }}
                          >
                            <TableRow
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleRowClick(dep.id)}
                            >
                              <TableCell className="font-medium">
                                {dep.from_feature?.name || dep.description || '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {dep.requesting_team?.name || dep.requesting_program?.name || '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {dep.to_feature?.name || dep.external_entity?.name || '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {dep.depends_on_team?.name || dep.depends_on_program?.name || dep.external_entity?.name || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {dep.dependency_level || dep.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {dep.needed_by_date || dep.needed_by_sprint?.name || '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {dep.committed_by_date || dep.committed_by_sprint?.name || '-'}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(dep.status || 'open')}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    dep.risk_level === 'high' ? 'destructive' :
                                    dep.risk_level === 'med' ? 'secondary' :
                                    'outline'
                                  }
                                  className="text-xs"
                                >
                                  {dep.risk_level?.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {(dep.blocked_requestor || dep.blocked_respondent) && (
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                )}
                              </TableCell>
                            </TableRow>
                          </DependencyContextMenu>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* Dependency Details Drawer */}
          <DependencyDetailsDrawer
            open={drawerOpen}
            onClose={() => {
              setDrawerOpen(false);
              setSelectedDependencyId(undefined);
            }}
            dependencyId={selectedDependencyId}
          />
        </div>
      </div>
    </div>
  );
}
