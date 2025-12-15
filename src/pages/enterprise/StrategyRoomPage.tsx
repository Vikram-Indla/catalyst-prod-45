import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MissionVisionValues } from '@/components/strategy/MissionVisionValues';
import { ExecutionAgainstOutcomesWidget } from '@/components/strategy/ExecutionAgainstOutcomesWidget';
import { StrategicGoalsWidget } from '@/components/strategy/StrategicGoalsWidget';
import { StrategyStack } from '@/components/strategy/StrategyStack';
import { SnapshotProgress } from '@/components/strategy/SnapshotProgress';
import { MisalignedWorkItems } from '@/components/strategy/MisalignedWorkItems';
import { OkrTree } from '@/components/strategy/OkrTree';
import { ObjectiveDrawerV2 } from '@/modules/okr-v2';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { PageShell } from '@/components/shared/PageShell';

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
    if (label === 'Objectives') {
      setFilterLevel('OBJECTIVES');
      setFilterPI(undefined);
    }
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
      <PageShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Global Page Header */}
      <GlobalPageHeader
        sectionLabel="Enterprise"
        pageTitle="Strategy Room"
        rightActions={
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-2)' }}>Snapshot:</span>
            <div className="w-56">
              <Select value={effectiveSelectedSnapshotId} onValueChange={handleSnapshotChange}>
                <SelectTrigger 
                  className="h-8 text-[13px]"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--input-border)',
                    color: 'var(--text-1)'
                  }}
                >
                  <SelectValue placeholder="Select snapshot" />
                </SelectTrigger>
                <SelectContent className="z-[400]">
                  <div className="p-2">
                    <Input
                      placeholder="Search snapshots..."
                      value={snapshotSearchQuery}
                      onChange={(e) => setSnapshotSearchQuery(e.target.value)}
                      className="mb-2 h-7 text-[12px]"
                      style={{ 
                        backgroundColor: 'var(--input-bg)', 
                        borderColor: 'var(--input-border)',
                        color: 'var(--input-text)'
                      }}
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
        }
      />

      {/* Content Area */}
      <PageShell.Content variant="wide" className="space-y-4">
        {/* Mission/Vision/Values - compact row */}
        <MissionVisionValues snapshot={selectedSnapshot} onUpdate={refetchSnapshots} />

        {/* KPI Widgets - 4-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <ExecutionAgainstOutcomesWidget snapshotId={effectiveSelectedSnapshotId} />
          <StrategicGoalsWidget snapshotId={effectiveSelectedSnapshotId} />
          <MisalignedWorkItems snapshotId={effectiveSelectedSnapshotId} />
          <SnapshotProgress snapshotId={effectiveSelectedSnapshotId} />
        </div>

        {/* Strategy Stack (replaces pyramid) - the centerpiece */}
        <StrategyStack 
          onLayerClick={handlePyramidLayerClick} 
          snapshotId={effectiveSelectedSnapshotId}
        />

        {/* OKR Tree */}
        <OkrTree
          selectedSnapshot={effectiveSelectedSnapshotId}
          onObjectiveClick={handleObjectiveClick}
          onThemeClick={handleThemeClick}
        />
      </PageShell.Content>

      {/* Drawers */}
      <ObjectiveDrawerV2
        objectiveId={selectedObjective?.id || null}
        open={drawerOpen}
        onClose={() => {
          setSelectedObjective(null);
          setDrawerOpen(false);
        }}
      />

      <ThemeDetailsDrawer
        theme={selectedTheme}
        isOpen={themeDrawerOpen}
        onClose={() => {
          setSelectedTheme(null);
          setThemeDrawerOpen(false);
        }}
      />
    </PageShell>
  );
}
