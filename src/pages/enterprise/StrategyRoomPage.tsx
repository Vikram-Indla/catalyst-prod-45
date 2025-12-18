import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { StrategicPulseSection } from '@/components/strategy/StrategicPulseSection';
import { ExposureGapsSection } from '@/components/strategy/ExposureGapsSection';
import { StrategyStack } from '@/components/strategy/StrategyStack';
import { OkrTree } from '@/components/strategy/OkrTree';
import { StrategyContextCard } from '@/components/strategy/StrategyContextCard';
import { ObjectiveAnalyticsDrawer } from '@/modules/okr-v2';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageChrome } from '@/components/layout/PageChrome';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp } from 'lucide-react';

type ObjectiveLevel = "OBJECTIVES";

export default function StrategyRoomPage() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<ObjectiveLevel | undefined>(undefined);
  const [filterPI, setFilterPI] = useState<string | undefined>(undefined);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [snapshotSearchQuery, setSnapshotSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<any>(null);
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
  const [showContext, setShowContext] = useState(false);

  const { data: snapshots = [], isLoading: snapshotsLoading, isFetching: snapshotsFetching, refetch: refetchSnapshots } = useQuery({
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
    // Stale-while-revalidate config
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    placeholderData: keepPreviousData,
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

  // Only show full-page skeleton on true initial load with no data
  const showInitialSkeleton = snapshotsLoading && snapshots.length === 0;

  if (showInitialSkeleton) {
    return (
      <PageChrome>
        <div className="px-6 py-5 space-y-5 pb-8 max-w-[1400px] mx-auto">
          {/* Strategic Pulse Skeleton - 5 tiles */}
          <section className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border">
              <div className="h-3.5 w-24 bg-muted/50 rounded animate-pulse" />
            </div>
            <div className="p-3">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Primary card skeleton */}
                <div className="lg:w-[240px] min-h-[120px] p-4 rounded-md border border-border bg-muted/20 animate-pulse flex-shrink-0">
                  <div className="h-3 w-24 bg-muted/40 rounded mb-3" />
                  <div className="h-7 w-20 bg-muted/40 rounded mb-2" />
                  <div className="h-2.5 w-28 bg-muted/40 rounded" />
                </div>
                {/* Secondary card skeletons */}
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-3 rounded-md border border-border bg-muted/20 animate-pulse min-h-[56px]">
                      <div className="h-2.5 w-14 bg-muted/40 rounded mb-2" />
                      <div className="h-5 w-10 bg-muted/40 rounded mb-1" />
                      <div className="h-2 w-16 bg-muted/40 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Exposure & Gaps Skeleton - 3 cards */}
          <section className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border">
              <div className="h-3.5 w-28 bg-muted/50 rounded animate-pulse" />
            </div>
            <div className="p-3">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                {[1, 2, 3].map((col) => (
                  <div key={col} className="rounded-md border border-border bg-muted/20 overflow-hidden animate-pulse min-h-[140px]">
                    <div className="px-3 py-1.5 border-b border-border bg-muted/30 flex items-center gap-1.5">
                      <div className="h-3 w-3 bg-muted/50 rounded" />
                      <div className="h-2.5 w-20 bg-muted/40 rounded" />
                    </div>
                    <div className="p-2.5 space-y-2">
                      {[1, 2, 3].map((row) => (
                        <div key={row} className="flex items-center justify-between">
                          <div className="h-2.5 w-16 bg-muted/30 rounded" />
                          <div className="h-3 w-5 bg-muted/40 rounded" />
                        </div>
                      ))}
                    </div>
                    <div className="px-2.5 pb-2">
                      <div className="h-6 w-full bg-muted/20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Strategy Coverage Skeleton */}
          <section className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <div className="h-4 w-36 bg-muted/50 rounded animate-pulse" />
              <div className="h-6 w-20 bg-muted/30 rounded animate-pulse" />
            </div>
            <div className="p-4">
              <div className="flex gap-4">
                <div className="w-48 space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
                  ))}
                </div>
                <div className="flex-1 border border-border rounded-md bg-muted/10 animate-pulse min-h-[160px]" />
              </div>
            </div>
          </section>

          {/* OKR Tree Skeleton */}
          <section className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <div className="h-4 w-20 bg-muted/50 rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-7 w-32 bg-muted/30 rounded animate-pulse" />
                <div className="h-7 w-7 bg-muted/30 rounded animate-pulse" />
              </div>
            </div>
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded animate-pulse">
                  <div className="h-4 w-4 bg-muted/40 rounded" />
                  <div className="h-3.5 w-48 bg-muted/40 rounded" />
                  <div className="flex-1" />
                  <div className="h-3 w-12 bg-muted/30 rounded" />
                  <div className="h-1.5 w-20 bg-muted/30 rounded-full" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </PageChrome>
    );
  }

  // If we have snapshots but no effective ID yet, don't show skeleton - data is cached
  if (!effectiveSelectedSnapshotId && snapshots.length === 0) {
    return (
      <PageChrome>
        <div className="px-6 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
          No strategic snapshots found. Create one to get started.
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
        {/* Section 1: Strategic Pulse — "Are we winning?" */}
        <StrategicPulseSection snapshotId={effectiveSelectedSnapshotId} />

        {/* Section 2: Exposure & Gaps — "Where could strategy fail?" */}
        <ExposureGapsSection snapshotId={effectiveSelectedSnapshotId} />

        {/* Section 3: Coverage & Alignment — "Are strategy layers connected?" */}
        <StrategyStack 
          onLayerClick={handlePyramidLayerClick} 
          snapshotId={effectiveSelectedSnapshotId}
        />

        {/* Section 4: OKR Tree — "What drives outcomes underneath?" */}
        <OkrTree
          selectedSnapshot={effectiveSelectedSnapshotId}
          onObjectiveClick={handleObjectiveClick}
          onThemeClick={handleThemeClick}
        />

        {/* Collapsible: Strategy Context (Mission/Vision/Values) */}
        <div 
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-bg)',
            border: '1px solid var(--border-default)',
          }}
        >
          <button
            onClick={() => setShowContext(!showContext)}
            className="w-full px-5 py-3 flex items-center justify-between transition-colors"
            style={{ 
              borderBottom: showContext ? '1px solid var(--border-subtle)' : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div>
              <h2 
                className="text-[14px] font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Strategy Context
              </h2>
              <p 
                className="text-[11px] mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                Mission, vision, and values
              </p>
            </div>
            {showContext ? (
              <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} />
            ) : (
              <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
            )}
          </button>
          
          {showContext && (
            <StrategyContextCard snapshot={selectedSnapshot} onUpdate={refetchSnapshots} />
          )}
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
