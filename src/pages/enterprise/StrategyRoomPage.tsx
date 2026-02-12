/**
 * StrategyRoomPage — CIO-grade Enterprise Strategy Cockpit
 * Executive read-only view for strategic health and alignment
 * Uses ring-fenced --sr-* CSS tokens (V8 design system)
 */

import '@/styles/strategy-room.css';

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
import { Skeleton } from '@/components/ui/skeleton';

type ObjectiveLevel = "OBJECTIVES";

// Debounce delay for snapshot changes (prevents rapid switching flicker)
const SNAPSHOT_CHANGE_DEBOUNCE_MS = 200;

export default function StrategyRoomPage() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [debouncedSnapshotId, setDebouncedSnapshotId] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<ObjectiveLevel | undefined>(undefined);
  const [filterPI, setFilterPI] = useState<string | undefined>(undefined);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [snapshotSearchQuery, setSnapshotSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<any>(null);
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSnapshotChange = useCallback((newSnapshotId: string) => {
    setSelectedSnapshotId(newSnapshotId);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSnapshotId(newSnapshotId);
    }, SNAPSHOT_CHANGE_DEBOUNCE_MS);
  }, []);

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

  // Skeleton on INITIAL load only
  if (snapshotsLoading && snapshots.length === 0) {
    return (
      <PageChrome>
        <div className="px-5 py-4 pb-6 max-w-[1400px] mx-auto space-y-3">
          {/* Strategic Pulse Skeleton */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="p-4">
              <div className="flex flex-col lg:flex-row gap-3">
                <Skeleton className="lg:w-[240px] h-[140px] rounded-lg" />
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-[100px] rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Exposure & Gaps Skeleton */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[160px] rounded-lg" />
              ))}
            </div>
          </div>

          {/* Strategy Coverage Skeleton */}
          <Skeleton className="h-48 rounded-lg" />

          {/* OKR Tree Skeleton */}
          <Skeleton className="h-64 rounded-lg" />

          {/* Strategy Context Skeleton */}
          <Skeleton className="h-12 rounded-lg" />
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
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
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
    <PageChrome hideHeader>
      {/* Command Center–style header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div>
          <h1 className="text-xl font-bold text-foreground">Strategy Room</h1>
          <p className="text-sm text-muted-foreground">Executive overview of strategic health and alignment</p>
        </div>
        <div className="flex items-center gap-3">
          {snapshotSelector}
        </div>
      </div>
      {/* Ring-fenced Strategy Room wrapper - V8 design system */}
      <div className="strategy-room-content">
        <div className="px-5 py-4 pb-6 max-w-[1400px] mx-auto">
          {/* Executive Cockpit Grid */}
          <div className="space-y-3">
            {/* Section 1: Strategic Pulse */}
            <StrategicPulseSection snapshotId={effectiveDebouncedSnapshotId} />

          {/* Section 2: Exposure & Gaps */}
          <ExposureGapsSection snapshotId={effectiveDebouncedSnapshotId} />

          {/* Section 3: Coverage & Alignment */}
          <StrategyStack 
            onLayerClick={handlePyramidLayerClick} 
            snapshotId={effectiveDebouncedSnapshotId}
          />

          {/* Section 4: OKR Tree */}
          <OkrTree
            selectedSnapshot={effectiveDebouncedSnapshotId}
            onObjectiveClick={handleObjectiveClick}
            onThemeClick={handleThemeClick}
          />

          {/* Section 5: Strategy Context — Collapsible accordion */}
          <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
            <div 
              className="sr-section" 
              style={{ padding: 0, overflow: 'hidden' }}
            >
              <CollapsibleTrigger asChild>
                <button 
                  className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                  style={{ 
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sr-surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="flex items-center gap-2">
                    <Compass size={14} style={{ color: 'var(--sr-accent)' }} />
                    <div className="text-left">
                      <h2 
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--sr-text-primary)' }}
                      >
                        Strategy Context
                      </h2>
                      <p 
                        className="text-[10px]"
                        style={{ color: 'var(--sr-text-muted)' }}
                      >
                        Mission, vision, and values
                      </p>
                    </div>
                  </div>
                  <ChevronDown 
                    size={14} 
                    className={cn(
                      "transition-transform duration-200",
                      contextOpen && "rotate-180"
                    )}
                    style={{ color: 'var(--sr-text-muted)' }}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div style={{ borderTop: '1px solid var(--sr-border)' }}>
                  <StrategyContextCard snapshot={selectedSnapshot} onUpdate={refetchSnapshots} />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
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
