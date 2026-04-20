import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Download, MoreHorizontal, AlertTriangle, CheckCircle2, Clock, Grid3x3, GitBranch, List, Filter, X, Layers } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DependencyDetailsDrawer } from '@/components/dependencies/DependencyDetailsDrawer';
import { DependencyAnalyticsPanel } from '@/components/dependencies/DependencyAnalyticsPanel';
import { DependencyMatrix } from '@/components/dependencies/DependencyMatrix';
import { DependencyWheelMap } from '@/components/dependencies/DependencyWheelMap';
import { DependencyContextMenu } from '@/components/dependencies/DependencyContextMenu';
import { DependenciesSidebar } from '@/components/dependencies/DependenciesSidebar';
import { WorkItemIcon, WorkItemBadge } from '@/components/dependencies/WorkItemIcon';
import { SegmentedTabs, SegmentedTab } from '@/components/ui/segmented-tabs';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';
import { cn } from '@/lib/utils';
import { 
  buildWorkItemMaps, 
  resolveDependencyWorkItems, 
  isDependencyRelevantToProgram 
} from '@/lib/dependencies/resolveWorkItem';
import { DEPENDENCY_TYPE_LABELS, DEPENDENCY_LEVEL_LABELS } from '@/lib/dependencies/types';

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
  
  // Analytics drawer state (for wheel)
  const [analyticsDrawerOpen, setAnalyticsDrawerOpen] = useState(false);
  const [selectedWheelProgramId, setSelectedWheelProgramId] = useState<string | null>(null);
  const [selectedWheelProgramName, setSelectedWheelProgramName] = useState<string | undefined>();

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
        .select('id, name, epic_key, program_id')
        .eq('program_id', activeProgramId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProgramId,
  });

  // Fetch all epics for resolution (including cross-program)
  const { data: allEpics } = useQuery({
    queryKey: ['all-epics-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key, primary_program_id')
        .is('deleted_at', null);
      if (error) throw error;
      // Map primary_program_id to program_id for consistency
      return (data || []).map(e => ({
        ...e,
        program_id: e.primary_program_id
      }));
    },
  });

  // Fetch all features for resolution
  const { data: allFeatures } = useQuery({
    queryKey: ['all-features-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, display_id, project_id, projects(name)');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all programs for analytics drawer
  const { data: programs } = useQuery({
    queryKey: ['all-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const workItemMaps = useMemo(() => 
    buildWorkItemMaps(allEpics, allFeatures), 
    [allEpics, allFeatures]
  );

  const programEpicIdSet = useMemo(
    () => new Set((programEpics || []).map((e) => e.id)),
    [programEpics]
  );

  // Fetch dependencies with filters - scoped to program if programId present
  const { data: dependencies, isLoading } = useQuery({
    queryKey: ['dependencies-grid', activeProgramId, quarterFilter, levelFilter, typeFilter, statusFilter, viewMode],
    queryFn: async () => {
      let query = supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(id, name, display_id, team_id, epic_id),
          to_feature:features!dependencies_to_feature_id_fkey(id, name, display_id, team_id, epic_id)
        `);

      if (quarterFilter && quarterFilter !== 'all') query = query.eq('quarter', quarterFilter);
      
      // Level filter using new model
      if (levelFilter && levelFilter !== 'all') {
        query = query.eq('dependency_level_v2', levelFilter as any);
      }
      
      // Type filter using new model
      if (typeFilter && typeFilter !== 'all') {
        query = query.eq('type', typeFilter as any);
      }
      
      if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter as any);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      const rows = data || [];
      if (!activeProgramId) return rows;

      // Filter to dependencies relevant to this program
      return rows.filter((dep: any) => 
        isDependencyRelevantToProgram(dep, activeProgramId, programEpicIdSet)
      );
    },
    enabled: !!activeProgramId || !programId,
  });

  // Real-time subscription for dependencies table
  useEffect(() => {
    const depsChannel = supabase
      .channel('dependencies-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dependencies',
        },
        () => {
          // Invalidate and refetch when any dependency changes
          queryClient.invalidateQueries({ queryKey: ['dependencies-grid'] });
        }
      )
      .subscribe();

    // Also subscribe to epics for real-time name/key updates
    const epicsChannel = supabase
      .channel('epics-realtime-deps')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'epics',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-epics-lookup'] });
          queryClient.invalidateQueries({ queryKey: ['program-epics-lookup'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(depsChannel);
      supabase.removeChannel(epicsChannel);
    };
  }, [queryClient]);

  // Transform dependencies with resolved work items
  const resolvedDependencies = useMemo(() => {
    if (!dependencies) return [];
    
    return dependencies.map((dep: any) => {
      const { source, target } = resolveDependencyWorkItems(dep, workItemMaps);
      return {
        ...dep,
        resolvedSource: source,
        resolvedTarget: target,
      };
    });
  }, [dependencies, workItemMaps]);

  const filteredDependencies = resolvedDependencies.filter((dep: any) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (dep.resolvedSource?.name || '').toLowerCase().includes(q) ||
      (dep.resolvedSource?.displayId || '').toLowerCase().includes(q) ||
      (dep.resolvedTarget?.name || '').toLowerCase().includes(q) ||
      (dep.resolvedTarget?.displayId || '').toLowerCase().includes(q) ||
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

    const headers = ['Source', 'Source Type', 'Target', 'Target Type', 'Level', 'Type', 'Need By', 'Status', 'Risk'];
    const csvData = filteredDependencies.map((dep: any) => [
      dep.resolvedSource?.displayId || '',
      dep.resolvedSource?.type || '',
      dep.resolvedTarget?.displayId || '',
      dep.resolvedTarget?.type || '',
      dep.dependency_level_v2 || dep.dependency_level || '',
      dep.type || '',
      dep.needed_by_date || '',
      dep.status || '',
      dep.risk_level || ''
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
    const statusAppearance: Record<string, LozengeAppearance> = {
      draft: 'default',
      pending_commit: 'default',
      negotiation: 'inprogress',
      committed: 'success',
      in_progress: 'inprogress',
      delivered: 'success',
      blocked: 'removed',
      rejected: 'removed',
      cancelled: 'default',
      not_required: 'default',
    };

    const appearance = statusAppearance[status] || 'default';

    return (
      <Lozenge appearance={appearance}>
        {status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Lozenge>
    );
  };

  const getLevelBadge = (level: string | null) => {
    if (!level) return <Lozenge appearance="default">-</Lozenge>;

    const levelAppearance: Record<string, LozengeAppearance> = {
      execution: 'inprogress',
      delivery: 'inprogress',
      cross_level: 'moved',
    };

    const shortLabel = level === 'execution' ? 'Exec' : level === 'delivery' ? 'Deliv' : 'X-Level';

    return (
      <Lozenge appearance={levelAppearance[level] || 'default'}>
        {shortLabel}
      </Lozenge>
    );
  };

  // Detect embedded mode (within Program context - no sidebar needed)
  const isEmbedded = !!programId;

  return (
    <div className="flex h-full overflow-hidden w-full">
      {/* Only show sidebar in standalone mode */}
      {!isEmbedded && <DependenciesSidebar />}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Canonical Header */}
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
                
                {/* Level Filter - NEW MODEL */}
                <Select value={levelFilter || 'all'} onValueChange={(v) => setLevelFilter(v === 'all' ? undefined : v)}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="execution">Execution (E↔E)</SelectItem>
                    <SelectItem value="delivery">Delivery (F↔F)</SelectItem>
                    <SelectItem value="cross_level">Cross-Level</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Type Filter - NEW MODEL */}
                <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? undefined : v)}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="blocks">Blocks</SelectItem>
                    <SelectItem value="is_blocked_by">Is Blocked By</SelectItem>
                    <SelectItem value="enables">Enables</SelectItem>
                    <SelectItem value="provides_input">Provides Input</SelectItem>
                    <SelectItem value="approves">Approves</SelectItem>
                    <SelectItem value="governs">Governs</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Status Filter */}
                <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v)}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_commit">Pending Commit</SelectItem>
                    <SelectItem value="committed">Committed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Right: Scoped badge */}
              <div className="flex items-center gap-3">
                {activeProgramId && (
                  <span className="flex items-center gap-1.5">
                    <Filter className="h-3 w-3 text-brand-gold" />
                    <Lozenge appearance="moved">
                      Scoped to: {currentProgram?.name || 'Program'}
                    </Lozenge>
                  </span>
                )}
              </div>
            </div>
          }
        />

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-auto px-6 py-4">
          {/* Embedded mode: Show horizontal segmented tabs for view selection */}
          {isEmbedded && (
            <div className="mb-4">
              <SegmentedTabs 
                value={visualizationMode} 
                onValueChange={(v) => setVisualizationMode(v as 'list' | 'matrix' | 'wheel')}
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
            <div className="flex flex-1 overflow-hidden">
              {/* Wheel container - shifts left when panel opens */}
              <div 
                className={cn(
                  "flex items-center justify-center transition-all duration-500 ease-out",
                  analyticsDrawerOpen 
                    ? "w-[calc(100%-380px)]" 
                    : "w-full"
                )}
              >
                <DependencyWheelMap 
                  quarter={quarterFilter} 
                  onDependencyClick={handleRowClick}
                  selectedProgramId={selectedWheelProgramId}
                  onProgramSelect={(id, name) => {
                    setSelectedWheelProgramId(id);
                    setSelectedWheelProgramName(name);
                    setAnalyticsDrawerOpen(true);
                  }}
                />
              </div>
              
              {/* Analytics Panel - slides in from right */}
              <div 
                className={cn(
                  "h-full flex-shrink-0 transition-all duration-500 ease-out overflow-hidden",
                  analyticsDrawerOpen ? "w-[380px]" : "w-0"
                )}
              >
                {selectedWheelProgramId && (
                  <div className="w-[380px] h-full">
                    <DependencyAnalyticsPanel
                      selectedProgramId={selectedWheelProgramId}
                      selectedProgramName={selectedWheelProgramName}
                      dependencies={resolvedDependencies}
                      programs={programs || []}
                      workItemMaps={workItemMaps}
                      initialQuarter={quarterFilter}
                      onDependencyClick={(depId) => {
                        setSelectedDependencyId(depId);
                        setDrawerOpen(true);
                      }}
                      onClose={() => {
                        setAnalyticsDrawerOpen(false);
                        setSelectedWheelProgramId(null);
                        setSelectedWheelProgramName(undefined);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
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
                        Create your first dependency to track cross-work-item commitments
                      </p>
                      <Button onClick={handleAddDependency} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Dependency
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                    <Table className="min-w-[900px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Source (Requesting)</TableHead>
                          <TableHead className="w-[200px]">Target (Depends On)</TableHead>
                          <TableHead className="w-[100px]">Level</TableHead>
                          <TableHead className="w-[120px]">Type</TableHead>
                          <TableHead className="w-[100px]">Need By</TableHead>
                          <TableHead className="w-[100px]">Quarter</TableHead>
                          <TableHead className="w-[120px]">Status</TableHead>
                          <TableHead className="w-[80px]">Risk</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDependencies.map((dep: any) => (
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
                              {/* Source (Requesting) - Clickable to open drawer */}
                              <TableCell>
                                {dep.resolvedSource ? (
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 text-left hover:bg-muted/50 rounded px-1 -mx-1 py-0.5 transition-colors group"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRowClick(dep.id);
                                    }}
                                  >
                                    <WorkItemIcon 
                                      type={dep.resolvedSource.type === 'epic' ? 'epic' : 'feature'} 
                                      size="sm" 
                                    />
                                    <div className="min-w-0">
                                      <span className="text-xs font-mono text-muted-foreground block">
                                        {dep.resolvedSource.displayId}
                                      </span>
                                      <span className="text-sm font-medium truncate block group-hover:text-primary group-hover:underline">
                                        {dep.resolvedSource.name}
                                      </span>
                                    </div>
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>

                              {/* Target (Depends On) - Clickable to open drawer */}
                              <TableCell>
                                {dep.resolvedTarget ? (
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 text-left hover:bg-muted/50 rounded px-1 -mx-1 py-0.5 transition-colors group"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRowClick(dep.id);
                                    }}
                                  >
                                    <WorkItemIcon 
                                      type={dep.resolvedTarget.type === 'epic' ? 'epic' : 'feature'} 
                                      size="sm" 
                                    />
                                    <div className="min-w-0">
                                      <span className="text-xs font-mono text-muted-foreground block">
                                        {dep.resolvedTarget.displayId}
                                      </span>
                                      <span className="text-sm font-medium truncate block group-hover:text-primary group-hover:underline">
                                        {dep.resolvedTarget.name}
                                      </span>
                                    </div>
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>

                              {/* Level */}
                              <TableCell>
                                {getLevelBadge(dep.dependency_level_v2 || dep.dependency_level)}
                              </TableCell>

                              {/* Type */}
                              <TableCell>
                                <Lozenge appearance="default">
                                  {DEPENDENCY_TYPE_LABELS[dep.type as keyof typeof DEPENDENCY_TYPE_LABELS] || dep.type || '-'}
                                </Lozenge>
                              </TableCell>

                              {/* Need By */}
                              <TableCell className="text-sm">
                                {dep.needed_by_date || '-'}
                              </TableCell>

                              {/* Quarter */}
                              <TableCell className="text-sm">
                                {dep.quarter || '-'}
                              </TableCell>

                              {/* Status */}
                              <TableCell>
                                {getStatusBadge(dep.status || 'draft')}
                              </TableCell>

                              {/* Risk */}
                              <TableCell>
                                <Lozenge
                                  appearance={
                                    dep.risk_level === 'high' ? 'removed' :
                                    dep.risk_level === 'med' ? 'moved' :
                                    'default'
                                  }
                                >
                                  {(dep.risk_level || 'low').toUpperCase()}
                                </Lozenge>
                              </TableCell>

                              {/* Blocked indicator */}
                              <TableCell>
                                {(dep.source_blocked || dep.target_delayed || dep.blocked_requestor || dep.blocked_respondent) && (
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
