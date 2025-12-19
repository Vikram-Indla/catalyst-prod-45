import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Download, MoreHorizontal, AlertTriangle, CheckCircle2, Clock, Grid3x3, GitBranch, List, Filter, Map as MapIcon, X, Layers } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DependencyDetailsDrawer } from '@/components/dependencies/DependencyDetailsDrawer';
import { DependencyMatrix } from '@/components/dependencies/DependencyMatrix';
import { DependencyWheelMap } from '@/components/dependencies/DependencyWheelMap';
import { DependencyContextMenu } from '@/components/dependencies/DependencyContextMenu';
import { DependenciesSidebar } from '@/components/dependencies/DependenciesSidebar';
import { SegmentedTabs, SegmentedTab } from '@/components/ui/segmented-tabs';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';
import { cn } from '@/lib/utils';

export default function DependenciesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { programId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [quarterFilter, setQuarterFilter] = useState<string | undefined>(undefined);
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

  // Fetch current program name for scope label
  const { data: currentProgram } = useQuery({
    queryKey: ['program-details', activeProgramId],
    queryFn: async () => {
      if (!activeProgramId) return null;
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, key')
        .eq('id', activeProgramId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!activeProgramId,
  });

  // Generate quarter options for filter
  const generateQuarterOptions = () => {
    const currentYear = new Date().getFullYear();
    const quarters: string[] = [];
    for (let year = currentYear - 1; year <= currentYear + 2; year++) {
      for (let q = 1; q <= 4; q++) {
        quarters.push(`Q${q} ${year}`);
      }
    }
    return quarters;
  };
  const quarterOptions = generateQuarterOptions();

  // Fetch epics for this program (used for scoping + labeling epic-level dependencies)
  const { data: programEpics } = useQuery({
    queryKey: ['program-epics-lookup', activeProgramId],
    queryFn: async () => {
      if (!activeProgramId) return [];

      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key')
        .eq('program_id', activeProgramId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProgramId,
  });

  const programEpicsKey = useMemo(
    () => (programEpics || []).map((e) => e.id).join(','),
    [programEpics]
  );

  const programEpicIdSet = useMemo(
    () => new Set((programEpics || []).map((e) => e.id)),
    [programEpics]
  );

  const epicsById = useMemo(() => {
    const map = new Map<string, { id: string; name: string; epic_key: string | null }>();
    (programEpics || []).forEach((e) => map.set(e.id, e));
    return map;
  }, [programEpics]);

  // Fetch dependencies with filters - scoped to program if programId present
  const { data: dependencies, isLoading } = useQuery({
    queryKey: ['dependencies-grid', activeProgramId, programEpicsKey, quarterFilter, levelFilter, typeFilter, statusFilter, viewMode],
    queryFn: async () => {
      let query = supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(id, name, display_id, team_id, epic_id, teams(name)),
          to_feature:features!dependencies_to_feature_id_fkey(id, name, display_id, team_id, epic_id, teams(name)),
          needed_by_sprint:iterations!dependencies_needed_by_sprint_id_fkey(id, name, start_date),
          committed_by_sprint:iterations!dependencies_committed_by_sprint_id_fkey(id, name, start_date),
          requesting_team:teams!dependencies_requesting_team_id_fkey(id, name),
          depends_on_team:teams!dependencies_depends_on_team_id_fkey(id, name),
          external_entity:external_entities(id, name, entity_type)
        `);

      if (quarterFilter && quarterFilter !== 'all') query = query.eq('quarter', quarterFilter);
      if (levelFilter && levelFilter !== 'all') query = query.eq('dependency_level', levelFilter as any);
      if (typeFilter && typeFilter !== 'all') query = query.eq('type', typeFilter as any);
      if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter as any);

      const { data, error } = await query.order('rank_order', { ascending: true });
      if (error) throw error;

      const rows = data || [];
      if (!activeProgramId) return rows;

      // Include BOTH legacy feature-based dependencies and the newer epic-based dependencies.
      return rows.filter((dep: any) => {
        // New model: derived container scoping (preferred when present)
        if (dep.derived_requesting_container_type === 'program' && dep.derived_requesting_container_id === activeProgramId) return true;
        if (dep.derived_respondent_container_type === 'program' && dep.derived_respondent_container_id === activeProgramId) return true;

        // New model: epic-to-epic dependencies (work-item fields)
        if (dep.requesting_work_item_type === 'epic' && dep.requesting_work_item_id && programEpicIdSet.has(dep.requesting_work_item_id)) return true;
        if (dep.depends_on_work_item_type === 'epic' && dep.depends_on_work_item_id && programEpicIdSet.has(dep.depends_on_work_item_id)) return true;

        // Legacy model: feature-to-feature dependencies (feature joins)
        if (dep.from_feature?.epic_id && programEpicIdSet.has(dep.from_feature.epic_id)) return true;
        if (dep.to_feature?.epic_id && programEpicIdSet.has(dep.to_feature.epic_id)) return true;

        return false;
      });
    },
    enabled: !!activeProgramId,
  });

  const getEpicLabel = (epicId?: string | null) => {
    if (!epicId) return '';
    const epic = epicsById.get(epicId);
    if (!epic) return '';
    return epic.epic_key ? `${epic.epic_key} - ${epic.name}` : epic.name;
  };

  const getRequestingLabel = (dep: any) => {
    return (
      dep.from_feature?.name ||
      (dep.requesting_work_item_type === 'epic' ? getEpicLabel(dep.requesting_work_item_id) : '') ||
      dep.description ||
      ''
    );
  };

  const getRequestedForLabel = (dep: any) => {
    return (
      dep.to_feature?.name ||
      (dep.depends_on_work_item_type === 'epic' ? getEpicLabel(dep.depends_on_work_item_id) : '') ||
      dep.external_entity?.name ||
      ''
    );
  };

  const filteredDependencies = dependencies?.filter((dep: any) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      getRequestingLabel(dep).toLowerCase().includes(q) ||
      getRequestedForLabel(dep).toLowerCase().includes(q) ||
      (dep.description || '').toLowerCase().includes(q)
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
    const csvData = filteredDependencies.map((dep: any) => [
      getRequestingLabel(dep),
      dep.requesting_team?.name || '',
      getRequestedForLabel(dep),
      dep.depends_on_team?.name || dep.external_entity?.name || '',
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

  // Detect embedded mode (within Program context - no sidebar needed)
  const isEmbedded = !!programId;

  return (
    <div className="flex h-full overflow-hidden w-full">
      {/* Only show sidebar in standalone mode */}
      {!isEmbedded && <DependenciesSidebar />}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Canonical Header - matches Enterprise Objective Roadmap exactly */}
        <GlobalPageHeader 
          sectionLabel="PROGRAM" 
          pageTitle="Dependencies"
          rightActions={
            <div className="flex items-center gap-2">
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
          }
          toolbar={
            <div className="flex items-center justify-between w-full">
              {/* Left: Search → Filters */}
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    className="h-9 w-52 pl-9 pr-8 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-brand-primary"
                    placeholder="Search dependencies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setSearchTerm('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                {/* Quarter Filter */}
                <Select value={quarterFilter || 'all'} onValueChange={(v) => setQuarterFilter(v === 'all' ? undefined : v)}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder="All Quarters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quarters</SelectItem>
                    {quarterOptions.map(q => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Level Filter */}
                <Select value={levelFilter || 'all'} onValueChange={(v) => setLevelFilter(v === 'all' ? undefined : v)}>
                  <SelectTrigger className="h-9 w-[120px]">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="program">Program</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Type Filter */}
                <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? undefined : v)}>
                  <SelectTrigger className="h-9 w-[120px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sequential">Sequential</SelectItem>
                    <SelectItem value="concurrent">Concurrent</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Status Filter */}
                <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v)}>
                  <SelectTrigger className="h-9 w-[140px]">
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
              
              {/* Right: Scoped badge (when in program context) + View toggle */}
              <div className="flex items-center gap-3">
                {activeProgramId && (
                  <Badge variant="outline" className="bg-brand-gold/10 text-brand-gold border-brand-gold/30 flex items-center gap-1.5">
                    <Filter className="h-3 w-3" />
                    Scoped to: {currentProgram?.name || 'Program'}
                  </Badge>
                )}
                
                {!isEmbedded && (
                  <div className="flex items-center gap-1 border rounded-lg p-0.5">
                    <Button
                      variant={visualizationMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setVisualizationMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={visualizationMode === 'matrix' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setVisualizationMode('matrix')}
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={visualizationMode === 'wheel' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setVisualizationMode('wheel')}
                    >
                      <GitBranch className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          }
        />

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden px-6 py-4">
          {/* Embedded mode: Show horizontal segmented tabs for view selection */}
          {isEmbedded && (
            <div className="mb-4">
              <SegmentedTabs 
                value={visualizationMode} 
                onValueChange={(v) => {
                  if (v === 'maps') {
                    navigate('/reports/dependencies/maps');
                  } else {
                    setVisualizationMode(v as 'list' | 'matrix' | 'wheel');
                  }
                }}
                className="w-fit"
              >
                <SegmentedTab value="list">
                  <List className="h-4 w-4 mr-2" />
                  List
                </SegmentedTab>
                <SegmentedTab value="matrix">
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Matrix
                </SegmentedTab>
                <SegmentedTab value="wheel">
                  <GitBranch className="h-4 w-4 mr-2" />
                  Wheel
                </SegmentedTab>
                <SegmentedTab value="maps">
                  <MapIcon className="h-4 w-4 mr-2" />
                  Maps
                </SegmentedTab>
              </SegmentedTabs>
            </div>
          )}

          {/* Visualization Views */}
          {visualizationMode === 'matrix' && (
            <DependencyMatrix 
              quarter={quarterFilter} 
              onDependencyClick={handleRowClick}
            />
          )}
          
          {visualizationMode === 'wheel' && (
            <DependencyWheelMap 
              quarter={quarterFilter} 
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
                                {getRequestingLabel(dep) || '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {dep.requesting_team?.name || '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {getRequestedForLabel(dep) || '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {dep.depends_on_team?.name || dep.external_entity?.name || '-'}
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
