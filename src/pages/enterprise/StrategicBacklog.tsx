/**
 * Strategic Backlog - Enterprise Strategy Command Center
 * Pixel-perfect implementation matching Catalyst design specs
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
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
import { ObjectiveAnalyticsDrawer } from '@/modules/okr-v2/components/ObjectiveAnalyticsDrawer';
import { useStrategicThemes, useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';
import { cn } from '@/lib/utils';

type SubSection = 'themes' | 'objectives' | 'epics';

export default function StrategicBacklog() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [activeSection, setActiveSection] = useState<SubSection>('themes');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'theme' | 'objective' | 'epic' | null>(null);

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

  // Fetch objectives count
  const { data: objectivesData = { count: 0, list: [] } } = useQuery({
    queryKey: ['objectives-for-backlog', snapshotId, themeIds],
    queryFn: async () => {
      if (themeIds.length === 0) return { count: 0, list: [] };
      
      const { data: objectives, error } = await supabase
        .from('objectives')
        .select('*')
        .in('theme_id', themeIds);
      
      if (error) return { count: 0, list: [] };
      return { count: objectives?.length || 0, list: objectives || [] };
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
      return new Set((objectives || []).map(o => o.theme_id)).size;
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
      return { total: aligned || 0, aligned: aligned || 0 };
    },
    enabled: !!snapshotId && themeIds.length > 0,
  });

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
              onSectionChange={setActiveSection}
              counts={{
                themes: themes.length,
                objectives: objectivesData.count,
                epics: epicsData.aligned,
              }}
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Main Content with Padding */}
            <div className="flex-1 flex gap-6 px-6 pb-6 overflow-hidden min-h-0">
              {/* Left: Coverage Panel */}
              <div className="w-72 shrink-0">
                <StrategicBacklogCoveragePanel
                  themes={themes.length}
                  themesWithObjectives={themesWithObjectives}
                  objectives={objectivesData.count}
                  epics={epicsData.aligned}
                  onNavigate={setActiveSection}
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
                  />
                )}
                {activeSection === 'objectives' && (
                  <StrategicBacklogObjectivesSection
                    snapshotId={snapshotId}
                    themes={themes}
                    isArchived={isArchived}
                    onSelectItem={(item) => handleSelectItem(item, 'objective')}
                    selectedItemId={selectedItemType === 'objective' ? selectedItem?.id : undefined}
                  />
                )}
                {activeSection === 'epics' && (
                  <StrategicBacklogEpicsSection
                    snapshotId={snapshotId}
                    themes={themes}
                    links={links || null}
                    isArchived={isArchived}
                    onSelectItem={(item) => handleSelectItem(item, 'epic')}
                    selectedItemId={selectedItemType === 'epic' ? selectedItem?.id : undefined}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Theme Details Drawer */}
          {selectedItem && selectedItemType === 'theme' && (
            <ThemeDetailsDrawer
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

          {/* Objective Analytics Drawer */}
          <ObjectiveAnalyticsDrawer
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
