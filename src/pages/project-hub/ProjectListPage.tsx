import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, FolderKanban, Plus, ChevronLeft, ChevronRight as ChevronRightIcon, ExternalLink, Copy, Star, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { ProjectToolbar } from '@/components/project-hub/ProjectToolbar';
import { ProjectTable } from '@/components/project-hub/ProjectTable';
import { ProjectCardGrid } from '@/components/project-hub/ProjectCardGrid';
import { PHProject } from '@/components/project-hub/ProjectTableRow';
import { FilterState } from '@/components/project-hub/FilterDropdown';
import { SkeletonTable } from '@/components/project-hub/shared/SkeletonPulse';
import { CreateProjectModal } from '@/components/project-hub/CreateProjectModal';
import { ProjectStatusTabs, ProjectTab } from '@/components/project-hub/ProjectStatusTabs';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import '@/components/project-hub/shared/phStyles.css';

export default function ProjectListPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const T = isDark ? DK : LK;
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const onNewProject = useCallback(() => setCreateModalOpen(true), []);
  const queryClient = useQueryClient();
  const [view, setView] = useState<'table' | 'card'>('table');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>({ statuses: [], healths: [] });
  const [activeTab, setActiveTab] = useState<ProjectTab>('all');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; project: PHProject } | null>(null);

  // Close context menu
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const clickHandler = () => close();
    const scrollHandler = () => close();
    requestAnimationFrame(() => {
      document.addEventListener('click', clickHandler);
      document.addEventListener('keydown', escHandler);
      document.addEventListener('scroll', scrollHandler, true);
    });
    return () => {
      document.removeEventListener('click', clickHandler);
      document.removeEventListener('keydown', escHandler);
      document.removeEventListener('scroll', scrollHandler, true);
    };
  }, [ctxMenu]);

  // Fetch projects
  const { data: rawProjects = [], isLoading } = useQuery({
    queryKey: ['ph-projects-full-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_projects')
        .select('id, key, name, description, department, status, health, color, icon, updated_at, is_archived')
        .eq('is_archived', false)
        .neq('key', 'MDT')
        .order('updated_at', { ascending: false });
      if (error) {
        console.warn('ph_projects query error:', error.message);
        return [];
      }
      return (data || []) as PHProject[];
    },
  });

  // Fetch member counts
  const { data: memberCounts = {} } = useQuery({
    queryKey: ['ph-member-counts', rawProjects.map(p => p.id)],
    queryFn: async () => {
      if (rawProjects.length === 0) return {};
      const { data, error } = await supabase.from('ph_project_members').select('project_id');
      if (error) return {};
      const counts: Record<string, number> = {};
      (data || []).forEach(m => { counts[m.project_id] = (counts[m.project_id] || 0) + 1; });
      return counts;
    },
    enabled: rawProjects.length > 0,
  });

  // Fetch starred projects
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('ph_user_preferences')
        .select('preference_value')
        .eq('user_id', user.id)
        .eq('preference_key', 'starred_projects')
        .is('project_id', null)
        .maybeSingle();
      if (data?.preference_value) {
        const arr = Array.isArray(data.preference_value) ? data.preference_value : [];
        setStarredIds(new Set(arr as string[]));
      }
    })();
  }, []);

  // Toggle star
  const toggleStar = useCallback(async (projectId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please sign in first'); return; }

    setStarredIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
      const arr = Array.from(next);
      supabase
        .from('ph_user_preferences')
        .upsert(
          { user_id: user.id, project_id: null, preference_key: 'starred_projects', preference_value: arr as any },
          { onConflict: 'user_id,project_id,preference_key' }
        )
        .then();
      return next;
    });
  }, []);

  // Archive project
  const archiveProject = useCallback(async (projectId: string, projectName: string) => {
    if (!confirm(`Archive "${projectName}"? It will be hidden from the project list.`)) return;
    try {
      const { error } = await supabase
        .from('ph_projects')
        .update({ is_archived: true, archived_at: new Date().toISOString() } as any)
        .eq('id', projectId);
      if (error) throw new Error(error.message);
      toast.success('Project archived');
      queryClient.invalidateQueries({ queryKey: ['ph-projects-full-list'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive');
    }
  }, [queryClient]);

  const projectsWithMembers = useMemo(
    () => rawProjects.map(p => ({ ...p, member_count: memberCounts[p.id] || 0 })),
    [rawProjects, memberCounts]
  );

  const tabCounts = useMemo(() => ({
    all: projectsWithMembers.length,
    starred: projectsWithMembers.filter(p => starredIds.has(p.id)).length,
    active: projectsWithMembers.filter(p => p.status === 'active').length,
    on_hold: projectsWithMembers.filter(p => p.status === 'on_hold').length,
    planning: projectsWithMembers.filter(p => p.status === 'planning').length,
    completed: projectsWithMembers.filter(p => p.status === 'completed').length,
  }), [projectsWithMembers, starredIds]);

  const filtered = useMemo(() => {
    let list = projectsWithMembers;
    if (activeTab === 'starred') list = list.filter(p => starredIds.has(p.id));
    else if (activeTab !== 'all') list = list.filter(p => p.status === activeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q));
    }
    if (filters.statuses.length) list = list.filter(p => filters.statuses.includes(p.status));
    if (filters.healths.length) list = list.filter(p => p.health && filters.healths.includes(p.health));
    return list;
  }, [projectsWithMembers, activeTab, starredIds, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);

  const handleContextMenu = useCallback((e: React.MouseEvent, project: PHProject) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 250);
    setCtxMenu({ x, y, project });
  }, []);

  const hasFilters = search || activeTab !== 'all' || filters.statuses.length + filters.healths.length > 0;

  return (
    <div className="ph-content-wrapper" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="ph-inner-content">
        <CatalystPageHeader title="All Projects" />

        {/* Status Tabs */}
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <ProjectStatusTabs
            activeTab={activeTab}
            onTabChange={t => { setActiveTab(t); setPage(0); }}
            counts={tabCounts}
            isDark={isDark}
          />
          <div className="flex items-center gap-2">
            <ProjectToolbar
              view={view} onViewChange={setView}
              search={search} onSearchChange={s => { setSearch(s); setPage(0); }}
              filters={filters} onFilterChange={f => { setFilters(f); setPage(0); }}
              isDark={isDark}
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <SkeletonTable rows={8} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: '80px 40px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 8 }}>
            <FolderKanban size={48} style={{ color: T.t4 }} strokeWidth={1.25} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: T.t1, marginTop: 16, fontFamily: "'Sora', sans-serif" }}>
              {hasFilters ? 'No projects match your filters' : 'No projects yet'}
            </h3>
            <p style={{ fontSize: 14, color: T.t2, marginTop: 4, textAlign: 'center', maxWidth: 360 }}>
              {hasFilters
                ? 'Try adjusting your search or filter criteria.'
                : 'Projects help you organize and track work across your team.'}
            </p>
            {!hasFilters && (
              <button
                onClick={onNewProject}
                className="flex items-center gap-1.5 mt-6 rounded-md transition-all"
                style={{ height: 50, padding: '0 16px', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; }}
              >
                <Plus size={16} />
                New Project
              </button>
            )}
          </div>
        ) : view === 'table' ? (
          <ProjectTable projects={paginated} starredIds={starredIds} onToggleStar={toggleStar} onContextMenu={handleContextMenu} isDark={isDark} />
        ) : (
          <ProjectCardGrid projects={paginated} starredIds={starredIds} onToggleStar={toggleStar} />
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-4" style={{ fontSize: 12, color: T.t3 }}>
            <span>
              Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length} projects
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="flex items-center justify-center rounded transition-colors disabled:opacity-30" style={{ width: 28, height: 28, border: `1px solid ${T.border}`, background: isDark ? 'transparent' : '#FFF', cursor: 'pointer' }}>
                <ChevronLeft size={14} style={{ color: T.t2 }} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)} className="flex items-center justify-center rounded transition-colors"
                    style={{ width: 28, height: 28, border: pageNum === page ? 'none' : `1px solid ${T.border}`, background: pageNum === page ? '#2563EB' : (isDark ? 'transparent' : '#FFF'), color: pageNum === page ? '#FFF' : T.t2, fontSize: 12, fontWeight: pageNum === page ? 600 : 400, cursor: 'pointer' }}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="flex items-center justify-center rounded transition-colors disabled:opacity-30" style={{ width: 28, height: 28, border: `1px solid ${T.border}`, background: isDark ? 'transparent' : '#FFF', cursor: 'pointer' }}>
                <ChevronRightIcon size={14} style={{ color: T.t2 }} />
              </button>
              <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(0); }} className="ml-3 rounded" style={{ height: 28, padding: '0 6px', border: `1px solid ${T.border}`, fontSize: 12, color: T.t2, background: isDark ? 'transparent' : '#FFF', cursor: 'pointer' }}>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {ctxMenu && (
          <div
            className="fixed z-[99999]"
            style={{
              top: ctxMenu.y,
              left: ctxMenu.x,
              width: 180,
              background: T.floatBg,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              boxShadow: isDark ? 'none' : '0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)',
              fontFamily: "'Inter', sans-serif",
              padding: '4px 0',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => { navigate(`/project-hub/${ctxMenu.project.key}/dashboard`); setCtxMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 transition-colors"
              style={{ height: 50, fontSize: 13, color: T.t1, background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = T.hoverBg; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <ExternalLink size={16} style={{ color: T.t3 }} /> Open
            </button>
            <button onClick={() => { window.open(`/project-hub/${ctxMenu.project.key}/dashboard`, '_blank'); setCtxMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 transition-colors"
              style={{ height: 50, fontSize: 13, color: T.t1, background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = T.hoverBg; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <ExternalLink size={16} style={{ color: T.t3 }} /> Open in New Tab
            </button>
            <button onClick={() => { navigator.clipboard.writeText(ctxMenu.project.key); toast.success('Copied'); setCtxMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 transition-colors"
              style={{ height: 50, fontSize: 13, color: T.t1, background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = T.hoverBg; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Copy size={16} style={{ color: T.t3 }} /> Copy Key
            </button>
            <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
            <button onClick={() => { toggleStar(ctxMenu.project.id); setCtxMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 transition-colors"
              style={{ height: 50, fontSize: 13, color: T.t1, background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = T.hoverBg; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Star size={16} style={{ color: T.t3 }} fill={starredIds.has(ctxMenu.project.id) ? '#EAB308' : 'none'} />
              {starredIds.has(ctxMenu.project.id) ? 'Unstar' : 'Star'}
            </button>
            <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
            <button onClick={() => { archiveProject(ctxMenu.project.id, ctxMenu.project.name); setCtxMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 transition-colors"
              style={{ height: 50, fontSize: 13, color: '#DC2626', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(220,38,38,0.1)' : '#FEF2F2'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Archive size={16} color="#DC2626" /> Archive
            </button>
          </div>
        )}
      </div>

      <CreateProjectModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </div>
  );
}
