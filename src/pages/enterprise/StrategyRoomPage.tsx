import { useState, useEffect } from 'react';
import { Star, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { StrategyRoomFiltersDrawer } from '@/components/strategy/StrategyRoomFiltersDrawer';
import { MissionVisionValues } from '@/components/strategy/MissionVisionValues';
import { ExecutionAgainstOutcomesWidget } from '@/components/strategy/ExecutionAgainstOutcomesWidget';
import { StrategicGoalsWidget } from '@/components/strategy/StrategicGoalsWidget';
import { StrategyPyramid } from '@/components/strategy/StrategyPyramid';
import { SnapshotProgress } from '@/components/strategy/SnapshotProgress';
import { MisalignedWorkItems } from '@/components/strategy/MisalignedWorkItems';
import { OkrHeatmap } from '@/components/strategy/OkrHeatmap';
import { OkrTree } from '@/components/strategy/OkrTree';
import { ObjectiveDrawerV2 } from '@/modules/okr-v2';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStrategyRoomFiltersStore } from '@/stores/strategyRoomFiltersStore';

// Type definition - not importing from mock data
type ObjectiveLevel = "STRATEGIC" | "PORTFOLIO" | "PROGRAM" | "TEAM";

export default function StrategyRoomPage() {
  const navigate = useNavigate();
  
  // Filter store
  const { 
    appliedFilters, 
    setSnapshotId, 
    openDrawer, 
    getActiveFilterCount 
  } = useStrategyRoomFiltersStore();
  
  const activeFilterCount = getActiveFilterCount();

  // Fetch program increments and use actual PI IDs  
  const { data: programIncrements = [] } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('id, name, start_date, end_date')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch programs for filter options
  const { data: programs = [] } = useQuery({
    queryKey: ['programs-for-filters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch teams for filter options
  const { data: teams = [] } = useQuery({
    queryKey: ['teams-for-filters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Determine current quarter based on today's date
  const getCurrentQuarterId = () => {
    const today = new Date();
    const currentPI = programIncrements.find(pi => {
      const start = new Date(pi.start_date);
      const end = new Date(pi.end_date);
      return today >= start && today <= end;
    });
    return currentPI?.id;
  };

  const selectedPIs = appliedFilters.quarterIds.length > 0 
    ? appliedFilters.quarterIds 
    : programIncrements.slice(0, 2).map(pi => pi.id);

  const [filterLevel, setFilterLevel] = useState<ObjectiveLevel | undefined>(undefined);
  const [filterPI, setFilterPI] = useState<string | undefined>(undefined);
  const [selectedObjective, setSelectedObjective] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snapshotSearchQuery, setSnapshotSearchQuery] = useState('');

  // Fetch snapshots from database
  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery({
    queryKey: ['strategy-snapshots', appliedFilters.includeArchivedSnapshots],
    queryFn: async () => {
      let query = supabase
        .from('strategy_snapshots')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filter out archived if not showing archived
      if (!appliedFilters.includeArchivedSnapshots) {
        query = query.neq('status', 'archived');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Initialize snapshot ID when data loads
  useEffect(() => {
    if (snapshots.length > 0 && !appliedFilters.snapshotId) {
      const defaultSnapshot = snapshots.find(s => s.name === 'Corporate Strategy 2025') || snapshots[0];
      if (defaultSnapshot) {
        setSnapshotId(defaultSnapshot.id);
      }
    }
  }, [snapshots, appliedFilters.snapshotId, setSnapshotId]);

  const effectiveSelectedSnapshotId = appliedFilters.snapshotId || snapshots.find(s => s.name === 'Corporate Strategy 2025')?.id || snapshots[0]?.id || '';
  
  const selectedSnapshot = snapshots.find((s) => s.id === effectiveSelectedSnapshotId);

  const handleSnapshotChange = (newSnapshotId: string) => {
    setSnapshotId(newSnapshotId);
  };

  const handleLevelClick = (level: string) => {
    const levelMap: Record<string, ObjectiveLevel> = {
      'Strategic Goals': 'STRATEGIC',
      'Portfolio Objectives': 'PORTFOLIO',
      'Program Objectives': 'PROGRAM',
      'Team Objectives': 'TEAM',
    };
    setFilterLevel(levelMap[level]);
    setFilterPI(undefined);
  };

  const handlePyramidLayerClick = (label: string) => {
    const layerMap: Record<string, ObjectiveLevel> = {
      'Strategic Goals': 'STRATEGIC',
      'Portfolio Objectives': 'PORTFOLIO',
      'Program Objectives': 'PROGRAM',
    };
    if (layerMap[label]) {
      setFilterLevel(layerMap[label]);
      setFilterPI(undefined);
    }
  };

  const handleHeatmapCellClick = (level: ObjectiveLevel, pi: string) => {
    setFilterLevel(level);
    setFilterPI(pi);
  };

  const handleObjectiveClick = (objective: any) => {
    setSelectedObjective(objective);
    setDrawerOpen(true);
  };

  const filteredSnapshots = snapshots.filter((s) =>
    s.name.toLowerCase().includes(snapshotSearchQuery.toLowerCase())
  );

  // Prepare filter options
  const programOptions = programs.map(p => ({ value: p.id, label: p.name }));
  const quarterOptions = programIncrements.map(pi => ({ value: pi.id, label: pi.name }));
  const teamOptions = teams.map(t => ({ value: t.id, label: t.name }));

  // Theme options - empty for now, can be populated when themes table is available
  const themeOptions: { value: string; label: string }[] = [];

  if (snapshotsLoading || !effectiveSelectedSnapshotId) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background min-w-0">
      {/* Header - single border line */}
      <div className="h-[72px] border-b bg-card px-4 md:px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Star className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <h1 className="text-lg font-semibold truncate">Strategy Room</h1>
          <span className="text-sm text-muted-foreground hidden md:inline">for Snapshot</span>
          <div className="w-56 md:w-64">
            <Select value={effectiveSelectedSnapshotId} onValueChange={handleSnapshotChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select one" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Search snapshots..."
                    value={snapshotSearchQuery}
                    onChange={(e) => setSnapshotSearchQuery(e.target.value)}
                    className="mb-2 h-8 text-sm"
                  />
                </div>
                {filteredSnapshots.map((snapshot) => (
                  <SelectItem key={snapshot.id} value={snapshot.id}>
                    {snapshot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/enterprise/backlog')}
          >
            Strategic Backlog
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={openDrawer}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge 
                variant="default" 
                className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs bg-brand-gold text-white"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 min-w-0">
        <div className="space-y-4 sm:space-y-6">
          {/* Mission/Vision/Values */}
          <MissionVisionValues snapshot={selectedSnapshot} />

          {/* Execution and Goals Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <ExecutionAgainstOutcomesWidget 
              snapshotId={effectiveSelectedSnapshotId}
            />
            <StrategicGoalsWidget 
              snapshotId={effectiveSelectedSnapshotId}
            />
          </div>

          {/* Strategy Pyramid - Scrollable on mobile */}
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[500px] sm:min-w-[600px] px-3 sm:px-0">
              <StrategyPyramid 
                onLayerClick={handlePyramidLayerClick} 
                snapshotId={effectiveSelectedSnapshotId}
              />
            </div>
          </div>

          {/* Snapshot Progress and Misaligned Items */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3 sm:gap-4">
            <SnapshotProgress 
              snapshotId={effectiveSelectedSnapshotId}
            />
            <MisalignedWorkItems 
              snapshotId={effectiveSelectedSnapshotId}
            />
          </div>

          {/* OKR Heatmap - Scrollable on mobile */}
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[400px] px-3 sm:px-0">
              <OkrHeatmap
                selectedSnapshot={effectiveSelectedSnapshotId}
                programIncrements={selectedPIs}
                onCellClick={handleHeatmapCellClick}
              />
            </div>
          </div>

          {/* OKR Tree */}
          <OkrTree
            selectedSnapshot={effectiveSelectedSnapshotId}
            onObjectiveClick={handleObjectiveClick}
          />
        </div>
      </div>

      {/* Objective Drawer - OKR v2 */}
      <ObjectiveDrawerV2
        objectiveId={selectedObjective?.id || null}
        open={drawerOpen}
        onClose={() => {
          setSelectedObjective(null);
          setDrawerOpen(false);
        }}
      />

      {/* Strategy Room Filters Drawer */}
      <StrategyRoomFiltersDrawer
        snapshotName={selectedSnapshot?.name}
        programOptions={programOptions}
        quarterOptions={quarterOptions}
        themeOptions={themeOptions}
        teamOptions={teamOptions}
        ownerOptions={[]}
        userProgramIds={programs.slice(0, 2).map(p => p.id)}
        currentQuarterId={getCurrentQuarterId()}
      />
    </div>
  );
}
