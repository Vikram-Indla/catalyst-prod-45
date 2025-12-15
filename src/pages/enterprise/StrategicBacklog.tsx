/**
 * Strategic Backlog - CLAUDE NUCLEAR OVERWRITE
 * Enterprise Strategy Command Center
 * Matches: strategic-backlog-dark-2.html & strategic-backlog-light-2.html EXACTLY
 */
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageChrome } from '@/components/layout/PageChrome';
import { StrategicBacklogContent } from '@/components/strategic-backlog/StrategicBacklogContent';
import { CreateStrategicItemModal } from '@/components/strategic-backlog/CreateStrategicItemModal';
import { StrategicBacklogDrawer } from '@/components/strategic-backlog/StrategicBacklogDrawer';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, Check, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock seed data matching Claude HTML exactly
const SEED_THEMES = [
  { id: 't1', name: 'Digital Maturity 2026', status: 'draft', objectives: 0, epics: 0, coverage: 0, owner: { name: 'Ahmed Al-Rashid', avatar: 'AR' }, updatedAt: '2025-12-15T10:30:00Z' },
  { id: 't2', name: 'Customer Experience Excellence', status: 'active', objectives: 3, epics: 12, coverage: 85, owner: { name: 'Sarah Chen', avatar: 'SC' }, updatedAt: '2025-12-10T14:20:00Z' },
  { id: 't3', name: 'Operational Excellence', status: 'draft', objectives: 2, epics: 9, coverage: 67, owner: { name: 'Mohammed Hassan', avatar: 'MH' }, updatedAt: '2025-12-08T08:45:00Z' },
  { id: 't4', name: 'Data & Analytics Platform', status: 'active', objectives: 3, epics: 8, coverage: 100, owner: { name: 'Fatima Al-Saud', avatar: 'FA' }, updatedAt: '2025-12-12T16:00:00Z' },
];

const SEED_OBJECTIVES = [
  { id: 'o1', name: 'Modernize Core Banking Systems', theme: 'Customer Experience Excellence', themeId: 't2', status: 'active', keyResults: 4, epics: 6, progress: 72, owner: { name: 'Ahmed Al-Rashid', avatar: 'AR' }, updatedAt: '2025-12-14T09:00:00Z' },
  { id: 'o2', name: 'Cloud Migration Program', theme: 'Customer Experience Excellence', themeId: 't2', status: 'active', keyResults: 3, epics: 5, progress: 45, owner: { name: 'Khalid Omar', avatar: 'KO' }, updatedAt: '2025-12-13T11:30:00Z' },
  { id: 'o3', name: 'API-First Architecture', theme: 'Operational Excellence', themeId: 't3', status: 'draft', keyResults: 2, epics: 4, progress: 20, owner: { name: 'Layla Ahmed', avatar: 'LA' }, updatedAt: '2025-12-11T15:00:00Z' },
  { id: 'o4', name: 'Enterprise Data Platform', theme: 'Data & Analytics Platform', themeId: 't4', status: 'active', keyResults: 5, epics: 3, progress: 88, owner: { name: 'Fatima Al-Saud', avatar: 'FA' }, updatedAt: '2025-12-12T10:00:00Z' },
  { id: 'o5', name: 'Omnichannel Customer Journey', theme: 'Customer Experience Excellence', themeId: 't2', status: 'active', keyResults: 4, epics: 5, progress: 60, owner: { name: 'Sarah Chen', avatar: 'SC' }, updatedAt: '2025-12-10T09:00:00Z' },
];

const SEED_EPICS = [
  { id: 'e1', name: 'Core Banking API Gateway', objective: 'Modernize Core Banking Systems', theme: 'Customer Experience Excellence', status: 'active', features: 8, stories: 32, owner: { name: 'Dev Team Alpha', avatar: 'DA' }, priority: 'High', updatedAt: '2025-12-14T08:00:00Z' },
  { id: 'e2', name: 'Payment Processing Engine', objective: 'Modernize Core Banking Systems', theme: 'Customer Experience Excellence', status: 'active', features: 6, stories: 24, owner: { name: 'Dev Team Beta', avatar: 'DB' }, priority: 'High', updatedAt: '2025-12-13T10:00:00Z' },
  { id: 'e3', name: 'AWS Infrastructure Setup', objective: 'Cloud Migration Program', theme: 'Customer Experience Excellence', status: 'active', features: 4, stories: 18, owner: { name: 'Cloud Team', avatar: 'CT' }, priority: 'High', updatedAt: '2025-12-12T14:00:00Z' },
  { id: 'e4', name: 'Data Lake Implementation', objective: 'Enterprise Data Platform', theme: 'Data & Analytics Platform', status: 'active', features: 5, stories: 22, owner: { name: 'Data Team', avatar: 'DT' }, priority: 'High', updatedAt: '2025-12-11T09:00:00Z' },
];

export type ViewType = 'themes' | 'objectives' | 'epics';
export type CreateType = 'theme' | 'objective' | 'epic' | null;

export interface StrategicItem {
  id: string;
  name: string;
  status: string;
  owner?: { name: string; avatar: string };
  updatedAt: string;
  [key: string]: any;
}

export default function StrategicBacklog() {
  // State
  const [currentView, setCurrentView] = useState<ViewType>('themes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<StrategicItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');

  // Fetch snapshots from DB
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
  useEffect(() => {
    if (snapshots.length > 0 && !selectedSnapshotId) {
      setSelectedSnapshotId(snapshots[0].id);
    }
  }, [snapshots, selectedSnapshotId]);

  const currentSnapshot = snapshots.find(s => s.id === selectedSnapshotId) || snapshots[0];
  const isArchived = currentSnapshot?.status === 'ARCHIVED';

  // Use seed data for now (matches Claude HTML exactly)
  const themes = SEED_THEMES;
  const objectives = SEED_OBJECTIVES;
  const epics = SEED_EPICS;

  // Stats calculation
  const stats = useMemo(() => {
    const themesWithObjectives = themes.filter(t => t.objectives > 0).length;
    return {
      themes: themes.length,
      themesWithObjectives,
      themesWithObjectivesPercent: themes.length > 0 ? Math.round((themesWithObjectives / themes.length) * 100) : 0,
      objectives: objectives.length,
      epics: epics.length,
    };
  }, [themes, objectives, epics]);

  // Filtered data based on current view and search
  const filteredData = useMemo(() => {
    let data: StrategicItem[];
    switch (currentView) {
      case 'themes': data = themes; break;
      case 'objectives': data = objectives; break;
      case 'epics': data = epics; break;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(item => item.name.toLowerCase().includes(q));
    }
    return data;
  }, [currentView, searchQuery, themes, objectives, epics]);

  // Handlers
  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    setSelectedItem(null);
    setDrawerOpen(false);
  };

  const handleSelectItem = (item: StrategicItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedItem(null);
  };

  // Header actions - Snapshot selector + Create button
  const headerActions = (
    <div className="flex items-center gap-3">
      {/* Snapshot Selector */}
      <Select value={selectedSnapshotId} onValueChange={setSelectedSnapshotId}>
        <SelectTrigger className="h-9 px-3 bg-catalyst-surface-hover border-catalyst-border rounded-lg text-sm">
          <SelectValue placeholder="Select snapshot">
            <span className="text-catalyst-text">{currentSnapshot?.name || 'Digital Strategy 2026'}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-[400] bg-catalyst-surface border-catalyst-border">
          {snapshots.length > 0 ? snapshots.map((snap) => (
            <SelectItem key={snap.id} value={snap.id} className="text-catalyst-text hover:bg-catalyst-surface-hover">
              <div className="flex items-center gap-2">
                {snap.status === 'ARCHIVED' && <Archive className="h-3 w-3 text-catalyst-text-muted" />}
                {snap.name}
              </div>
            </SelectItem>
          )) : (
            <SelectItem value="default" className="text-catalyst-text">Digital Strategy 2026</SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* Active Badge */}
      <span className={cn(
        "hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border",
        isArchived
          ? "bg-catalyst-surface-hover text-catalyst-text-muted border-catalyst-border"
          : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
      )}>
        {isArchived ? (
          <><Archive className="h-3 w-3" /> archived</>
        ) : (
          <><Check className="h-3 w-3" /> active</>
        )}
      </span>

      {/* Create Button */}
      {!isArchived && (
        <Button 
          onClick={() => setCreateModalOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-catalyst-gold hover:bg-catalyst-gold-hover text-white rounded-lg text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Create
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );

  return (
    <PageChrome rightActions={headerActions}>
      {/* Main Page Body */}
      <div className="flex-1 flex flex-col min-h-0 bg-catalyst-bg">
        <StrategicBacklogContent
          currentView={currentView}
          onViewChange={handleViewChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          stats={stats}
          filteredData={filteredData}
          selectedItem={selectedItem}
          onSelectItem={handleSelectItem}
        />
      </div>

      {/* Detail Drawer */}
      <StrategicBacklogDrawer
        open={drawerOpen}
        item={selectedItem}
        currentView={currentView}
        onClose={handleCloseDrawer}
      />

      {/* Create Modal */}
      <CreateStrategicItemModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        snapshotName={currentSnapshot?.name || 'Digital Strategy 2026'}
      />
    </PageChrome>
  );
}
