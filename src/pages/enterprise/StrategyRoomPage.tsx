/**
 * StrategyRoomPage — CIO-grade Enterprise Strategy Cockpit
 * Executive read-only view for strategic health and alignment
 * 
 * UX STABILITY LOCK (NON-NEGOTIABLE):
 * ─────────────────────────────────────────────────
 * 1. NO font size changes during loading/refresh
 * 2. NO greying out content during loading/refresh
 * 3. NO skeletons after first successful load
 * 4. NO layout shift, twitching, or flicker
 * 5. UI consistency > data freshness
 * 6. If data is refreshing → keep last visible UI intact
 * 
 * SNAPSHOT SWITCHING:
 * - Previous data remains visible until new data is ready
 * - If new data fails: keep previous + show "Data may be outdated"
 * - 200ms debounce prevents rapid-switch flicker
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { StrategicPulseSection } from '@/components/strategy/StrategicPulseSection';
import { ExposureGapsSection } from '@/components/strategy/ExposureGapsSection';
import { StrategyStack } from '@/components/strategy/StrategyStack';
import { OkrTree } from '@/components/strategy/OkrTree';
import { StrategyContextCard } from '@/components/strategy/StrategyContextCard';
import { ObjectiveAnalyticsDrawer } from '@/modules/okr-v2';
import { CatalystThemeDrawer } from '@/components/backlog/CatalystThemeDrawer';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageChrome } from '@/components/layout/PageChrome';
import { toast } from 'sonner';
import { Calendar, ChevronDown, Compass } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// Import ring-fenced Strategy Room CSS
import '@/styles/strategy-room.css';

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
  const [contextOpen, setContextOpen] = useState(false);

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced snapshot change handler - prevents flicker during rapid changes
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

  // Skeleton only on INITIAL load - matches final layout exactly
  // ⚠️ After first success, NEVER show skeletons again
  if (snapshotsLoading && snapshots.length === 0) {
    return (
      <PageChrome>
        <div className="px-5 py-4 pb-6 max-w-[1400px] mx-auto">
          <div className="space-y-3">
            {/* Strategic Pulse Skeleton */}
            <SkeletonSection>
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="lg:w-[240px] min-h-[120px] p-4 rounded-md flex-shrink-0 bg-muted/40 dark:bg-muted/20">
                  <div className="h-3 w-24 rounded mb-3 animate-pulse bg-muted-foreground/15" />
                  <div className="h-7 w-20 rounded mb-2 animate-pulse bg-muted-foreground/15" />
                  <div className="h-2.5 w-28 rounded animate-pulse bg-muted-foreground/15" />
                </div>
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className="p-3 rounded-md min-h-[56px] bg-muted/40 dark:bg-muted/20"
                    >
                      <div className="h-2.5 w-14 rounded mb-2 animate-pulse bg-muted-foreground/15" />
                      <div className="h-5 w-10 rounded mb-1 animate-pulse bg-muted-foreground/15" />
                      <div className="h-2 w-16 rounded animate-pulse bg-muted-foreground/15" />
                    </div>
                  ))}
                </div>
              </div>
            </SkeletonSection>

            {/* Exposure & Gaps Skeleton */}
            <SkeletonSection>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} rows={4} />
                ))}
              </div>
            </SkeletonSection>

            {/* Strategy Coverage Skeleton */}
            <SkeletonSection height="h-48" />

            {/* OKR Tree Skeleton */}
            <SkeletonSection height="h-64" />

            {/* Strategy Context Skeleton */}
            <SkeletonSection height="h-12" />
          </div>
        </div>
      </PageChrome>
    );
  }

  // Empty state - no snapshots
  if (!effectiveSelectedSnapshotId && snapshots.length === 0) {
    return (
      <PageChrome>
        <div className="px-6 py-8 text-center text-muted-foreground">
          No strategic snapshots found. Create one to get started.
        </div>
      </PageChrome>
    );
  }

  // Snapshot selector for PageChrome rightActions
  const snapshotSelector = (
    <div className="flex items-center gap-3">
      <Calendar size={14} className="text-muted-foreground" />
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Snapshot
      </span>
      <div className="w-56">
        <Select value={effectiveSelectedSnapshotId} onValueChange={handleSnapshotChange}>
          <SelectTrigger className="h-8 text-[13px] rounded-md bg-background border-border">
            <SelectValue placeholder="Select snapshot" />
          </SelectTrigger>
          <SelectContent className="z-[400] bg-popover">
            <div className="p-2">
              <Input
                placeholder="Search snapshots..."
                value={snapshotSearchQuery}
                onChange={(e) => setSnapshotSearchQuery(e.target.value)}
                className="mb-2 h-7 text-[12px]"
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
      {/* Ring-fenced Strategy Room container - applies sr-* CSS variables */}
      <div className="strategy-room-content px-5 py-4 pb-6 max-w-[1400px] mx-auto">
        {/* Executive Cockpit Grid — Tighter vertical rhythm */}
        <div className="space-y-3">
          {/* Section 1: Strategic Pulse — Signal-led health cockpit */}
          <StrategicPulseSection snapshotId={effectiveDebouncedSnapshotId} />

          {/* Section 2: Exposure & Gaps — Risk surface */}
          <ExposureGapsSection snapshotId={effectiveDebouncedSnapshotId} />

          {/* Section 3: Coverage & Alignment — Strategy layers */}
          <StrategyStack 
            onLayerClick={handlePyramidLayerClick} 
            snapshotId={effectiveDebouncedSnapshotId}
          />

          {/* Section 4: OKR Tree — Execution details */}
          <OkrTree
            selectedSnapshot={effectiveDebouncedSnapshotId}
            onObjectiveClick={handleObjectiveClick}
            onThemeClick={handleThemeClick}
          />

          {/* Section 5: Strategy Context — Collapsible accordion */}
          <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
            <section className="sr-section">
              <CollapsibleTrigger asChild>
                <button className="sr-context-trigger">
                  <div className="flex items-center gap-2">
                    <Compass size={14} style={{ color: 'var(--sr-accent)' }} />
                    <div className="text-left">
                      <h2 className="sr-section-title-text">
                        Strategy Context
                      </h2>
                      <p className="sr-section-subtitle">
                        Mission, vision, and values
                      </p>
                    </div>
                  </div>
                  <ChevronDown 
                    size={14} 
                    className={cn(
                      "transition-transform duration-200"
                    )}
                    style={{ 
                      color: 'var(--sr-text-tertiary)',
                      transform: contextOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div style={{ borderTop: '1px solid var(--sr-border-light)' }}>
                  <StrategyContextCard snapshot={selectedSnapshot} onUpdate={refetchSnapshots} />
                </div>
              </CollapsibleContent>
            </section>
          </Collapsible>
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

      <CatalystThemeDrawer
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

// ─────────────────────────────────────────────────
// Skeleton components for INITIAL loading state ONLY
// ⚠️ These are ONLY shown on first load, NEVER after first success
// ─────────────────────────────────────────────────

function SkeletonSection({ children, height }: { children?: React.ReactNode; height?: string }) {
  return (
    <div className={cn("rounded-lg overflow-hidden bg-card/50 dark:bg-card/30", height)}>
      <div className="px-4 py-2 bg-muted/30 dark:bg-muted/10">
        <div className="h-3 w-24 rounded animate-pulse bg-muted" />
      </div>
      {children ? (
        <div className="p-3">{children}</div>
      ) : (
        <div className="p-3 flex-1" />
      )}
    </div>
  );
}

function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-md overflow-hidden min-h-[140px] bg-muted/40 dark:bg-muted/20">
      <div className="px-3 py-2 flex items-center gap-2 bg-muted/20 dark:bg-muted/10">
        <div className="h-3 w-3 rounded animate-pulse bg-muted-foreground/20" />
        <div className="h-2.5 w-20 rounded animate-pulse bg-muted-foreground/20" />
      </div>
      <div className="p-3 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-2.5 w-16 rounded animate-pulse bg-muted-foreground/20" />
            <div className="h-3 w-5 rounded animate-pulse bg-muted-foreground/20" />
          </div>
        ))}
      </div>
    </div>
  );
}
