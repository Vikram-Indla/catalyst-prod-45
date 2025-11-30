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
  mockStrategySnapshots,
  mockProgramIncrements,
  ObjectiveLevel,
} from '@/data/strategyMockData';

export default function StrategyRoomPage() {
  const navigate = useNavigate();
  const [selectedPIs] = useState(['PI-5', 'PI-6', 'PI-7']);
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

  // Set the first snapshot when data loads
  const effectiveSelectedSnapshotId = selectedSnapshotId || snapshots[0]?.id || '';

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            <h1 className="text-xl sm:text-2xl font-bold">Strategy Room</h1>
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground">for Snapshot</span>
          <div className="w-full sm:w-64">
            <Select value={effectiveSelectedSnapshotId} onValueChange={setSelectedSnapshotId}>
              <SelectTrigger>
                <SelectValue placeholder="Select one" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Search to filter snapshots"
                    value={snapshotSearchQuery}
                    onChange={(e) => setSnapshotSearchQuery(e.target.value)}
                    className="mb-2 h-8"
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

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/enterprise/backlog')}
            className="text-xs sm:text-sm"
          >
            Strategic Backlog
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setExtraConfigsOpen(true)}
            className="text-xs sm:text-sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            Extra Configs
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

      {/* Strategy Pyramid */}
      <StrategyPyramid onLayerClick={handlePyramidLayerClick} snapshotId={effectiveSelectedSnapshotId} />

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
        open={!!selectedObjective}
        onClose={() => setSelectedObjective(null)}
      />

      {/* Extra Configs Dialog */}
      <ExtraConfigsDialog 
        open={extraConfigsOpen}
        onClose={() => setExtraConfigsOpen(false)}
      />
    </div>
  );
}
