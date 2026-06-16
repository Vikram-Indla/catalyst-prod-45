import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderKanban, FolderOpen, Star } from '@/lib/atlaskit-icons';
import type { ProjectFilters, SortColumn, SortDirection } from '@/types/projecthub';
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
import { ProjectDetailPanel } from '@/components/projecthub/ProjectDetailPanel';
import { CreateSpaceModal } from '@/spaces';
import { token } from '@atlaskit/tokens';
import { FlagsHost, flag } from '@/components/shared/JiraTable/flags';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useNavBreakpoint } from '@/hooks/useNavBreakpoint';
import { supabase } from '@/integrations/supabase/client';
import { buildProjectSyncStats, SYNC_COUNT_DATE_BOUNDARY } from '@/hooks/projecthub-sync-utils';
import type { ProjectSyncStats } from '@/hooks/projecthub-sync-utils';
const WiringAuditLazy = lazy(() => import('@/components/project-hub/WiringAudit').then(m => ({ default: m.WiringAudit })));
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AllProjectsPage() {
  // Loop 5b (2026-04-30): collapse the wide actions cluster (Jira Sync pill +
  // "Create project" label) into icon-only triggers at <1024px so they fit
  // alongside the title on iPhone/iPad. Desktop ≥1024px untouched.
  const { isNarrow } = useNavBreakpoint();
  // Card view deprecated — list is the only mode.
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS);
  const [sortCol, setSortCol] = useState<SortColumn>('total_issues');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Deep-link: /project-hub/projects?create=1 opens the create modal directly
  // (switcher "+ New project" footer, 2026-06-16). Consume + clear the param.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setShowCreateModal(true);
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  // Fetch 2026+ issue stats from ph_issues — count, latest timestamp, 24h activity.
  // buildProjectSyncStats aggregates all three in a single client-side pass.
  const { data: syncStatsMap } = useQuery({
    queryKey: ['project-sync-stats-2026'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('ph_issues')
        .select('project_key, jira_updated_at, jira_created_at')
        .gte('jira_updated_at', SYNC_COUNT_DATE_BOUNDARY)
        .is('deleted_at', null)
        .is('jira_removed_at', null)
        .limit(10000);
      return buildProjectSyncStats(
        (data ?? []) as Array<{ project_key: string | null; jira_updated_at: string | null; jira_created_at: string | null }>
      );
    },
    staleTime: 3 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Enrich projects with per-project sync stats (count + latest timestamp)
  const enrichedProjects = useMemo(() => {
    if (!syncStatsMap) return projects;
    return projects.map(p => ({
      ...p,
      jira_issue_count: syncStatsMap[p.project_key]?.count ?? 0,
    }));
  }, [projects, syncStatsMap]);

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

  const effectivePageSize = perPage;
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

  if (error) flag.error('Failed to load projects');

  const startIdx = (page - 1) * effectivePageSize;
  const endIdx = Math.min(startIdx + effectivePageSize, filtered.length);

  // Determine empty state context
  const isEmptyProjects = !isLoading && projects.length === 0;
  const isStarredEmpty = !isLoading && filters.statusChip === 'Starred' && filtered.length === 0 && projects.length > 0;
  const isMyProjectsNoAuth = !isLoading && filters.statusChip === 'My Projects' && !currentUserId;
  const isSearchNoResults = !isLoading && !!filters.search && filtered.length === 0 && projects.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: token('elevation.surface', '#FFFFFF'),
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      <CatalystPageHeader
        title="All Projects"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: token('space.150', '12px') }}>
            {isNarrow ? (
              <button
                onClick={() => setShowCreateModal(true)}
                aria-label="Create project"
                title="Create project"
                style={{
                  height: 36,
                  width: 36,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: token('color.text.inverse', '#FFFFFF'),
                  backgroundColor: token('color.background.brand.bold', '#0052CC'),
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = token('color.background.brand.bold.hovered', '#0065FF')}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = token('color.background.brand.bold', '#0052CC')}
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  height: 40,
                  paddingInline: token('space.250', '20px'),
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: token('space.100', '8px'),
                  color: token('color.text.inverse', '#FFFFFF'),
                  backgroundColor: token('color.background.brand.bold', '#0052CC'),
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = token('color.background.brand.bold.hovered', '#0065FF')}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = token('color.background.brand.bold', '#0052CC')}
              >
                <Plus size={16} strokeWidth={2.5} /> Create project
              </button>
            )}
          </div>
        }
      />

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          paddingInline: token('space.300', '24px'),
          paddingBlock: token('space.150', '12px'),
          backgroundColor: token('elevation.surface', '#FFFFFF'),
          color: token('color.text', '#172B4D'),
        }}
      >
        {/* Toolbar */}
        <div style={{ marginBlockEnd: token('space.100', '8px') }}>
          <AllProjectsToolbar
            filters={filters}
            onFilterChange={handleFilterChange}
            stats={stats}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div
            style={{
              borderRadius: 8,
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              padding: token('space.500', '40px'),
              backgroundColor: token('elevation.surface', '#FFFFFF'),
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.150', '12px') }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ display: 'flex', alignItems: 'center', gap: token('space.200', '16px') }}>
                  <div
                    style={{
                      height: 28,
                      width: 28,
                      borderRadius: '50%',
                      backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
                    }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: token('space.075', '6px') }}>
                    <div
                      style={{
                        height: 12,
                        width: '30%',
                        borderRadius: 4,
                        backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
                      }}
                    />
                    <div
                      style={{
                        height: 10,
                        width: '20%',
                        borderRadius: 4,
                        backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : isEmptyProjects ? (
          /* QA1: Empty state — 0 projects */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBlock: token('space.600', '80px'), textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBlockEnd: token('space.200', '16px'),
              }}
            >
              <FolderOpen size={32} style={{ color: token('color.icon.subtle', '#6B778C') }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: '600', fontFamily: 'var(--cp-font-heading)', color: token('color.text', '#172B4D'), marginBlockEnd: token('space.050', '4px') }}>No projects yet</h3>
            <p style={{ fontSize: 14, color: token('color.text.subtle', '#6B778C'), marginBlockEnd: token('space.300', '24px'), maxWidth: 448 }}>
              Projects appear here after the Jira sync has run, or create one manually to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                height: 36,
                paddingInline: token('space.200', '16px'),
                backgroundColor: token('color.background.brand.bold', '#0052CC'),
                color: token('color.text.inverse', '#FFFFFF'),
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: token('space.100', '8px'),
                border: 'none',
                cursor: 'pointer',
                outline: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = token('color.background.brand.bold.hovered', '#0065FF')}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = token('color.background.brand.bold', '#0052CC')}
            >
              <Plus size={16} /> Create project
            </button>
          </div>
        ) : isMyProjectsNoAuth ? (
          /* QA1: My Projects — not logged in */
          <p style={{ fontSize: 14, color: token('color.text.subtle', '#6B778C'), paddingBlock: token('space.600', '48px'), textAlign: 'center' }}>Sign in to see your assigned projects.</p>
        ) : isStarredEmpty ? (
          /* QA1: Starred tab — 0 starred */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBlock: token('space.600', '48px'), gap: token('space.150', '12px') }}>
            <Star size={32} style={{ color: token('color.icon.subtle', '#6B778C') }} />
            <p style={{ fontSize: 14, color: token('color.text.subtle', '#6B778C') }}>Star projects to find them quickly here</p>
          </div>
        ) : isSearchNoResults ? (
          /* QA1: Search — no results */
          <p style={{ fontSize: 14, color: token('color.text.subtle', '#6B778C'), paddingBlock: token('space.600', '48px'), textAlign: 'center' }}>No projects match &ldquo;{filters.search}&rdquo;</p>
        ) : filtered.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              paddingInline: token('space.500', '40px'),
              paddingBlock: token('space.600', '80px'),
              textAlign: 'center',
              backgroundColor: token('elevation.surface', '#FFFFFF'),
            }}
          >
            <FolderKanban size={48} style={{ color: token('color.icon.subtle', '#6B778C') }} strokeWidth={1.25} />
            <h3
              style={{
                fontSize: 16,
                fontWeight: '600',
                fontFamily: 'var(--cp-font-heading)',
                color: token('color.text', '#172B4D'),
                marginBlockStart: token('space.200', '16px'),
              }}
            >
              No projects match your filters
            </h3>
            <p style={{ marginBlockStart: token('space.050', '4px'), maxWidth: 360, fontSize: 13, color: token('color.text.subtle', '#6B778C') }}>
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          // Card view deprecated — list is the only mode.
          <div
            style={{
              display: 'flex',
              minHeight: 0,
              flex: 1,
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: 8,
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              backgroundColor: token('elevation.surface', '#FFFFFF'),
            }}
          >
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
                projectSyncStats={syncStatsMap}
                currentUserId={currentUserId}
              />
            </div>
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingInline: token('space.200', '16px'),
                  paddingBlock: token('space.100', '8px'),
                  borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
                  backgroundColor: token('elevation.surface', '#FFFFFF'),
                  fontSize: 13,
                }}
              >
                <span style={{ color: token('color.text.subtle', '#6B778C') }}>
                  Showing {startIdx + 1}–{endIdx} of {filtered.length} projects
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 4,
                        fontSize: 14,
                        border: page === n ? `1px solid ${token('color.background.brand.bold', '#0052CC')}` : `1px solid ${token('color.border', '#DFE1E6')}`,
                        outline: 'none',
                        cursor: 'pointer',
                        fontWeight: page === n ? 600 : 400,
                        backgroundColor: page === n ? token('color.background.brand.bold', '#0052CC') : 'transparent',
                        color: page === n ? token('color.text.inverse', '#FFFFFF') : token('color.text.subtle', '#6B778C'),
                      }}
                      onMouseEnter={e => {
                        if (page !== n) {
                          e.currentTarget.style.backgroundColor = token('color.background.neutral.subtle.hovered', '#F4F5F7');
                        }
                      }}
                      onMouseLeave={e => {
                        if (page !== n) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {n}
                    </button>
                  ))}
                  <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(1); }}>
                    <SelectTrigger
                      style={{
                        height: 32,
                        width: 72,
                        fontSize: 12,
                        border: `1px solid ${token('color.border', '#DFE1E6')}`,
                        color: token('color.text.subtle', '#6B778C'),
                        backgroundColor: token('elevation.surface', '#FFFFFF'),
                      }}
                    >
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
            flag.success('Project created');
          }}
        />
        {new URLSearchParams(window.location.search).has('debug') && (
          <Suspense fallback={null}>
            <WiringAuditLazy />
          </Suspense>
        )}
      </div>
      <FlagsHost />
    </div>
  );
}
