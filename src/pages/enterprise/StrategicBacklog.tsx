/**
 * Strategic Backlog - Enterprise Strategy Command Center
 * Pixel-perfect implementation matching Catalyst design specs
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { PageChrome } from '@/components/layout/PageChrome';
import { StrategicBacklogTabs } from '@/components/strategic-backlog/StrategicBacklogTabs';
import { StrategicBacklogCoveragePanel } from '@/components/strategic-backlog/StrategicBacklogCoveragePanel';
import { StrategicBacklogThemesSection } from '@/components/strategic-backlog/StrategicBacklogThemesSection';
import { StrategicBacklogObjectivesSection } from '@/components/strategic-backlog/StrategicBacklogObjectivesSection';
import { StrategicBacklogEpicsSection } from '@/components/strategic-backlog/StrategicBacklogEpicsSection';
import { AddToBacklogModal } from '@/components/strategic-backlog/AddToBacklogModal';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';
import { ObjectiveDrawerV2 } from '@/modules/okr-v2/components/ObjectiveDrawerV2';
import { useStrategicThemes } from '@/hooks/useStrategicBacklog';
import { 
  useStrategicBacklogCounts, 
  useStrategicBacklogRealtime,
  useThemeObjectiveCounts as useThemeObjCounts,
  useObjectiveKrCounts,
  useEpicFeatureCounts,
} from '@/hooks/useStrategicBacklogList';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';

type SubSection = 'themes' | 'objectives' | 'epics';

export default function StrategicBacklog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as SubSection | null;
  
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [activeSection, setActiveSection] = useState<SubSection>(tabParam || 'themes');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'theme' | 'objective' | 'epic' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Debounce search for performance
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Persist tab to URL
  const handleSectionChange = useCallback((section: SubSection) => {
    setActiveSection(section);
    setSearchQuery(''); // Clear search when switching tabs
    setSearchParams({ tab: section });
  }, [setSearchParams]);

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

  // Fetch themes for the snapshot
  const { data: themes = [], refetch: refetchThemes } = useStrategicThemes(snapshotId);
  const themeIds = useMemo(() => themes.map(t => t.id), [themes]);

  // Fetch objectives for the themes
  const { data: objectives = [], isLoading: loadingObjectives, refetch: refetchObjectives } = useQuery({
    queryKey: ['strategic-backlog-objectives', snapshotId, themeIds, debouncedSearch],
    queryFn: async () => {
      if (themeIds.length === 0) return [];
      let query = supabase
        .from('objectives')
        .select('*')
        .in('theme_id', themeIds);
      
      if (debouncedSearch && activeSection === 'objectives') {
        query = query.or(`name.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!snapshotId && themeIds.length > 0,
  });

  // Fetch epics for the themes
  const { data: epics = [], isLoading: loadingEpics, refetch: refetchEpics } = useQuery({
    queryKey: ['strategic-backlog-epics', snapshotId, themeIds, debouncedSearch],
    queryFn: async () => {
      if (themeIds.length === 0) return [];
      let query = supabase
        .from('epics')
        .select('*')
        .in('theme_id', themeIds);
      
      if (debouncedSearch && activeSection === 'epics') {
        query = query.or(`name.ilike.%${debouncedSearch}%,epic_key.ilike.%${debouncedSearch}%`);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!snapshotId && themeIds.length > 0,
  });

  // Live counts for tab badges
  const { counts, refetch: refetchCounts } = useStrategicBacklogCounts(snapshotId, themeIds);

  // Related counts
  const { data: objectiveCounts = {} } = useThemeObjCounts(themeIds);
  const { data: krCounts = {} } = useObjectiveKrCounts(objectives.map(o => o.id));
  const { data: featureCounts = {} } = useEpicFeatureCounts(epics.map(e => e.id));

  // Coverage calculations
  const themesWithObjectives = useMemo(() => {
    return Object.keys(objectiveCounts).filter(id => objectiveCounts[id] > 0).length;
  }, [objectiveCounts]);

  // Realtime subscriptions
  const handleRealtimeUpdate = useCallback(() => {
    refetchThemes();
    refetchObjectives();
    refetchEpics();
    refetchCounts();
  }, [refetchThemes, refetchObjectives, refetchEpics, refetchCounts]);

  useStrategicBacklogRealtime(snapshotId, themeIds, handleRealtimeUpdate);

  const handleSelectItem = (item: any, type: 'theme' | 'objective' | 'epic') => {
    setSelectedItem(item);
    setSelectedItemType(type);
  };

  const handleCloseDrawer = () => {
    setSelectedItem(null);
    setSelectedItemType(null);
  };

  // Header actions
  const headerActions = (
    <div className="flex items-center gap-3">
      {/* Snapshot Selector */}
      <Select value={snapshotId} onValueChange={setSelectedSnapshotId}>
        <SelectTrigger className="w-[200px] h-9 bg-surface border-border text-sm">
          <SelectValue placeholder="Select snapshot" />
        </SelectTrigger>
        <SelectContent className="z-[400]">
          {snapshots.map((snap) => (
            <SelectItem key={snap.id} value={snap.id}>
              {snap.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Badge */}
      {currentSnapshot && !isArchived && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-[rgba(92,124,92,0.1)] dark:bg-[rgba(92,124,92,0.15)] text-[#5C7C5C] dark:text-[#7DA37D] border border-[rgba(92,124,92,0.3)]">
          <Check className="h-3 w-3" />
          ACTIVE
        </span>
      )}

      {/* Create Split Button */}
      {!isArchived && snapshotId && (
        <Button 
          size="sm" 
          onClick={() => setCreateModalOpen(true)}
          className="bg-brand-gold hover:bg-brand-gold-hover text-white gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Create
          <ChevronDown className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  return (
    <PageChrome rightActions={headerActions}>
      {!snapshotId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-muted-foreground">Select a snapshot to view strategic backlog</div>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col min-h-0 overflow-hidden">
          {/* Tabs */}
          <div className="shrink-0 px-6 py-4">
            <StrategicBacklogTabs
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
              counts={counts}
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Main Content with Padding */}
            <div className="flex-1 flex gap-6 px-6 pb-6 overflow-hidden min-h-0">
              {/* Left: Coverage Panel */}
              <div className="w-72 shrink-0">
                <StrategicBacklogCoveragePanel
                  themes={counts.themes}
                  themesWithObjectives={themesWithObjectives}
                  objectives={counts.objectives}
                  epics={counts.epics}
                  onNavigate={handleSectionChange}
                />
              </div>

              {/* Right: Table Content */}
              <div className="flex-1 overflow-auto min-h-0">
                {activeSection === 'themes' && (
                  <StrategicBacklogThemesSection
                    themes={themes}
                    snapshotId={snapshotId}
                    isArchived={isArchived}
                    onSelectItem={(item) => handleSelectItem(item, 'theme')}
                    selectedItemId={selectedItemType === 'theme' ? selectedItem?.id : undefined}
                    searchQuery={activeSection === 'themes' ? searchQuery : ''}
                    onSearchChange={setSearchQuery}
                    objectiveCounts={objectiveCounts}
                  />
                )}
                {activeSection === 'objectives' && (
                  <StrategicBacklogObjectivesSection
                    objectives={objectives}
                    themes={themes}
                    isLoading={loadingObjectives}
                    isArchived={isArchived}
                    onSelectItem={(item) => handleSelectItem(item, 'objective')}
                    selectedItemId={selectedItemType === 'objective' ? selectedItem?.id : undefined}
                    searchQuery={activeSection === 'objectives' ? searchQuery : ''}
                    onSearchChange={setSearchQuery}
                    krCounts={krCounts}
                  />
                )}
                {activeSection === 'epics' && (
                  <StrategicBacklogEpicsSection
                    epics={epics}
                    themes={themes}
                    isLoading={loadingEpics}
                    isArchived={isArchived}
                    onSelectItem={(item) => handleSelectItem(item, 'epic')}
                    selectedItemId={selectedItemType === 'epic' ? selectedItem?.id : undefined}
                    searchQuery={activeSection === 'epics' ? searchQuery : ''}
                    onSearchChange={setSearchQuery}
                    featureCounts={featureCounts}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Theme Details Drawer */}
          {selectedItem && selectedItemType === 'theme' && (
            <ThemeDetailsDrawer
              key={`theme-drawer-${selectedItem.id}`}
              theme={selectedItem}
              isOpen={true}
              onClose={handleCloseDrawer}
            />
          )}

          {/* Epic Details Panel */}
          {selectedItem && selectedItemType === 'epic' && (
            <EpicDetailsPanel
              epic={selectedItem}
              open={true}
              onClose={handleCloseDrawer}
            />
          )}

          {/* Objective Drawer V2 */}
          <ObjectiveDrawerV2
            objectiveId={selectedItemType === 'objective' ? selectedItem?.id : null}
            open={selectedItemType === 'objective' && !!selectedItem}
            onClose={handleCloseDrawer}
          />
        </div>
      )}

      {/* Add to Backlog Modal */}
      <AddToBacklogModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        snapshotId={snapshotId}
      />
    </PageChrome>
  );
}
