import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MissionVisionValues } from '@/components/strategy/MissionVisionValues';
import { ExecutionAgainstOutcomesWidget } from '@/components/strategy/ExecutionAgainstOutcomesWidget';
import { StrategicGoalsWidget } from '@/components/strategy/StrategicGoalsWidget';
import { StrategyPyramid } from '@/components/strategy/StrategyPyramid';
import { SnapshotProgress } from '@/components/strategy/SnapshotProgress';
import { MisalignedWorkItems } from '@/components/strategy/MisalignedWorkItems';
import { OkrTree } from '@/components/strategy/OkrTree';
import { ObjectiveDrawerV2 } from '@/modules/okr-v2';
import { CreateStrategyItemDropdown } from '@/components/strategy/CreateStrategyItemDropdown';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Type definition - OKR v2 only uses a single Objectives layer
type ObjectiveLevel = "OBJECTIVES";

export default function StrategyRoomPage() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<ObjectiveLevel | undefined>(undefined);
  const [filterPI, setFilterPI] = useState<string | undefined>(undefined);
  const [selectedObjective, setSelectedObjective] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snapshotSearchQuery, setSnapshotSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<any>(null);
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);

  // Fetch snapshots from database
  const { data: snapshots = [], isLoading: snapshotsLoading, refetch: refetchSnapshots } = useQuery({
    queryKey: ['strategy-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .select('*')
        .neq('status', 'archived')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Initialize snapshot ID when data loads
  useEffect(() => {
    if (snapshots.length > 0 && !selectedSnapshotId) {
      const defaultSnapshot = snapshots.find(s => s.name === 'Corporate Strategy 2025') || snapshots[0];
      if (defaultSnapshot) {
        setSelectedSnapshotId(defaultSnapshot.id);
      }
    }
  }, [snapshots, selectedSnapshotId]);

  const effectiveSelectedSnapshotId = selectedSnapshotId || snapshots.find(s => s.name === 'Corporate Strategy 2025')?.id || snapshots[0]?.id || '';
  
  const selectedSnapshot = snapshots.find((s) => s.id === effectiveSelectedSnapshotId);

  const handleSnapshotChange = (newSnapshotId: string) => {
    setSelectedSnapshotId(newSnapshotId);
  };

  const handlePyramidLayerClick = (label: string) => {
    // OKR v2: Single objectives layer, other layers (Themes, Epics, Features) drill down
    if (label === 'Objectives') {
      setFilterLevel('OBJECTIVES');
      setFilterPI(undefined);
    }
    // For Themes/Epics/Features, the pyramid drilldown drawer handles the display
  };

  const handleObjectiveClick = (objective: any) => {
    setSelectedObjective(objective);
    setDrawerOpen(true);
  };

  const handleThemeClick = (theme: any) => {
    setSelectedTheme(theme);
    setThemeDrawerOpen(true);
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
      {/* Header - single border line */}
      <div className="h-[72px] border-b bg-card px-4 md:px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-xl font-semibold text-[#1e3a5f] truncate">Strategy Room</h1>
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
          {effectiveSelectedSnapshotId && (
            <CreateStrategyItemDropdown snapshotId={effectiveSelectedSnapshotId} />
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 min-w-0">
        <div className="space-y-4 sm:space-y-6">
          {/* Mission/Vision/Values */}
          <MissionVisionValues snapshot={selectedSnapshot} onUpdate={refetchSnapshots} />

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

          {/* OKR Tree */}
          <OkrTree
            selectedSnapshot={effectiveSelectedSnapshotId}
            onObjectiveClick={handleObjectiveClick}
            onThemeClick={handleThemeClick}
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

      {/* Theme Details Drawer */}
      <ThemeDetailsDrawer
        theme={selectedTheme}
        isOpen={themeDrawerOpen}
        onClose={() => {
          setSelectedTheme(null);
          setThemeDrawerOpen(false);
        }}
      />
    </div>
  );
}
