import { useState, useMemo } from 'react';
import { Plus, FolderKanban } from 'lucide-react';
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
import { AllProjectsTable } from '@/components/projecthub/AllProjectsTable';
import { AllProjectsCardGrid } from '@/components/projecthub/AllProjectsCardGrid';
import { ProjectDetailPanel } from '@/components/projecthub/ProjectDetailPanel';
import { CreateProjectDialog } from '@/components/projecthub/CreateProjectDialog';
import { toast } from 'sonner';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AllProjectsPage() {
  const [view, setView] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS);
  const [sortCol, setSortCol] = useState<SortColumn>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: projects = [], isLoading, error } = useProjects();
  const { data: favorites = new Set<string>() } = useProjectFavorites();
  const toggleFav = useToggleFavorite();
  useProjectsRealtime();

  const allMemberIds = useMemo(() => projects.flatMap(p => p.member_ids ?? []), [projects]);
  useMemberProfiles(allMemberIds);

  const filtered = useMemo(() => filterAndSortProjects(projects, filters, sortCol, sortDir, favorites), [projects, filters, sortCol, sortDir, favorites]);
  const stats = useMemo(() => computePortfolioStats(projects, favorites), [projects, favorites]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  const selectedProjectData = useMemo(() => projects.find(p => p.id === selectedProject) ?? null, [projects, selectedProject]);

  const handleSort = (col: SortColumn) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleFilterChange = (f: ProjectFilters) => { setFilters(f); setPage(1); };

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

  if (error) toast.error('Failed to load projects');

  const startIdx = (page - 1) * perPage;
  const endIdx = Math.min(startIdx + perPage, filtered.length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Inter', -apple-system, system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}>
      <CommandCenterHeader
        title="All Projects"
        subtitle={`${filtered.length} projects across your portfolio`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-md"
              style={{
                height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600,
                color: '#FFF', background: '#2563EB', border: 'none',
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              <Plus size={16} strokeWidth={2.5} /> New Project
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-6 py-3" style={{ background: 'var(--bg-sunken)', color: 'var(--text-1)' }}>
        {/* Toolbar */}
        <div style={{ marginBottom: 10 }}>
          <AllProjectsToolbar
            view={view}
            onViewChange={v => { setView(v); setPage(1); }}
            filters={filters}
            onFilterChange={handleFilterChange}
            stats={stats}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="rounded-lg border p-10" style={{ borderColor: 'var(--bd-default)', background: 'var(--bg-elevated)' }}>
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="h-7 w-7 rounded-full" style={{ background: 'var(--bg-sunken)' }} />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 w-[30%] rounded" style={{ background: 'var(--bg-sunken)' }} />
                    <div className="h-2.5 w-[20%] rounded" style={{ background: 'var(--bg-sunken)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border px-10 py-20 text-center" style={{ borderColor: 'var(--bd-default)', background: 'var(--bg-elevated)' }}>
            <FolderKanban size={48} style={{ color: 'var(--text-4)' }} strokeWidth={1.25} />
            <h3 className="mt-4 text-lg font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: 'var(--text-1)' }}>
              {filters.search || filters.statusChip !== 'All' ? 'No projects match your filters' : 'No projects yet'}
            </h3>
            <p className="mt-1 max-w-[360px] text-[13px]" style={{ color: 'var(--text-3)' }}>
              {filters.search || filters.statusChip !== 'All' ? 'Try adjusting your search or filter criteria.' : 'Create your first project to get started.'}
            </p>
          </div>
        ) : view === 'list' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border" style={{ borderColor: 'var(--bd-default)', background: 'var(--bg-elevated)' }}>
            <div className="flex-1 min-h-0 overflow-auto">
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
            {/* Pagination Footer */}
            <div
              className="flex shrink-0 items-center justify-between px-4 py-2"
              style={{ borderTop: '1px solid var(--bd-default)', background: 'var(--bg-surface)', fontSize: 13 }}
            >
              <span style={{ color: 'var(--text-3)' }}>
                Showing {startIdx + 1}–{endIdx} of {filtered.length} projects
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded text-sm"
                  style={{
                    border: '1px solid var(--bd-default)', cursor: page === 1 ? 'not-allowed' : 'pointer',
                    opacity: page === 1 ? 0.4 : 1, color: 'var(--text-2)', background: 'transparent',
                  }}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className="w-8 h-8 rounded text-sm"
                    style={{
                      border: page === n ? 'none' : '1px solid var(--bd-default)',
                      background: page === n ? '#2563EB' : 'transparent',
                      color: page === n ? '#FFF' : 'var(--text-2)',
                      fontWeight: page === n ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded text-sm"
                  style={{
                    border: '1px solid var(--bd-default)', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    opacity: page >= totalPages ? 0.4 : 1, color: 'var(--text-2)', background: 'transparent',
                  }}
                >
                  Next
                </button>
                <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 w-[72px] text-xs" style={{ borderColor: 'var(--bd-default)', color: 'var(--text-2)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <AllProjectsCardGrid
              projects={filtered}
              favoriteIds={favorites}
              onToggleFav={(id, fav) => toggleFav.mutate({ projectId: id, isFavorited: fav })}
              onSelectProject={id => setSelectedProject(id)}
            />
          </div>
        )}

        <ProjectDetailPanel
          project={selectedProjectData}
          open={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          isFav={selectedProject ? favorites.has(selectedProject) : false}
          onToggleFav={() => { if (selectedProject) toggleFav.mutate({ projectId: selectedProject, isFavorited: favorites.has(selectedProject) }); }}
        />
        <CreateProjectDialog open={showCreateModal} onClose={() => setShowCreateModal(false)} />
      </div>
    </div>
  );
}