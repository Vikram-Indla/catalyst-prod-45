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
    setSelectedObjective(objective);
    setDrawerOpen(true);
  };

  const filteredSnapshots = snapshots.filter((s) =>
    s.name.toLowerCase().includes(snapshotSearchQuery.toLowerCase())
  );

  if (snapshotsLoading || !effectiveSelectedSnapshotId) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Star className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Strategy Room</h1>
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">for Snapshot</span>
          <div className="w-full sm:w-64">
            <Select value={effectiveSelectedSnapshotId} onValueChange={setSelectedSnapshotId}>
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue placeholder="Select one" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Search to filter snapshots"
                    value={snapshotSearchQuery}
                    onChange={(e) => setSnapshotSearchQuery(e.target.value)}
                    className="mb-2 h-8 text-xs sm:text-sm"
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

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/enterprise/backlog')}
            className="text-xs sm:text-sm flex-1 sm:flex-none"
          >
            Strategic Backlog
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setExtraConfigsOpen(true)}
            className="text-xs sm:text-sm flex-1 sm:flex-none"
          >
            <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Extra Configs</span>
            <span className="sm:hidden">Configs</span>
          </Button>
        </div>
      </div>

      {/* Mission/Vision/Values */}
      <MissionVisionValues snapshot={selectedSnapshot} />

      {/* Execution and Goals Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ExecutionAgainstOutcomesWidget 
          snapshotId={effectiveSelectedSnapshotId} 
          piIds={selectedPIs} 
        />
        <StrategicGoalsWidget snapshotId={effectiveSelectedSnapshotId} />
      </div>

      {/* Strategy Pyramid - Full width on mobile */}
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <div className="min-w-[600px] px-3 sm:px-0">
          <StrategyPyramid onLayerClick={handlePyramidLayerClick} snapshotId={effectiveSelectedSnapshotId} />
        </div>
      </div>

      {/* Snapshot Progress and Misaligned Items */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 sm:gap-6">
        <SnapshotProgress snapshotId={effectiveSelectedSnapshotId} />
        <MisalignedWorkItems snapshotId={effectiveSelectedSnapshotId} />
      </div>

      {/* OKR Heatmap */}
      <OkrHeatmap
        selectedSnapshot={effectiveSelectedSnapshotId}
        programIncrements={selectedPIs}
        onCellClick={handleHeatmapCellClick}
      />

      {/* OKR Tree */}
      <OkrTree
        selectedSnapshot={effectiveSelectedSnapshotId}
        onObjectiveClick={handleObjectiveClick}
      />

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
