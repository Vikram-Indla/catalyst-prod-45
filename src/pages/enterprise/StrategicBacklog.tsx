/**
 * Strategic Backlog - Enterprise Strategy Command Center
 * CLAUDE DESIGN TAKEOVER - Token-based theming
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Archive, CheckCircle2, Plus, ChevronDown, AlertTriangle, Search } from 'lucide-react';
import { PageChrome } from '@/components/layout/PageChrome';
import { StrategicBacklogThemesSection } from '@/components/strategic-backlog/StrategicBacklogThemesSection';
import { StrategicBacklogObjectivesSection } from '@/components/strategic-backlog/StrategicBacklogObjectivesSection';
import { StrategicBacklogEpicsSection } from '@/components/strategic-backlog/StrategicBacklogEpicsSection';
import { StrategicBacklogSegmentedControl } from '@/components/strategic-backlog/StrategicBacklogSegmentedControl';
import { StrategicBacklogCoveragePanel } from '@/components/strategic-backlog/StrategicBacklogCoveragePanel';
import { CreateThemeDialog } from '@/components/strategic-backlog/CreateThemeDialog';
import { useStrategicThemes, useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';
import { cn } from '@/lib/utils';

type SubSection = 'themes' | 'objectives' | 'epics';

export default function StrategicBacklog() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [activeSection, setActiveSection] = useState<SubSection>('themes');
  const [createThemeOpen, setCreateThemeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetch strategy data
  const { data: themes = [] } = useStrategicThemes(snapshotId);
  const { data: links } = useSnapshotStrategyLinks(snapshotId);
  const themeIds = themes.map(t => t.id);

  // Fetch objectives count and coverage
  const { data: objectivesData = { count: 0, withKRs: 0 } } = useQuery({
    queryKey: ['objectives-coverage', snapshotId, themeIds],
    queryFn: async () => {
      if (themeIds.length === 0) return { count: 0, withKRs: 0 };
      
      const { data: objectives, error } = await supabase
        .from('objectives')
        .select('id')
        .in('theme_id', themeIds);
      
      if (error) return { count: 0, withKRs: 0 };
      
      const objectiveIds = (objectives || []).map(o => o.id);
      if (objectiveIds.length === 0) return { count: objectives?.length || 0, withKRs: 0 };
      
      const { data: krs } = await supabase
        .from('key_results')
        .select('objective_id')
        .in('objective_id', objectiveIds);
      
      const objectivesWithKRs = new Set((krs || []).map(kr => kr.objective_id)).size;
      
      return { count: objectives?.length || 0, withKRs: objectivesWithKRs };
    },
    enabled: !!snapshotId && themeIds.length > 0,
  });

  // Fetch themes with objectives coverage
  const { data: themesWithObjectives = 0 } = useQuery({
    queryKey: ['themes-with-objectives', snapshotId, themeIds],
    queryFn: async () => {
      if (themeIds.length === 0) return 0;
      
      const { data: objectives } = await supabase
        .from('objectives')
        .select('theme_id')
        .in('theme_id', themeIds);
      
      const themesWithObj = new Set((objectives || []).map(o => o.theme_id)).size;
      return themesWithObj;
    },
    enabled: !!snapshotId && themeIds.length > 0,
  });

  // Fetch epics counts
  const { data: epicsData = { total: 0, aligned: 0 } } = useQuery({
    queryKey: ['epics-coverage', snapshotId, themeIds],
    queryFn: async () => {
      const { count: aligned } = await supabase
        .from('epics')
        .select('*', { count: 'exact', head: true })
        .in('theme_id', themeIds);
      
      const { count: unaligned } = await supabase
        .from('epics')
        .select('*', { count: 'exact', head: true })
        .is('theme_id', null);
      
      return { 
        total: (aligned || 0) + (unaligned || 0), 
        aligned: aligned || 0 
      };
    },
    enabled: !!snapshotId && themeIds.length > 0,
  });

  // Header actions
  const headerActions = (
    <div className="flex items-center gap-3">
      {/* Snapshot Selector */}
      <Select value={snapshotId} onValueChange={setSelectedSnapshotId}>
        <SelectTrigger className="w-[220px] h-9 bg-catalyst-surface border-catalyst-border text-catalyst-text">
          <SelectValue placeholder="Select snapshot" />
        </SelectTrigger>
        <SelectContent className="z-[400] bg-catalyst-surface border-catalyst-border">
          {snapshots.map((snap) => (
            <SelectItem key={snap.id} value={snap.id} className="text-catalyst-text hover:bg-catalyst-surface-hover">
              <div className="flex items-center gap-2">
                {snap.status === 'ARCHIVED' && <Archive className="h-3 w-3 text-catalyst-text-muted" />}
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
            "text-xs h-7 border",
            isArchived 
              ? "bg-catalyst-surface-hover text-catalyst-text-muted border-catalyst-border" 
              : "bg-emerald-50 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
          )}
        >
          {isArchived ? (
            <>
              <Archive className="h-3 w-3 mr-1" />
              Archived
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              active
            </>
          )}
        </Badge>
      )}

      {/* Create Split Button */}
      {!isArchived && snapshotId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="bg-catalyst-gold hover:bg-catalyst-gold-hover text-white gap-1">
              <Plus className="h-4 w-4" />
              Create
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[400] bg-catalyst-surface border-catalyst-border">
            <DropdownMenuItem 
              onClick={() => setCreateThemeOpen(true)}
              className="text-catalyst-text hover:bg-catalyst-surface-hover cursor-pointer"
            >
              Theme
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setActiveSection('objectives')}
              className="text-catalyst-text hover:bg-catalyst-surface-hover cursor-pointer"
            >
              Objective
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setActiveSection('epics')}
              className="text-catalyst-text hover:bg-catalyst-surface-hover cursor-pointer"
            >
              Epic
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <PageChrome rightActions={headerActions}>
      {!snapshotId ? (
        <div className="flex-1 flex items-center justify-center bg-catalyst-bg">
          <div className="text-center p-8">
            <div className="p-4 rounded-full bg-catalyst-surface mx-auto w-fit mb-4">
              <AlertTriangle className="h-8 w-8 text-catalyst-text-muted" />
            </div>
            <h3 className="text-base font-semibold text-catalyst-text mb-2">
              Select a Strategic Snapshot
            </h3>
            <p className="text-sm text-catalyst-text-secondary max-w-sm">
              Choose a snapshot from the dropdown above to view and manage strategic items.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-catalyst-bg">
          {/* Sticky Toolbar */}
          <div className="shrink-0 px-6 py-4 border-b border-catalyst-border bg-catalyst-bg">
            <div className="flex items-center justify-between gap-4">
              {/* Segmented Control */}
              <StrategicBacklogSegmentedControl
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                counts={{
                  themes: themes.length,
                  objectives: objectivesData.count,
                  epics: epicsData.aligned,
                }}
              />

              {/* Search */}
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-catalyst-text-muted" />
                <Input
                  placeholder={`Search ${activeSection}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 w-64 bg-catalyst-surface border-catalyst-border text-catalyst-text placeholder:text-catalyst-text-muted"
                />
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Coverage Panel */}
            <div className="w-64 shrink-0 border-r border-catalyst-border bg-catalyst-surface p-4 overflow-y-auto">
              <StrategicBacklogCoveragePanel
                themes={themes.length}
                themesWithObjectives={themesWithObjectives}
                objectives={objectivesData.count}
                objectivesWithKRs={objectivesData.withKRs}
                epics={epicsData.total}
                epicsAligned={epicsData.aligned}
                onNavigate={setActiveSection}
              />
            </div>

            {/* Right: Table Content */}
            <div className="flex-1 overflow-auto p-6 bg-catalyst-bg">
              {activeSection === 'themes' && (
                <StrategicBacklogThemesSection
                  themes={themes}
                  snapshotId={snapshotId}
                  isArchived={isArchived}
                  searchQuery={searchQuery}
                />
              )}
              {activeSection === 'objectives' && (
                <StrategicBacklogObjectivesSection
                  snapshotId={snapshotId}
                  themes={themes}
                  isArchived={isArchived}
                  searchQuery={searchQuery}
                />
              )}
              {activeSection === 'epics' && (
                <StrategicBacklogEpicsSection
                  snapshotId={snapshotId}
                  themes={themes}
                  links={links || null}
                  isArchived={isArchived}
                  searchQuery={searchQuery}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Theme Dialog */}
      <CreateThemeDialog
        open={createThemeOpen}
        onOpenChange={setCreateThemeOpen}
        snapshotId={snapshotId}
        snapshotName={currentSnapshot?.name}
        snapshots={snapshots}
      />
    </PageChrome>
  );
}
