import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MissionVisionValues } from '@/components/strategy/MissionVisionValues';
import { ExecutionAgainstOutcomes } from '@/components/strategy/ExecutionAgainstOutcomes';
import { StrategyPyramid } from '@/components/strategy/StrategyPyramid';
import { SnapshotProgress } from '@/components/strategy/SnapshotProgress';
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
  const [selectedPIs] = useState(['PI-5', 'PI-6', 'PI-7']);
  const [filterLevel, setFilterLevel] = useState<ObjectiveLevel | undefined>(undefined);
  const [filterPI, setFilterPI] = useState<string | undefined>(undefined);
  const [selectedObjective, setSelectedObjective] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snapshotSearchQuery, setSnapshotSearchQuery] = useState('');

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Star className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Strategy Room</h1>
          <span className="text-sm text-muted-foreground">for Snapshot</span>
          <div className="w-64">
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

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <span className="mr-2">+</span>
            Add Snapshot
          </Button>
          <Button variant="outline" size="sm">
            Extra Configs
          </Button>
        </div>
      </div>

      {/* Mission/Vision/Values + Execution Against Outcomes */}
      <div className="grid grid-cols-[1fr_350px] gap-6">
        <MissionVisionValues snapshot={selectedSnapshot} />
        <ExecutionAgainstOutcomes onLevelClick={handleLevelClick} />
      </div>

      {/* Strategy Pyramid + Snapshot Progress */}
      <div className="grid grid-cols-[1fr_400px] gap-6">
        <StrategyPyramid onLayerClick={handlePyramidLayerClick} />
        <SnapshotProgress />
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
    </div>
  );
}
