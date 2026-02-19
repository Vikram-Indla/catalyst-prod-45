/**
 * StrategicThemesPage — Full Strategic Themes module
 * Stage C: Stats, toolbar, 4 views, drawer, modal — all wired to live data
 */

import { useState, useMemo, useCallback } from 'react';
import { PageChrome } from '@/components/layout/PageChrome';
import { useThemes, useCreateTheme } from '@/hooks/use-strategic-themes';
import type { StrategicTheme, ThemeView } from '@/types/strategic-themes';

import { ThemeStatsStrip } from '@/components/strategy/themes/ThemeStatsStrip';
import { ThemeToolbar } from '@/components/strategy/themes/ThemeToolbar';
import { ThemeListView } from '@/components/strategy/themes/ThemeListView';
import { ThemeBoardView } from '@/components/strategy/themes/ThemeBoardView';
import { ThemeTimelineView } from '@/components/strategy/themes/ThemeTimelineView';
import { ThemeAlignmentView } from '@/components/strategy/themes/ThemeAlignmentView';
import { ThemeDetailDrawer } from '@/components/strategy/themes/ThemeDetailDrawer';
import { ThemeCreateModal } from '@/components/strategy/themes/ThemeCreateModal';

export default function StrategicThemesPage() {
  const { data: themes = [], isLoading } = useThemes();
  const createTheme = useCreateTheme();

  // View state
  const [view, setView] = useState<ThemeView>('list');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [bscFilter, setBscFilter] = useState('');
  const [fyFilter, setFyFilter] = useState('');

  // Drawer / Modal
  const [selectedTheme, setSelectedTheme] = useState<StrategicTheme | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Filtered themes
  const filtered = useMemo(() => {
    return themes.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (ownerFilter && t.owner_name !== ownerFilter) return false;
      if (bscFilter && t.bsc_perspective !== bscFilter) return false;
      if (fyFilter && String(t.fiscal_year) !== fyFilter) return false;
      return true;
    });
  }, [themes, search, statusFilter, ownerFilter, bscFilter, fyFilter]);

  const handleSelect = useCallback((theme: StrategicTheme) => {
    setSelectedTheme(theme);
    setDrawerOpen(true);
  }, []);

  const handleCreate = useCallback((data: Partial<StrategicTheme>) => {
    createTheme.mutate({
      ...data,
      vision_id: 'b0000001-0000-0000-0000-000000000001', // required FK
    } as any);
  }, [createTheme]);

  if (isLoading) {
    return (
      <PageChrome sectionOverride="StrategyHub" titleOverride="Strategic Themes">
        <div className="p-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg animate-pulse" style={{ height: 48, background: '#F1F5F9' }} />
          ))}
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome sectionOverride="StrategyHub" titleOverride="Strategic Themes">
      <div style={{ padding: '16px 24px 24px' }}>
        {/* Stats Strip */}
        <ThemeStatsStrip themes={themes} />

        {/* Toolbar */}
        <ThemeToolbar
          themes={themes}
          view={view}
          onViewChange={setView}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          ownerFilter={ownerFilter}
          onOwnerFilterChange={setOwnerFilter}
          bscFilter={bscFilter}
          onBscFilterChange={setBscFilter}
          fyFilter={fyFilter}
          onFyFilterChange={setFyFilter}
          onNewTheme={() => setModalOpen(true)}
        />

        {/* Views */}
        {view === 'list' && <ThemeListView themes={filtered} onSelect={handleSelect} />}
        {view === 'board' && <ThemeBoardView themes={filtered} onSelect={handleSelect} />}
        {view === 'timeline' && <ThemeTimelineView themes={filtered} onSelect={handleSelect} />}
        {view === 'alignment' && <ThemeAlignmentView />}
      </div>

      {/* Drawer */}
      <ThemeDetailDrawer
        theme={selectedTheme}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Modal */}
      <ThemeCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </PageChrome>
  );
}
