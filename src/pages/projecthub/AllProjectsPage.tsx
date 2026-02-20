import { useState, useMemo } from 'react';
import { ChevronRight, Plus, Download, ChevronLeft, ChevronRight as ChevronRightIcon, FolderKanban } from 'lucide-react';
import type { ViewMode, ProjectFilters, SortColumn, SortDirection, ProjectListItem } from '@/types/projecthub';
import { DEFAULT_FILTERS } from '@/types/projecthub';
import {
  useProjects,
  useProjectFavorites,
  useToggleFavorite,
  useProjectsRealtime,
  filterAndSortProjects,
  computePortfolioStats,
} from '@/hooks/useProjectHub';
import { ProjectStatsStrip } from '@/components/projecthub/ProjectStatsStrip';
import { AllProjectsToolbar } from '@/components/projecthub/AllProjectsToolbar';
import { ProjectAdvancedFilters } from '@/components/projecthub/ProjectAdvancedFilters';
import { AllProjectsTable } from '@/components/projecthub/AllProjectsTable';
import { AllProjectsCardGrid } from '@/components/projecthub/AllProjectsCardGrid';
import { ProjectDetailPanel } from '@/components/projecthub/ProjectDetailPanel';
import { CreateProjectDialog } from '@/components/projecthub/CreateProjectDialog';
import { ExportDialog } from '@/components/projecthub/ExportDialog';
import { toast } from 'sonner';

export default function AllProjectsPage() {
  const [view, setView] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS);
  const [sortCol, setSortCol] = useState<SortColumn>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(12);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const { data: projects = [], isLoading, error } = useProjects();
  const { data: favorites = new Set<string>() } = useProjectFavorites();
  const toggleFav = useToggleFavorite();
  useProjectsRealtime();

  const filtered = useMemo(() => filterAndSortProjects(projects, filters, sortCol, sortDir), [projects, filters, sortCol, sortDir]);
  const stats = useMemo(() => computePortfolioStats(projects), [projects]);
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
    <div style={{ padding: '24px 28px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 mb-1">
          <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>ProjectHub</span>
          <ChevronRight size={13} color="#CBD5E1" />
          <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>All Projects</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#0F172A', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.3px' }}>All Projects</h1>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Portfolio-wide project tracking · Ministry of Industry</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 rounded-md transition-colors hover:bg-slate-50"
              style={{ height: 34, padding: '0 14px', background: '#FFF', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 500, color: '#475569', cursor: 'pointer' }}
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-md transition-opacity hover:opacity-90"
              style={{ height: 34, padding: '0 14px', background: '#2563EB', border: 'none', fontSize: 13, fontWeight: 600, color: '#FFF', cursor: 'pointer', borderRadius: 6 }}
            >
              <Plus size={16} strokeWidth={2.5} /> New Project
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-5 mt-4">
          <ProjectStatsStrip stats={stats} />
        </div>

        {/* Toolbar */}
        <div className="mb-3">
          <AllProjectsToolbar
            view={view}
            onViewChange={v => { setView(v); setPage(0); }}
            filters={filters}
            onFilterChange={f => { setFilters(f); setPage(0); }}
            onToggleAdvanced={() => setShowAdvFilters(v => !v)}
            showAdvanced={showAdvFilters}
            stats={stats}
          />
        </div>

        {/* Advanced Filters */}
        {showAdvFilters && (
          <ProjectAdvancedFilters
            filters={filters}
            onChange={f => { setFilters(f); setPage(0); }}
            departments={departments}
            onClose={() => setShowAdvFilters(false)}
          />
        )}

        {/* Content */}
        {isLoading ? (
          <div className="rounded-lg" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '40px' }}>
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="rounded bg-slate-200" style={{ width: 28, height: 28 }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/5" />
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-16" />
                  <div className="h-3 bg-slate-100 rounded w-12" />
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '80px 40px' }}>
            <FolderKanban size={48} color="#CBD5E1" strokeWidth={1.25} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', marginTop: 16, fontFamily: "'Sora', sans-serif" }}>
              {filters.search || filters.statusChip !== 'All' ? 'No projects match your filters' : 'No projects yet'}
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center', maxWidth: 360 }}>
              {filters.search || filters.statusChip !== 'All' ? 'Try adjusting your search or filter criteria.' : 'Create your first project to get started.'}
            </p>
            {filters.search === '' && filters.statusChip === 'All' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 mt-6 rounded-md"
                style={{ height: 36, padding: '0 16px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={16} /> New Project
              </button>
            )}
          </div>
        ) : view === 'list' ? (
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
        ) : (
          <AllProjectsCardGrid
            projects={pageData}
            favoriteIds={favorites}
            onToggleFav={(id, fav) => toggleFav.mutate({ projectId: id, isFavorited: fav })}
            onSelectProject={id => setSelectedProject(id)}
          />
        )}

        {/* Pagination */}
        {filtered.length > perPage && (
          <div className="flex items-center justify-between mt-4" style={{ fontSize: 12, color: '#64748B' }}>
            <span>Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length} projects</span>
            <div className="flex items-center gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="flex items-center justify-center rounded transition-colors disabled:opacity-30" style={{ width: 28, height: 28, border: '1px solid #E2E8F0', background: '#FFF', cursor: 'pointer' }}>
                <ChevronLeft size={14} color="#334155" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const pn = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                return (
                  <button key={pn} onClick={() => setPage(pn)} className="flex items-center justify-center rounded" style={{ width: 28, height: 28, border: pn === page ? 'none' : '1px solid #E2E8F0', background: pn === page ? '#2563EB' : '#FFF', color: pn === page ? '#FFF' : '#334155', fontSize: 12, fontWeight: pn === page ? 600 : 400, cursor: 'pointer' }}>
                    {pn + 1}
                  </button>
                );
              })}
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="flex items-center justify-center rounded transition-colors disabled:opacity-30" style={{ width: 28, height: 28, border: '1px solid #E2E8F0', background: '#FFF', cursor: 'pointer' }}>
                <ChevronRightIcon size={14} color="#334155" />
              </button>
              <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(0); }} className="ml-3 rounded" style={{ height: 28, padding: '0 6px', border: '1px solid #E2E8F0', fontSize: 12, color: '#334155', background: '#FFF', cursor: 'pointer' }}>
                <option value={12}>12 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
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
      </div>
    </div>
  );
}
