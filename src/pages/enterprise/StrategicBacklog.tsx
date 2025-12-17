/**
 * Strategic Backlog - Enterprise Strategy Command Center
 * Pixel-perfect implementation matching Catalyst design specs
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown } from 'lucide-react';
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
import { 
  useThemeObjectiveCounts as useThemeObjCounts,
  useObjectiveKrCounts,
  useEpicFeatureCounts,
} from '@/hooks/useStrategicBacklogList';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import type { StrategicTheme } from '@/types/strategicBacklog';

type SubSection = 'themes' | 'objectives' | 'epics';

export default function StrategicBacklog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as SubSection | null;
  
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

  // Fetch all themes (no snapshot filtering)
  const { data: themesRaw = [], refetch: refetchThemes } = useQuery({
    queryKey: ['strategic-backlog-all-themes', debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('strategic_themes')
        .select('*');
      
      if (debouncedSearch && activeSection === 'themes') {
        query = query.or(`name.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Map theme status to expected type
  const themes: StrategicTheme[] = useMemo(() => {
    return themesRaw.map(t => ({
      ...t,
      status: t.status === 'cancelled' ? 'archived' : 
              t.status === 'done' ? 'archived' : 
              t.status === 'proposed' ? 'draft' : 
              t.status as 'active' | 'archived' | 'draft'
    }));
  }, [themesRaw]);

  const themeIds = useMemo(() => themes.map(t => t.id), [themes]);

  // Fetch all objectives
  const { data: objectives = [], isLoading: loadingObjectives, refetch: refetchObjectives } = useQuery({
    queryKey: ['strategic-backlog-all-objectives', themeIds, debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('objectives')
        .select('*');
      
      if (themeIds.length > 0) {
        query = query.in('theme_id', themeIds);
      }
      
      if (debouncedSearch && activeSection === 'objectives') {
        query = query.or(`name.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: themeIds.length > 0,
  });

  // Fetch all epics
  const { data: epics = [], isLoading: loadingEpics, refetch: refetchEpics } = useQuery({
    queryKey: ['strategic-backlog-all-epics', themeIds, debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select('*');
      
      if (themeIds.length > 0) {
        query = query.in('theme_id', themeIds);
      }
      
      if (debouncedSearch && activeSection === 'epics') {
        query = query.or(`name.ilike.%${debouncedSearch}%,epic_key.ilike.%${debouncedSearch}%`);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: themeIds.length > 0,
  });

  // Counts for tab badges
  const counts = useMemo(() => ({
    themes: themes.length,
    objectives: objectives.length,
    epics: epics.length,
  }), [themes.length, objectives.length, epics.length]);

  // Related counts
  const { data: objectiveCounts = {} } = useThemeObjCounts(themeIds);
  const { data: krCounts = {} } = useObjectiveKrCounts(objectives.map(o => o.id));
  const { data: featureCounts = {} } = useEpicFeatureCounts(epics.map(e => e.id));

  // Coverage calculations
  const themesWithObjectives = useMemo(() => {
    return Object.keys(objectiveCounts).filter(id => objectiveCounts[id] > 0).length;
  }, [objectiveCounts]);

  const handleSelectItem = (item: any, type: 'theme' | 'objective' | 'epic') => {
    setSelectedItem(item);
    setSelectedItemType(type);
  };

  const handleCloseDrawer = () => {
    setSelectedItem(null);
    setSelectedItemType(null);
  };

  // Header actions - just the Create button
  const headerActions = (
    <div className="flex items-center gap-3">
      <Button 
        size="sm" 
        onClick={() => setCreateModalOpen(true)}
        className="bg-brand-primary hover:bg-brand-primary-hover text-white gap-1.5"
      >
        <Plus className="h-4 w-4" />
        Create
        <ChevronDown className="h-3 w-3" />
      </Button>
    </div>
  );

  return (
    <PageChrome rightActions={headerActions}>
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
                  snapshotId=""
                  isArchived={false}
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
                  isArchived={false}
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
                  isArchived={false}
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

      {/* Add to Backlog Modal */}
      <AddToBacklogModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        snapshotId=""
      />
    </PageChrome>
  );
}
