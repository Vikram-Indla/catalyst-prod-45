/**
 * StrategyRoom V6 — CIO-grade Enterprise Strategy Cockpit
 * Executive read-only view for strategic health and alignment
 * Uses ring-fenced --sr-* design tokens scoped to .strategy-room-content
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
import { CatalystThemeDrawer } from '@/components/backlog/CatalystThemeDrawer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageChrome } from '@/components/layout/PageChrome';
import { toast } from 'sonner';
import { Calendar, ChevronDown, Compass } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import '@/styles/strategy-room.css';

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

  // Skeleton loading state - matches final layout with V6 tokens
  if (snapshotsLoading || !effectiveSelectedSnapshotId) {
    return (
      <PageChrome>
        <div className="strategy-room-content px-5 py-4 pb-6 max-w-[1400px] mx-auto">
          <div className="space-y-3">
            {/* Strategic Pulse Skeleton - Executive hierarchy */}
            <SkeletonSection>
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Primary card skeleton */}
                <div 
                  className="lg:w-[240px] min-h-[120px] p-4 rounded-md flex-shrink-0"
                  style={{ backgroundColor: 'var(--sr-surface-muted)', border: '1px solid var(--sr-border-default)' }}
                >
                  <div className="sr-skeleton h-3 w-24 mb-3" />
                  <div className="sr-skeleton h-7 w-20 mb-2" />
                  <div className="sr-skeleton h-2.5 w-28" />
                </div>
                {/* Secondary cards skeleton */}
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className="p-3 rounded-md min-h-[56px]"
                      style={{ backgroundColor: 'var(--sr-surface-muted)', border: '1px solid var(--sr-border-default)' }}
                    >
                      <div className="sr-skeleton h-2.5 w-14 mb-2" />
                      <div className="sr-skeleton h-5 w-10 mb-1" />
                      <div className="sr-skeleton h-2 w-16" />
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
    <div className="sr-snapshot-selector">
      <Calendar size={14} style={{ color: 'var(--sr-text-tertiary)' }} />
      <span className="sr-snapshot-label">Snapshot</span>
      <div className="w-56">
        <Select value={effectiveSelectedSnapshotId} onValueChange={handleSnapshotChange}>
          <SelectTrigger 
            className="h-8 text-[13px] rounded-md"
            style={{ 
              backgroundColor: 'var(--sr-surface-card)', 
              borderColor: 'var(--sr-border-default)',
              color: 'var(--sr-text-primary)'
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
                  backgroundColor: 'var(--sr-surface-card)', 
                  borderColor: 'var(--sr-border-default)',
                  color: 'var(--sr-text-primary)'
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
      <div className="strategy-room-content px-5 py-4 pb-6 max-w-[1400px] mx-auto">
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

          {/* Section 5: Strategy Context — Collapsible accordion */}
          <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
            <section className="sr-section">
              <CollapsibleTrigger asChild>
                <button className="sr-context-trigger">
                  <div className="flex items-center gap-2">
                    <Compass size={14} style={{ color: 'var(--sr-accent)' }} />
                    <div className="text-left">
                      <h2 
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--sr-text-primary)' }}
                      >
                        Strategy Context
                      </h2>
                      <p className="text-[10px]" style={{ color: 'var(--sr-text-tertiary)' }}>
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
                    style={{ color: 'var(--sr-text-tertiary)' }}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="sr-context-content">
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

// Skeleton components using V6 design tokens
function SkeletonSection({ children, height }: { children?: React.ReactNode; height?: string }) {
  return (
    <div 
      className={cn("sr-section", height)}
      style={{ 
        backgroundColor: 'var(--sr-surface-card)', 
        border: '1px solid var(--sr-border-default)' 
      }}
    >
      <div 
        className="sr-section-header"
        style={{ borderBottom: '1px solid var(--sr-border-light)' }}
      >
        <div className="sr-skeleton h-3 w-24" />
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
        backgroundColor: 'var(--sr-surface-muted)', 
        border: '1px solid var(--sr-border-default)',
        borderLeft: '4px solid var(--sr-border-strong)'
      }}
    >
      <div className="sr-skeleton h-2.5 w-16 mb-2.5" />
      <div className="sr-skeleton h-6 w-10 mb-2" />
      <div className="sr-skeleton h-2 w-20" />
    </div>
  );
}

function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div 
      className="sr-panel"
      style={{ 
        backgroundColor: 'var(--sr-surface-card)', 
        border: '1px solid var(--sr-border-default)' 
      }}
    >
      <div 
        className="sr-panel-header"
        style={{ borderBottom: '1px solid var(--sr-border-light)' }}
      >
        <div className="sr-skeleton h-3 w-3 rounded" />
        <div className="sr-skeleton h-2.5 w-20" />
      </div>
      <div className="sr-panel-body space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="sr-skeleton h-2.5 w-16" />
            <div className="sr-skeleton h-3 w-5" />
          </div>
        ))}
      </div>
    </div>
  );
}
