/**
 * StrategyRoom — Premium CIO-grade Enterprise Strategy Cockpit
 * V2: Upgraded with executive health strip, improved section containers, dark mode depth
 */

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { StrategyContextCard } from '@/components/strategy/StrategyContextCard';
import { ExecutiveSummaryCard } from '@/components/strategy/ExecutiveSummaryCard';
import { StrategyStack } from '@/components/strategy/StrategyStack';
import { OkrTree } from '@/components/strategy/OkrTree';
import { SnapshotHealthStrip } from '@/components/strategy/SnapshotHealthStrip';
import { ObjectiveAnalyticsDrawer } from '@/modules/okr-v2';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageChrome } from '@/components/layout/PageChrome';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';

type ObjectiveLevel = "OBJECTIVES";

export default function StrategyRoomPage() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<ObjectiveLevel | undefined>(undefined);
  const [filterPI, setFilterPI] = useState<string | undefined>(undefined);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
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
    setSelectedObjectiveId(objective?.id || null);
  };

  const handleThemeClick = async (theme: any) => {
    try {
      const themeId = theme?.id;
      if (!themeId) return;

      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name, description, status, start_date, end_date, portfolio_ask_date, color_tag, owner_id, snapshot_id, created_at')
        .eq('id', themeId)
        .single();

      if (error) throw error;

      setSelectedTheme(data);
      setThemeDrawerOpen(true);
    } catch (err) {
      console.error('Failed to open theme drawer', err);
      toast.error('Unable to open theme');
    }
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
            style={{ borderColor: 'var(--brand-primary)' }}
          />
        </div>
      </PageChrome>
    );
  }

  // Snapshot selector for PageChrome rightActions
  const snapshotSelector = (
    <div className="flex items-center gap-3">
      <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
      <span 
        className="text-[11px] font-medium uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        Snapshot
      </span>
      <div className="w-56">
        <Select value={effectiveSelectedSnapshotId} onValueChange={handleSnapshotChange}>
          <SelectTrigger 
            className="h-8 text-[13px] rounded-md"
            style={{ 
              backgroundColor: 'var(--surface-bg)', 
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)'
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
                  backgroundColor: 'var(--surface-bg)', 
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)'
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
        className="px-6 py-4 pb-8 max-w-[1400px] mx-auto"
        style={{ backgroundColor: 'var(--page-bg)' }}
      >
        {/* Executive Health Strip — Quick snapshot health at a glance */}
        <div 
          className="mb-5 p-3 rounded-lg"
          style={{
            backgroundColor: 'var(--surface-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <SnapshotHealthStrip snapshotId={effectiveSelectedSnapshotId} />
        </div>

        {/* Section Grid — Improved density and rhythm */}
        <div className="space-y-4">
          {/* Section 1: Strategy Context - Mission/Vision/Values */}
          <section>
            <StrategyContextCard snapshot={selectedSnapshot} onUpdate={refetchSnapshots} />
          </section>

          {/* Section 2: Executive Summary - 4 unique KPI tiles */}
          <section>
            <ExecutiveSummaryCard snapshotId={effectiveSelectedSnapshotId} />
          </section>

          {/* Section 3: Strategy Coverage & Alignment - drilldown table */}
          <section>
            <StrategyStack 
              onLayerClick={handlePyramidLayerClick} 
              snapshotId={effectiveSelectedSnapshotId}
            />
          </section>

          {/* Section 4: OKR Tree - hierarchical list */}
          <section>
            <OkrTree
              selectedSnapshot={effectiveSelectedSnapshotId}
              onObjectiveClick={handleObjectiveClick}
              onThemeClick={handleThemeClick}
            />
          </section>
        </div>
      </div>

      {/* Drawers */}
      <ObjectiveAnalyticsDrawer
        objectiveId={selectedObjectiveId}
        open={!!selectedObjectiveId}
        onClose={() => {
          setSelectedObjectiveId(null);
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
