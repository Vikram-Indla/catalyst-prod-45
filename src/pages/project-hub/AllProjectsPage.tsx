import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderKanban, FolderOpen, Star } from 'lucide-react';
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
import { CreateSpaceModal } from '@/spaces';
import { JiraSyncPanel, SyncCTALabel } from '@/components/projecthub/JiraSyncPanel';
import { toast } from 'sonner';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase, typedQuery } from '@/integrations/supabase/client';
const WiringAuditLazy = lazy(() => import('@/components/project-hub/WiringAudit').then(m => ({ default: m.WiringAudit })));
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
  const [sortCol, setSortCol] = useState<SortColumn>('total_issues');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);
  const queryClient = useQueryClient();

  // Get current user for "My Projects" tab
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const { data: projects = [], isLoading, error } = useProjects();
  const { data: favorites = new Set<string>() } = useProjectFavorites();
  const toggleFav = useToggleFavorite();
  useProjectsRealtime();

  // Fetch real issue counts from ph_issues to enrich sort
  const { data: syncCountMap } = useQuery({
    queryKey: ['project-sync-counts'],
    queryFn: async () => {
      const map: Record<string, number> = {};
      const { data: rows } = await typedQuery('v_issue_counts')
        .select('project_key, cnt');
      if (rows) {
        rows.forEach((r: any) => {
          if (r.project_key) map[r.project_key] = (map[r.project_key] || 0) + Number(r.cnt || 0);
        });
      }
      return map;
    },
    staleTime: 3 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Enrich projects with real sync counts so sorting uses actual numbers
  const enrichedProjects = useMemo(() => {
    if (!syncCountMap) return projects;
    return projects.map(p => {
      const syncCount = syncCountMap[p.project_key];
      if (syncCount !== undefined && syncCount > (p.total_issues ?? 0)) {
        return { ...p, total_issues: syncCount };
      }
      return p;
    });
  }, [projects, syncCountMap]);

  const allMemberIds = useMemo(() => enrichedProjects.flatMap(p => p.member_ids ?? []), [enrichedProjects]);
  useMemberProfiles(allMemberIds);

  // Apply "My Projects" filter before standard filtering
  const preFiltered = useMemo(() => {
    if (filters.statusChip === 'My Projects' && currentUserId) {
      return enrichedProjects.filter(p => p.lead_id === currentUserId || (p.member_ids ?? []).includes(currentUserId));
    }
    return enrichedProjects;
  }, [enrichedProjects, filters.statusChip, currentUserId]);

  const filtered = useMemo(() => {
    const effectiveFilters = filters.statusChip === 'My Projects'
      ? { ...filters, statusChip: 'All' }
      : filters;
    return filterAndSortProjects(preFiltered, effectiveFilters, sortCol, sortDir, favorites);
  }, [preFiltered, filters, sortCol, sortDir, favorites]);

  const stats = useMemo(() => {
    const base = computePortfolioStats(projects, favorites);
    const myCount = currentUserId
      ? projects.filter(p => p.lead_id === currentUserId || (p.member_ids ?? []).includes(currentUserId)).length
      : 0;
    return { ...base, statusMyProjects: myCount };
  }, [projects, favorites, currentUserId]);

  const effectivePageSize = (view === 'cards' || view === 'card') ? 12 : perPage;
  const totalPages = Math.max(1, Math.ceil(filtered.length / effectivePageSize));
  const pageData = filtered.slice((page - 1) * effectivePageSize, page * effectivePageSize);

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

  const startIdx = (page - 1) * effectivePageSize;
  const endIdx = Math.min(startIdx + effectivePageSize, filtered.length);

  // Determine empty state context
  const isEmptyProjects = !isLoading && projects.length === 0;
  const isStarredEmpty = !isLoading && filters.statusChip === 'Starred' && filtered.length === 0 && projects.length > 0;
  const isMyProjectsNoAuth = !isLoading && filters.statusChip === 'My Projects' && !currentUserId;
  const isSearchNoResults = !isLoading && !!filters.search && filtered.length === 0 && projects.length > 0;

  return (
    <div className="flex flex-col h-full font-['Inter',-apple-system,system-ui,sans-serif] antialiased">
      <CatalystPageHeader
        title="All Projects"
        actions={
          <div className="flex items-center gap-3">
            {/* Jira Sync CTA */}
            <Popover open={syncPanelOpen} onOpenChange={setSyncPanelOpen}>
              <PopoverTrigger asChild>
                <button className="h-10 px-4 bg-white dark:!bg-[#1A1A1A] border border-slate-200 dark:border-slate-700 rounded-md text-[13px] font-semibold flex items-center gap-2.5 hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 transition-all text-slate-700 dark:text-slate-300 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none">
                  <SyncCTALabel />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-5 bg-white dark:!bg-[#1A1A1A] dark:border-slate-700" align="end">
                <JiraSyncPanel />
              </PopoverContent>
            </Popover>

            {/* New Project */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-10 px-5 rounded-md text-sm font-semibold flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 border-none cursor-pointer shadow-[0_2px_8px_rgba(37,99,235,0.15)] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
            >
              <Plus size={16} strokeWidth={2.5} /> Create project
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-6 py-3 bg-slate-50 dark:!bg-[#0A0A0A] text-foreground">
        {/* Toolbar */}
        <div className="mb-2.5">
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
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-10 bg-white dark:!bg-[#0A0A0A]">
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 w-[30%] rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-2.5 w-[20%] rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : isEmptyProjects ? (
          /* QA1: Empty state — 0 projects */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>No projects yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md">
              Connect Jira to sync your projects, or create one manually to get started.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSyncPanelOpen(true)}
                className="h-9 px-4 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 bg-transparent text-slate-700 dark:text-slate-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
              >
                ↔ Connect Jira
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="h-9 px-4 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 border-none cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
              >
                <Plus className="w-4 h-4" /> Create project
              </button>
            </div>
          </div>
        ) : isMyProjectsNoAuth ? (
          /* QA1: My Projects — not logged in */
          <p className="text-sm text-slate-500 dark:text-slate-400 py-12 text-center">Sign in to see your assigned projects.</p>
        ) : isStarredEmpty ? (
          /* QA1: Starred tab — 0 starred */
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Star className="w-8 h-8 text-slate-300" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Star projects to find them quickly here</p>
          </div>
        ) : isSearchNoResults ? (
          /* QA1: Search — no results */
          <p className="text-sm text-slate-500 dark:text-slate-400 py-12 text-center">No projects match &ldquo;{filters.search}&rdquo;</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 px-10 py-20 text-center bg-white dark:!bg-[#0A0A0A]">
            <FolderKanban size={48} className="text-slate-300 dark:text-slate-600" strokeWidth={1.25} />
            <h3 className="mt-4 text-lg font-semibold text-foreground" style={{ fontFamily: "'Sora', sans-serif" }}>
              No projects match your filters
            </h3>
            <p className="mt-1 max-w-[360px] text-[13px] text-muted-foreground">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : view === 'list' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:!bg-[#0A0A0A]">
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
                pageOffset={startIdx}
              />
            </div>
            {/* Pagination Footer — only when totalPages > 1 */}
            {totalPages > 1 && (
              <div
                className="flex shrink-0 items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-700 bg-white dark:!bg-[#0A0A0A]"
                style={{ fontSize: 13 }}
              >
                <span className="text-muted-foreground">
                  Showing {startIdx + 1}–{endIdx} of {filtered.length} projects
                </span>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-8 h-8 rounded text-sm border focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none cursor-pointer ${
                        page === n
                          ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                          : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(1); }}>
                    <SelectTrigger className="h-8 w-[72px] text-xs border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600">
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
            )}
          </div>
        ) : (
          <div className="pb-6">
            <AllProjectsCardGrid
              projects={pageData}
              favoriteIds={favorites}
              onToggleFav={(id, fav) => toggleFav.mutate({ projectId: id, isFavorited: fav })}
              onSelectProject={id => setSelectedProject(id)}
            />
            {totalPages > 1 && (
              <div
                className="mt-6 flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-700 bg-white dark:!bg-[#0A0A0A] rounded-lg"
                style={{ fontSize: 13 }}
              >
                <span className="text-muted-foreground">
                  Showing {startIdx + 1}–{endIdx} of {filtered.length} projects
                </span>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-8 h-8 rounded text-sm border focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none cursor-pointer ${
                        page === n
                          ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                          : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <ProjectDetailPanel
          project={selectedProjectData}
          open={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          isFav={selectedProject ? favorites.has(selectedProject) : false}
          onToggleFav={() => { if (selectedProject) toggleFav.mutate({ projectId: selectedProject, isFavorited: favorites.has(selectedProject) }); }}
        />
        <CreateSpaceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            // Refresh the v_project_list query so the new row shows up
            // immediately without waiting for the realtime subscription.
            queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
            toast.success('Project created');
          }}
        />
        {new URLSearchParams(window.location.search).has('debug') && (
          <Suspense fallback={null}>
            <WiringAuditLazy />
          </Suspense>
        )}
      </div>
    </div>
  );
}
