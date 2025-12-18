import { useState, useEffect, useRef, useCallback } from 'react';
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

// Debounce delay for snapshot changes (prevents rapid switching flicker)
const SNAPSHOT_CHANGE_DEBOUNCE_MS = 200;

export default function StrategyRoomPage() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  // Debounced snapshot ID that actually triggers data fetches
  const [debouncedSnapshotId, setDebouncedSnapshotId] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<ObjectiveLevel | undefined>(undefined);
  const [filterPI, setFilterPI] = useState<string | undefined>(undefined);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [snapshotSearchQuery, setSnapshotSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<any>(null);
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
  const [showContext, setShowContext] = useState(false);

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced snapshot change handler
  const handleSnapshotChange = useCallback((newSnapshotId: string) => {
    setSelectedSnapshotId(newSnapshotId);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce the actual data fetch
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSnapshotId(newSnapshotId);
    }, SNAPSHOT_CHANGE_DEBOUNCE_MS);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

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
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (snapshots.length > 0 && !selectedSnapshotId) {
      const defaultSnapshot = snapshots.find(s => s.name === 'Corporate Strategy 2025') || snapshots[0];
      if (defaultSnapshot) {
        setSelectedSnapshotId(defaultSnapshot.id);
        setDebouncedSnapshotId(defaultSnapshot.id);
      }
    }
  }, [snapshots, selectedSnapshotId]);

  // Use selectedSnapshotId for dropdown display, debouncedSnapshotId for data fetches
  const effectiveSelectedSnapshotId = selectedSnapshotId || snapshots.find(s => s.name === 'Corporate Strategy 2025')?.id || snapshots[0]?.id || '';
  const effectiveDebouncedSnapshotId = debouncedSnapshotId || effectiveSelectedSnapshotId;
  const selectedSnapshot = snapshots.find((s) => s.id === effectiveSelectedSnapshotId);

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

  const showInitialSkeleton = snapshotsLoading && snapshots.length === 0;

  if (showInitialSkeleton) {
    return (
      <PageChrome>
        <div className="px-5 py-4 space-y-4 pb-6 max-w-[1400px] mx-auto">
          {/* Strategic Pulse Skeleton */}
          <section 
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-default)' }}
          >
            <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="h-3 w-28 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            </div>
            <div className="p-3">
              <div className="flex flex-col lg:flex-row gap-2">
                <div 
                  className="lg:w-[220px] min-h-[100px] p-3 rounded-md flex-shrink-0 animate-pulse"
                  style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
                />
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i}
                      className="p-2.5 rounded-md min-h-[52px] animate-pulse"
                      style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Exposure & Gaps Skeleton */}
          <section 
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-default)' }}
          >
            <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="h-3 w-28 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            </div>
            <div className="p-3">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                {[1, 2, 3].map((col) => (
                  <div 
                    key={col}
                    className="rounded-md min-h-[120px] animate-pulse"
                    style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Strategy Coverage Skeleton */}
          <section 
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-default)' }}
          >
            <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="h-4 w-36 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            </div>
            <div className="p-3">
              <div className="flex gap-3">
                <div className="w-44 space-y-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-9 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
                  ))}
                </div>
                <div className="flex-1 rounded-md min-h-[140px] animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
              </div>
            </div>
          </section>

          {/* OKR Tree Skeleton */}
          <section 
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-default)' }}
          >
            <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="h-4 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            </div>
            <div className="p-3 space-y-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
              ))}
            </div>
          </section>
        </div>
      </PageChrome>
    );
  }

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
    <div className="flex items-center gap-2">
      <span 
        className="text-[11px] font-medium"
        style={{ color: 'var(--text-muted)' }}
      >
        Snapshot:
      </span>
      <div className="w-52">
        <Select value={effectiveSelectedSnapshotId} onValueChange={handleSnapshotChange}>
          <SelectTrigger 
            className="h-7 text-[12px] rounded-md"
            style={{ 
              backgroundColor: 'var(--surface-2)', 
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
          >
            <SelectValue placeholder="Select snapshot" />
          </SelectTrigger>
          <SelectContent className="z-[400]">
            <div className="p-2">
              <Input
                placeholder="Search..."
                value={snapshotSearchQuery}
                onChange={(e) => setSnapshotSearchQuery(e.target.value)}
                className="mb-2 h-6 text-[11px]"
                style={{ 
                  backgroundColor: 'var(--surface-2)', 
                  borderColor: 'var(--border-subtle)',
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
      {/* Tighter spacing: 16-20px gaps between sections */}
      <div 
        className="px-5 py-4 pb-6 max-w-[1400px] mx-auto"
        style={{ backgroundColor: 'var(--page-bg)' }}
      >
        {/* Section 1: Strategic Pulse */}
        <StrategicPulseSection snapshotId={effectiveDebouncedSnapshotId} />

        {/* Section 2: Exposure & Gaps - 16px gap */}
        <div className="mt-4">
          <ExposureGapsSection snapshotId={effectiveDebouncedSnapshotId} />
        </div>

        {/* Section 3: Coverage & Alignment - 16px gap */}
        <div className="mt-4">
          <StrategyStack 
            onLayerClick={handlePyramidLayerClick} 
            snapshotId={effectiveDebouncedSnapshotId}
          />
        </div>

        {/* Section 4: OKR Tree - 16px gap */}
        <div className="mt-4">
          <OkrTree
            selectedSnapshot={effectiveDebouncedSnapshotId}
            onObjectiveClick={handleObjectiveClick}
            onThemeClick={handleThemeClick}
          />
        </div>

        {/* Collapsible: Strategy Context - 16px gap */}
        <div 
          className="mt-4 rounded-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-bg)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <button
            onClick={() => setShowContext(!showContext)}
            className="w-full px-4 py-2.5 flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
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
                className="text-[13px] font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Strategy Context
              </h2>
              <p 
                className="text-[10px] mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                Mission, vision, and values
              </p>
            </div>
            {showContext ? (
              <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} />
            ) : (
              <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
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
