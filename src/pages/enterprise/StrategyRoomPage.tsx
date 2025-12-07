import { useState } from 'react';
import { Star, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { ExtraConfigsDialog } from '@/components/strategy/ExtraConfigsDialog';
import { MissionVisionValues } from '@/components/strategy/MissionVisionValues';
import { ExecutionAgainstOutcomesWidget } from '@/components/strategy/ExecutionAgainstOutcomesWidget';
import { StrategicGoalsWidget } from '@/components/strategy/StrategicGoalsWidget';
import { StrategyPyramid } from '@/components/strategy/StrategyPyramid';
import { SnapshotProgress } from '@/components/strategy/SnapshotProgress';
import { MisalignedWorkItems } from '@/components/strategy/MisalignedWorkItems';
import { OkrHeatmap } from '@/components/strategy/OkrHeatmap';
import { OkrTree } from '@/components/strategy/OkrTree';
import { ObjectiveDrawer } from '@/components/strategy/ObjectiveDrawer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ObjectiveLevel,
} from '@/data/strategyMockData';

export default function StrategyRoomPage() {
  const navigate = useNavigate();
  // Fetch program increments and use actual PI IDs  
  const { data: programIncrements = [] } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('id, name, start_date')
        .order('start_date', { ascending: false })
        .limit(2);
      if (error) throw error;
      return data;
    },
  });

  const selectedPIs = programIncrements.map(pi => pi.id);
  const [filterLevel, setFilterLevel] = useState<ObjectiveLevel | undefined>(undefined);
  const [filterPI, setFilterPI] = useState<string | undefined>(undefined);
  const [selectedObjective, setSelectedObjective] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snapshotSearchQuery, setSnapshotSearchQuery] = useState('');
  const [extraConfigsOpen, setExtraConfigsOpen] = useState(false);

  // Fetch snapshots from database
  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery({
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

  // Use only real database snapshots - never use mock data
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');

  // Set the first snapshot when data loads - ensure we have a valid snapshot ID
  const effectiveSelectedSnapshotId = selectedSnapshotId || snapshots.find(s => s.name === 'Corporate Strategy 2025')?.id || snapshots[0]?.id || '';
  
  console.log('📌 StrategyRoomPage state:', {
    selectedSnapshotId,
    effectiveSelectedSnapshotId,
    snapshotsCount: snapshots.length,
    selectedPIsCount: selectedPIs.length,
    selectedPIs
  });

  const selectedSnapshot = snapshots.find((s) => s.id === effectiveSelectedSnapshotId);

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
    console.log('📌 StrategyRoomPage: handleObjectiveClick called', { objective });
    setSelectedObjective(objective);
    setDrawerOpen(true);
    console.log('📌 StrategyRoomPage: State updated', { objectiveId: objective?.id, drawerOpen: true });
  };

  const filteredSnapshots = snapshots.filter((s) =>
    s.name.toLowerCase().includes(snapshotSearchQuery.toLowerCase())
  );

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
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Star className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold truncate">Strategy Room</h1>
            </div>
            <span className="text-xs text-muted-foreground hidden md:inline">for Snapshot</span>
            <div className="w-full sm:w-56 md:w-64">
              <Select value={effectiveSelectedSnapshotId} onValueChange={setSelectedSnapshotId}>
                <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-9">
                  <SelectValue placeholder="Select one" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Search snapshots..."
                      value={snapshotSearchQuery}
                      onChange={(e) => setSnapshotSearchQuery(e.target.value)}
                      className="mb-2 h-7 sm:h-8 text-xs"
                    />
                  </div>
                  {filteredSnapshots.map((snapshot) => (
                    <SelectItem key={snapshot.id} value={snapshot.id} className="text-xs sm:text-sm">
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
              className="text-xs h-8"
            >
              <span className="hidden sm:inline">Strategic Backlog</span>
              <span className="sm:hidden">Backlog</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setExtraConfigsOpen(true)}
              className="text-xs h-8"
            >
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Extra Configs</span>
            </Button>
          </div>
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
              piIds={selectedPIs} 
            />
            <StrategicGoalsWidget snapshotId={effectiveSelectedSnapshotId} />
          </div>

          {/* Strategy Pyramid - Scrollable on mobile */}
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[500px] sm:min-w-[600px] px-3 sm:px-0">
              <StrategyPyramid onLayerClick={handlePyramidLayerClick} snapshotId={effectiveSelectedSnapshotId} />
            </div>
          </div>

          {/* Snapshot Progress and Misaligned Items */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3 sm:gap-4">
            <SnapshotProgress snapshotId={effectiveSelectedSnapshotId} />
            <MisalignedWorkItems snapshotId={effectiveSelectedSnapshotId} />
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

      {/* Objective Drawer */}
      <ObjectiveDrawer
        objectiveId={selectedObjective?.id || null}
        open={drawerOpen}
        onClose={() => {
          setSelectedObjective(null);
          setDrawerOpen(false);
        }}
      />

      {/* Extra Configs Dialog */}
      <ExtraConfigsDialog 
        open={extraConfigsOpen}
        onClose={() => setExtraConfigsOpen(false)}
      />
    </div>
  );
}
