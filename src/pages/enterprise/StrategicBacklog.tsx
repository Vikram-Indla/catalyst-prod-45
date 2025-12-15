/**
 * Strategic Backlog - Enterprise Workspace
 * Single snapshot-scoped workspace with unified navigation
 * Default view: Themes
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Archive, CheckCircle2, Palette, Target, Boxes, AlertTriangle } from 'lucide-react';
import { PageChrome } from '@/components/layout/PageChrome';
import { StrategicBacklogThemesSection } from '@/components/strategic-backlog/StrategicBacklogThemesSection';
import { StrategicBacklogObjectivesSection } from '@/components/strategic-backlog/StrategicBacklogObjectivesSection';
import { StrategicBacklogEpicsSection } from '@/components/strategic-backlog/StrategicBacklogEpicsSection';
import { useStrategicThemes, useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';
import { cn } from '@/lib/utils';

type SubSection = 'themes' | 'objectives' | 'epics';

const NAV_ITEMS: { id: SubSection; label: string; icon: React.ElementType }[] = [
  { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'objectives', label: 'Objectives', icon: Target },
  { id: 'epics', label: 'Epics', icon: Boxes },
];

export default function StrategicBacklog() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [activeSection, setActiveSection] = useState<SubSection>('themes');

  // Fetch snapshots
  const { data: snapshots = [] } = useQuery({
    queryKey: ['strategy-snapshots-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Auto-select first snapshot
  const currentSnapshot = snapshots.find(s => s.id === selectedSnapshotId) || snapshots[0];
  const snapshotId = currentSnapshot?.id || '';
  const isArchived = currentSnapshot?.status === 'ARCHIVED';

  // Auto-select on mount
  useEffect(() => {
    if (snapshots.length > 0 && !selectedSnapshotId) {
      setSelectedSnapshotId(snapshots[0].id);
    }
  }, [snapshots, selectedSnapshotId]);

  // Fetch strategy data for counts
  const { data: themes = [] } = useStrategicThemes(snapshotId);
  const { data: links } = useSnapshotStrategyLinks(snapshotId);

  // Fetch objective count
  const { data: objectivesCount = 0 } = useQuery({
    queryKey: ['objectives-count', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return 0;
      const themeIds = themes.map(t => t.id);
      if (themeIds.length === 0) return 0;
      const { count, error } = await supabase
        .from('objectives')
        .select('*', { count: 'exact', head: true })
        .in('theme_id', themeIds);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!snapshotId && themes.length > 0,
  });

  // Fetch epics count for this snapshot
  const { data: epicsCount = 0 } = useQuery({
    queryKey: ['epics-count-snapshot', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return 0;
      // Count epics linked to themes in this snapshot
      const themeIds = themes.map(t => t.id);
      if (themeIds.length === 0) return 0;
      const { count, error } = await supabase
        .from('epics')
        .select('*', { count: 'exact', head: true })
        .in('theme_id', themeIds);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!snapshotId && themes.length > 0,
  });

  const headerActions = (
    <div className="flex items-center gap-3">
      {/* Snapshot Selector */}
      <Select value={snapshotId} onValueChange={setSelectedSnapshotId}>
        <SelectTrigger className="w-[220px] h-9 bg-surface border-border">
          <SelectValue placeholder="Select snapshot" />
        </SelectTrigger>
        <SelectContent className="z-[400]">
          {snapshots.map((snap) => (
            <SelectItem key={snap.id} value={snap.id}>
              <div className="flex items-center gap-2">
                {snap.status === 'ARCHIVED' && <Archive className="h-3 w-3 text-muted-foreground" />}
                {snap.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Badge */}
      {currentSnapshot && (
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            isArchived 
              ? "bg-muted text-muted-foreground border-border" 
              : "bg-surface border-border text-foreground"
          )}
        >
          {isArchived ? (
            <>
              <Archive className="h-3 w-3 mr-1" />
              Archived
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1 text-secondary-green" />
              {currentSnapshot.status}
            </>
          )}
        </Badge>
      )}
    </div>
  );

  // Summary metrics for insights panel
  const insightMetrics = [
    { label: 'Themes', value: themes.length },
    { label: 'Objectives', value: objectivesCount },
    { label: 'Linked Epics', value: epicsCount },
  ];

  return (
    <PageChrome rightActions={headerActions}>
      {!snapshotId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Select a Strategic Snapshot to view and manage strategic items.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sub-Navigation */}
          <div className="w-48 border-r border-border bg-surface shrink-0">
            {/* Insights Panel (compact) */}
            <div className="p-4 border-b border-border">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Summary</h3>
              <div className="space-y-2">
                {insightMetrics.map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{metric.label}</span>
                    <span className="font-medium text-foreground">{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="p-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[rgba(92,124,92,0.08)] text-secondary-green"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {item.id === 'themes' && themes.length === 0 && !isArchived && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 ml-auto">!</Badge>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-auto p-6">
            {activeSection === 'themes' && (
              <StrategicBacklogThemesSection
                themes={themes}
                snapshotId={snapshotId}
                isArchived={isArchived}
              />
            )}
            {activeSection === 'objectives' && (
              <StrategicBacklogObjectivesSection
                snapshotId={snapshotId}
                themes={themes}
                isArchived={isArchived}
              />
            )}
            {activeSection === 'epics' && (
              <StrategicBacklogEpicsSection
                snapshotId={snapshotId}
                themes={themes}
                links={links || null}
                isArchived={isArchived}
              />
            )}
          </div>
        </div>
      )}
    </PageChrome>
  );
}
