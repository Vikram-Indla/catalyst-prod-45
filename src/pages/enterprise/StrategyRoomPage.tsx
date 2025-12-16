import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { StrategyContextCard } from '@/components/strategy/StrategyContextCard';
import { ExecutiveSummaryCard } from '@/components/strategy/ExecutiveSummaryCard';
import { StrategyStack } from '@/components/strategy/StrategyStack';
import { OkrTree } from '@/components/strategy/OkrTree';
import { ObjectiveAnalyticsDrawer } from '@/modules/okr-v2';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageChrome } from '@/components/layout/PageChrome';

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
      <PageChrome>
        <div className="flex-1 flex items-center justify-center">
          <div 
            className="animate-spin rounded-full h-8 w-8 border-b-2" 
            style={{ borderColor: 'var(--brand-gold)' }}
          />
        </div>
      </PageChrome>
    );
  }

  const snapshotSelector = (
    <div className="flex items-center gap-3">
      <span 
        className="text-[12px] font-medium"
        style={{ color: 'var(--text-2)' }}
      >
        Snapshot:
      </span>
      <div className="w-56">
        <Select value={effectiveSelectedSnapshotId} onValueChange={handleSnapshotChange}>
          <SelectTrigger 
            className="h-8 text-[13px] rounded-md"
            style={{ 
              backgroundColor: 'var(--surface-2)', 
              borderColor: 'var(--divider)',
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
                  backgroundColor: 'var(--surface-2)', 
                  borderColor: 'var(--divider)',
                  color: 'var(--text-1)'
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
  );

  return (
    <PageChrome rightActions={snapshotSelector}>
      <div 
        className="px-6 py-5 space-y-5 pb-8 max-w-[1400px] mx-auto"
        style={{ backgroundColor: 'var(--page-bg)' }}
      >
        {/* Section 1: Strategy Context - Mission/Vision/Values */}
        <StrategyContextCard snapshot={selectedSnapshot} onUpdate={refetchSnapshots} />

        {/* Section 2: Executive Summary - 4 unique KPI tiles */}
        <ExecutiveSummaryCard snapshotId={effectiveSelectedSnapshotId} />

        {/* Section 3: Strategy Coverage & Alignment - drilldown table */}
        <StrategyStack 
          onLayerClick={handlePyramidLayerClick} 
          snapshotId={effectiveSelectedSnapshotId}
        />

        {/* Section 4: OKR Tree - hierarchical list */}
        <OkrTree
          selectedSnapshot={effectiveSelectedSnapshotId}
          onObjectiveClick={handleObjectiveClick}
          onThemeClick={handleThemeClick}
        />
      </div>

      {/* Drawers */}
      <ObjectiveAnalyticsDrawer
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
    </PageChrome>
  );
}
