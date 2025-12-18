/**
 * StrategyRoom — CIO-grade Enterprise Strategy Cockpit
 * Executive read-only view for strategic health and alignment
 * Stability pass done: no blanking, no spinners, single Strategy Context header.
 */

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { StrategyContextCard } from '@/components/strategy/StrategyContextCard';
import { StrategicPulseSection } from '@/components/strategy/StrategicPulseSection';
import { ExposureGapsSection } from '@/components/strategy/ExposureGapsSection';
import { StrategyStack } from '@/components/strategy/StrategyStack';
import { OkrTree } from '@/components/strategy/OkrTree';
import { ObjectiveAnalyticsDrawer } from '@/modules/okr-v2';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageChrome } from '@/components/layout/PageChrome';
import { toast } from 'sonner';
import { Calendar, ChevronDown, Compass } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type ObjectiveLevel = "OBJECTIVES";

export default function StrategyRoomPage() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<ObjectiveLevel | undefined>(undefined);
  const [filterPI, setFilterPI] = useState<string | undefined>(undefined);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [snapshotSearchQuery, setSnapshotSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<any>(null);
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

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

  // Skeleton loading state - matches final layout exactly
  if (snapshotsLoading || !effectiveSelectedSnapshotId) {
    return (
      <PageChrome>
        <div className="px-5 py-4 pb-6 max-w-[1400px] mx-auto">
          <div className="space-y-3">
            {/* Strategic Pulse Skeleton - Executive hierarchy */}
            <SkeletonSection>
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Primary card skeleton */}
                <div 
                  className="lg:w-[240px] min-h-[120px] p-4 rounded-md flex-shrink-0"
                  style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  <div className="h-3 w-24 rounded mb-3 animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                  <div className="h-7 w-20 rounded mb-2 animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                  <div className="h-2.5 w-28 rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                </div>
                {/* Secondary cards skeleton */}
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className="p-3 rounded-md min-h-[56px]"
                      style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
                    >
                      <div className="h-2.5 w-14 rounded mb-2 animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                      <div className="h-5 w-10 rounded mb-1 animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                      <div className="h-2 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                    </div>
                  ))}
                </div>
              </div>
            </SkeletonSection>

            {/* Exposure & Gaps Skeleton - 3 cards */}
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
      <div className="px-5 py-4 pb-6 max-w-[1400px] mx-auto bg-background">
        {/* Executive Cockpit Grid — Tighter vertical rhythm */}
        <div className="space-y-3">
          {/* Section 1: Strategic Pulse — Signal-led health cockpit */}
          <StrategicPulseSection snapshotId={effectiveSelectedSnapshotId} />

          {/* Section 2: Exposure & Gaps — Risk surface */}
          <ExposureGapsSection snapshotId={effectiveSelectedSnapshotId} />

          {/* Section 3: Coverage & Alignment — Strategy layers */}
          <StrategyStack 
            onLayerClick={handlePyramidLayerClick} 
            snapshotId={effectiveSelectedSnapshotId}
          />

          {/* Section 4: OKR Tree — Execution details */}
          <OkrTree
            selectedSnapshot={effectiveSelectedSnapshotId}
            onObjectiveClick={handleObjectiveClick}
            onThemeClick={handleThemeClick}
          />

          {/* Section 5: Strategy Context — Collapsible accordion with single header */}
          <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
            <section 
              className="rounded-lg overflow-hidden"
              style={{ 
                backgroundColor: 'var(--surface-bg)', 
                border: '1px solid var(--border-default)' 
              }}
            >
              <CollapsibleTrigger asChild>
                <button
                  className="w-full px-4 py-2.5 flex items-center justify-between transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <div className="flex items-center gap-2">
                    <Compass size={14} style={{ color: 'var(--brand-primary)' }} />
                    <div className="text-left">
                      <h2 
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Strategy Context
                      </h2>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
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
                    style={{ color: 'var(--text-muted)' }}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
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

// Skeleton components for consistent loading states
function SkeletonSection({ children, height }: { children?: React.ReactNode; height?: string }) {
  return (
    <div 
      className={cn("rounded-lg overflow-hidden", height)}
      style={{ 
        backgroundColor: 'var(--surface-bg)', 
        border: '1px solid var(--border-default)' 
      }}
    >
      <div 
        className="px-4 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="h-3 w-24 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
      </div>
      {children ? (
        <div className="p-3">{children}</div>
      ) : (
        <div className="p-3 flex-1" />
      )}
    </div>
  );
}

function SkeletonTile() {
  return (
    <div 
      className="p-3 rounded-md min-h-[88px]"
      style={{ 
        backgroundColor: 'var(--muted)', 
        border: '1px solid var(--border)',
        borderLeft: '2px solid var(--border)'
      }}
    >
      <div className="h-2.5 w-16 rounded mb-2.5 animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.2 }} />
      <div className="h-6 w-10 rounded mb-2 animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.2 }} />
      <div className="h-2 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.2 }} />
    </div>
  );
}

function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div 
      className="rounded-md overflow-hidden min-h-[140px]"
      style={{ 
        backgroundColor: 'var(--muted)', 
        border: '1px solid var(--border)' 
      }}
    >
      <div 
        className="px-3 py-2 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="h-3 w-3 rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.2 }} />
        <div className="h-2.5 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.2 }} />
      </div>
      <div className="p-3 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-2.5 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.2 }} />
            <div className="h-3 w-5 rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.2 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
