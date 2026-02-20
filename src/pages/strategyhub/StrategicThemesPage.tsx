/**
 * StrategicThemesPage — Full Strategic Themes module
 * Header: CommandCenterHeader with breadcrumb prefix, no subtitle
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageChrome } from '@/components/layout/PageChrome';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { useThemes, useCreateTheme, useUpdateTheme, useDeleteTheme } from '@/hooks/use-strategic-themes';
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
  const navigate = useNavigate();
  const { data: themes = [], isLoading, refetch, isFetching } = useThemes();
  const createTheme = useCreateTheme();
  const updateTheme = useUpdateTheme();
  const deleteTheme = useDeleteTheme();

  const [view, setView] = useState<ThemeView>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [bscFilter, setBscFilter] = useState('');
  const [fyFilter, setFyFilter] = useState('');

  const [selectedTheme, setSelectedTheme] = useState<StrategicTheme | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<StrategicTheme | null>(null);

  const filtered = useMemo(() => {
    return themes.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (ownerFilter && t.owner_name !== ownerFilter) return false;
      if (bscFilter) {
        if (bscFilter === '__none__') {
          if (t.bsc_perspective) return false;
        } else if (t.bsc_perspective !== bscFilter) {
          return false;
        }
      }
      if (fyFilter && String(t.fiscal_year) !== fyFilter) return false;
      return true;
    });
  }, [themes, search, statusFilter, ownerFilter, bscFilter, fyFilter]);

  const handleSelect = useCallback((theme: StrategicTheme) => {
    setSelectedTheme(theme);
    setDrawerOpen(true);
  }, []);

  const handleCreate = useCallback((data: Partial<StrategicTheme>) => {
    createTheme.mutate(data as any);
  }, [createTheme]);

  const handleEdit = useCallback((theme: StrategicTheme) => {
    setEditingTheme(theme);
    setDrawerOpen(false);
    setModalOpen(true);
  }, []);

  const handleUpdate = useCallback((data: Partial<StrategicTheme>) => {
    if (!editingTheme) return;
    updateTheme.mutate({ id: editingTheme.id, updates: data as any });
    setEditingTheme(null);
  }, [editingTheme, updateTheme]);

  const handleDelete = useCallback((theme: StrategicTheme) => {
    deleteTheme.mutate(theme.id);
    setDrawerOpen(false);
    setSelectedTheme(null);
  }, [deleteTheme]);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingTheme(null);
  }, []);

  if (isLoading) {
    return (
      <PageChrome hideHeader>
        <CommandCenterHeader title="Strategic Themes" />
        <div className="p-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg animate-pulse" style={{ height: 48, background: 'hsl(var(--muted))' }} />
          ))}
        </div>
      </PageChrome>
    );
  }

  const currentSelected = selectedTheme ? themes.find(t => t.id === selectedTheme.id) || selectedTheme : null;

  // Alignment view is full-screen — render ONLY the alignment component
  if (view === 'alignment') {
    return <ThemeAlignmentView onBack={() => setView('list')} />;
  }

  return (
    <PageChrome hideHeader>
      <div style={{ padding: '16px 24px 0' }}>
        <nav style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/strategyhub')}>StrategyHub</span>
          <span style={{ margin: '0 4px', color: '#94A3B8' }}>›</span>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>Strategic Themes</span>
        </nav>
        <div className="flex items-center justify-between" style={{ marginBottom: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Strategic Themes</h1>
        </div>
      </div>

      <div style={{ padding: '16px 24px 24px' }}>
        <ThemeStatsStrip themes={themes} />

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
          onNewTheme={() => { setEditingTheme(null); setModalOpen(true); }}
        />

        {view === 'list' && <ThemeListView themes={filtered} onSelect={handleSelect} />}
        {view === 'board' && <ThemeBoardView themes={filtered} onSelect={handleSelect} />}
        {view === 'timeline' && <ThemeTimelineView themes={filtered} onSelect={handleSelect} />}
      </div>

      <ThemeDetailDrawer
        theme={currentSelected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ThemeCreateModal
        open={modalOpen}
        onClose={handleModalClose}
        onSubmit={editingTheme ? handleUpdate : handleCreate}
        initialData={editingTheme || undefined}
      />
    </PageChrome>
  );
}
