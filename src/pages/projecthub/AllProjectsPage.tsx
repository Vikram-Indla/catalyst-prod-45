import { useState, useMemo } from 'react';
import { Plus, Download, ChevronLeft, ChevronRight as ChevronRightIcon, FolderKanban, RefreshCw } from 'lucide-react';
import type { ViewMode, ProjectFilters, SortColumn, SortDirection } from '@/types/projecthub';
import { DEFAULT_FILTERS } from '@/types/projecthub';
import {
  useProjects,
  useProjectFavorites,
  useToggleFavorite,
  useProjectsRealtime,
  filterAndSortProjects,
  computePortfolioStats,
} from '@/hooks/useProjectHub';
import { useMemberProfiles } from '@/components/projecthub/MemberStack';

import { AllProjectsToolbar } from '@/components/projecthub/AllProjectsToolbar';
import { ProjectAdvancedFilters } from '@/components/projecthub/ProjectAdvancedFilters';
import { AllProjectsTable } from '@/components/projecthub/AllProjectsTable';
import { AllProjectsCardGrid } from '@/components/projecthub/AllProjectsCardGrid';
import { ProjectDetailPanel } from '@/components/projecthub/ProjectDetailPanel';
import { CreateProjectDialog } from '@/components/projecthub/CreateProjectDialog';
import { ExportDialog } from '@/components/projecthub/ExportDialog';
import { JiraSyncDialog } from '@/components/projecthub/JiraSyncDialog';
import { toast } from 'sonner';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';

export default function AllProjectsPage() {
  const [view, setView] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS);
  const [sortCol, setSortCol] = useState<SortColumn>('total_tasks');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showJiraSync, setShowJiraSync] = useState(false);

  const { data: projects = [], isLoading, error } = useProjects();
  const { data: favorites = new Set<string>() } = useProjectFavorites();
  const toggleFav = useToggleFavorite();
  useProjectsRealtime();

  const allMemberIds = useMemo(() => projects.flatMap(p => p.member_ids ?? []), [projects]);
  useMemberProfiles(allMemberIds);

  const filtered = useMemo(() => filterAndSortProjects(projects, filters, sortCol, sortDir, favorites), [projects, filters, sortCol, sortDir, favorites]);
  const stats = useMemo(() => computePortfolioStats(projects, favorites), [projects, favorites]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);

  const departments = useMemo(() => [...new Set(projects.map(p => p.department).filter(Boolean) as string[])].sort(), [projects]);

  const selectedProjectData = useMemo(() => projects.find(p => p.id === selectedProject) ?? null, [projects, selectedProject]);

  const handleSort = (col: SortColumn) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleToggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (pageData.every(p => selectedRows.has(p.id))) setSelectedRows(new Set());
    else setSelectedRows(new Set(pageData.map(p => p.id)));
  };

  if (error) {
    toast.error('Failed to load projects');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Inter', -apple-system, system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}>
      {/* Catalyst Header */}
      <CommandCenterHeader
        title="All Projects"
        subtitle="Track and manage all projects across your portfolio"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowJiraSync(true)}
              className="flex items-center gap-1.5 rounded-md"
              style={{
                height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500,
                color: '#2563EB',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 'var(--catalyst-radius-md, 6px)',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} /> Jira Sync
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 rounded-md"
              style={{
                height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500,
                color: 'var(--catalyst-text-secondary, #334155)',
                background: 'var(--catalyst-bg-surface-0, #FFF)',
                border: '1px solid var(--catalyst-border-default, #E2E8F0)',
                borderRadius: 'var(--catalyst-radius-md, 6px)',
                cursor: 'pointer',
              }}
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-md"
              style={{
                height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600,
                color: 'var(--catalyst-text-on-primary, #FFF)',
                background: 'var(--catalyst-primary, #2563EB)',
                border: 'none',
                borderRadius: 'var(--catalyst-radius-md, 6px)',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} strokeWidth={2.5} /> New Project
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-6 py-3 bg-background text-foreground">

      {/* Toolbar */}
      <div style={{ marginBottom: 10, flexShrink: 0 }}>
        <AllProjectsToolbar
          view={view}
          onViewChange={v => { setView(v); setPage(0); }}
          filters={filters}
          onFilterChange={f => { setFilters(f); setPage(0); }}
          stats={stats}
        />
      </div>


      {/* Content */}
      {isLoading ? (
        <div className="flex-1 rounded-lg border border-border bg-card p-10 dark:bg-background dark:shadow-none">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="h-7 w-7 rounded bg-muted" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="h-3 w-[30%] rounded bg-muted" />
                  <div className="h-2.5 w-[20%] rounded bg-muted/70" />
                </div>
                <div className="h-3 w-[60px] rounded bg-muted/70" />
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border bg-card px-10 py-20 text-center dark:bg-background dark:shadow-none">
          <FolderKanban size={48} className="text-muted-foreground/50" strokeWidth={1.25} />
          <h3 className="mt-4 font-['Sora',sans-serif] text-lg font-semibold text-foreground">
            {filters.search || filters.statusChip !== 'All' ? 'No projects match your filters' : 'No projects yet'}
          </h3>
          <p className="mt-1 max-w-[360px] text-[13px] text-muted-foreground">
            {filters.search || filters.statusChip !== 'All' ? 'Try adjusting your search or filter criteria.' : 'Create your first project to get started.'}
          </p>
          {filters.search === '' && filters.statusChip === 'All' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
            >
              <Plus size={16} /> New Project
            </button>
          )}
        </div>
      ) : view === 'list' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:bg-background dark:shadow-none">
          <div style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'auto' }}>
            <AllProjectsTable
              projects={pageData}
              favoriteIds={favorites}
              onToggleFav={(id, fav) => toggleFav.mutate({ projectId: id, isFavorited: fav })}
              onSelectProject={id => setSelectedProject(id)}
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={handleSort}
              selectedRows={selectedRows}
              onToggleRow={handleToggleRow}
              onToggleAll={handleToggleAll}
            />
          </div>
          {/* Footer */}
          <div className="flex shrink-0 items-center justify-center border-t border-border bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground dark:bg-background">
            <span>Showing {filtered.length} projects</span>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <AllProjectsCardGrid
            projects={filtered}
            favoriteIds={favorites}
            onToggleFav={(id, fav) => toggleFav.mutate({ projectId: id, isFavorited: fav })}
            onSelectProject={id => setSelectedProject(id)}
          />
        </div>
      )}

      {/* Detail Panel */}
      <ProjectDetailPanel
        project={selectedProjectData}
        open={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        isFav={selectedProject ? favorites.has(selectedProject) : false}
        onToggleFav={() => { if (selectedProject) toggleFav.mutate({ projectId: selectedProject, isFavorited: favorites.has(selectedProject) }); }}
      />

      {/* Modals */}
      <CreateProjectDialog open={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <ExportDialog open={showExportModal} onClose={() => setShowExportModal(false)} projects={filtered} />
      <JiraSyncDialog open={showJiraSync} onClose={() => setShowJiraSync(false)} />
      </div>
    </div>
  );
}
