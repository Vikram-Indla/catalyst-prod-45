import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, FolderOpen, Plus, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ProjectToolbar } from '@/components/project-hub/ProjectToolbar';
import { ProjectTable } from '@/components/project-hub/ProjectTable';
import { ProjectCardGrid } from '@/components/project-hub/ProjectCardGrid';
import { PHProject } from '@/components/project-hub/ProjectTableRow';
import { FilterState } from '@/components/project-hub/FilterDropdown';

export default function ProjectListPage() {
  const navigate = useNavigate();
  const { onNewProject } = useOutletContext<{ onNewProject?: () => void }>();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'table' | 'card'>('table');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>({ departments: [], statuses: [], healths: [] });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; project: PHProject } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  // Close context menu
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    document.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return () => {
      document.removeEventListener('click', close);
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
        .order('updated_at', { ascending: false });
      if (error) {
        console.warn('ph_projects query error (likely unauthenticated):', error.message);
        return [];
      }
      return (data || []) as PHProject[];
    },
  });

  // Fetch member counts per project
  const { data: memberCounts = {} } = useQuery({
    queryKey: ['ph-member-counts', rawProjects.map(p => p.id)],
    queryFn: async () => {
      if (rawProjects.length === 0) return {};
      const { data, error } = await supabase
        .from('ph_project_members')
        .select('project_id');
      if (error) return {};
      const counts: Record<string, number> = {};
      (data || []).forEach(m => {
        counts[m.project_id] = (counts[m.project_id] || 0) + 1;
      });
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

      // Persist
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

  // Derive departments
  const departments = useMemo(
    () => [...new Set(rawProjects.map(p => p.department))].sort(),
    [rawProjects]
  );

  // Apply filters + search
  const filtered = useMemo(() => {
    let list = rawProjects.map(p => ({ ...p, member_count: memberCounts[p.id] || 0 }));

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q));
    }
    if (filters.departments.length) list = list.filter(p => filters.departments.includes(p.department));
    if (filters.statuses.length) list = list.filter(p => filters.statuses.includes(p.status));
    if (filters.healths.length) list = list.filter(p => p.health && filters.healths.includes(p.health));

    return list;
  }, [rawProjects, memberCounts, search, filters]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent, project: PHProject) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, project });
  }, []);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, fontFamily: "'Inter', sans-serif" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-1">
        <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>ProjectHub</span>
        <ChevronRight size={14} color="#94A3B8" />
        <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>All Projects</span>
      </div>

      {/* Page title */}
      <h1
        className="mb-5"
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#0F172A',
          fontFamily: "'Sora', sans-serif",
          letterSpacing: '-0.3px',
        }}
      >
        All Projects
      </h1>

      {/* Toolbar */}
      <div className="mb-4">
        <ProjectToolbar
          view={view}
          onViewChange={setView}
          search={search}
          onSearchChange={s => { setSearch(s); setPage(0); }}
          departments={departments}
          filters={filters}
          onFilterChange={f => { setFilters(f); setPage(0); }}
          onNewProject={onNewProject}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse rounded-lg" style={{ height: 36, background: '#E2E8F0' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl"
          style={{
            padding: '80px 40px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
          }}
        >
          <FolderOpen size={48} color="#94A3B8" strokeWidth={1.25} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginTop: 16 }}>
            {search || filters.departments.length + filters.statuses.length + filters.healths.length > 0
              ? 'No projects match your filters'
              : 'No projects yet'}
          </h3>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center', maxWidth: 360 }}>
            {search || filters.departments.length + filters.statuses.length + filters.healths.length > 0
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first project to get started.'}
          </p>
          {!search && filters.departments.length + filters.statuses.length + filters.healths.length === 0 && (
            <button
              onClick={onNewProject}
              className="flex items-center gap-1.5 mt-6 rounded-md hover:opacity-90 transition-opacity"
              style={{
                height: 36,
                padding: '0 16px',
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              New Project
            </button>
          )}
        </div>
      ) : view === 'table' ? (
        <ProjectTable
          projects={paginated}
          starredIds={starredIds}
          onToggleStar={toggleStar}
          onContextMenu={handleContextMenu}
        />
      ) : (
        <ProjectCardGrid
          projects={paginated}
          starredIds={starredIds}
          onToggleStar={toggleStar}
        />
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-4" style={{ fontSize: 12, color: '#64748B' }}>
          <span>
            Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length} projects
          </span>

          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="flex items-center justify-center rounded transition-colors disabled:opacity-30"
              style={{ width: 28, height: 28, border: '1px solid #E2E8F0', background: '#FFF', cursor: 'pointer' }}
            >
              <ChevronLeft size={14} color="#334155" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className="flex items-center justify-center rounded transition-colors"
                  style={{
                    width: 28,
                    height: 28,
                    border: pageNum === page ? 'none' : '1px solid #E2E8F0',
                    background: pageNum === page ? '#2563EB' : '#FFF',
                    color: pageNum === page ? '#FFF' : '#334155',
                    fontSize: 12,
                    fontWeight: pageNum === page ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center justify-center rounded transition-colors disabled:opacity-30"
              style={{ width: 28, height: 28, border: '1px solid #E2E8F0', background: '#FFF', cursor: 'pointer' }}
            >
              <ChevronRightIcon size={14} color="#334155" />
            </button>

            {/* Per page */}
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(0); }}
              className="ml-3 rounded"
              style={{
                height: 28,
                padding: '0 6px',
                border: '1px solid #E2E8F0',
                fontSize: 12,
                color: '#334155',
                background: '#FFF',
                cursor: 'pointer',
              }}
            >
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
          ref={ctxRef}
          className="fixed z-[99999]"
          style={{
            top: ctxMenu.y,
            left: ctxMenu.x,
            width: 160,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)',
            fontFamily: "'Inter', sans-serif",
            padding: '4px 0',
          }}
        >
          {[
            { label: 'Open', action: () => navigate(`/project-hub/${ctxMenu.project.key}/dashboard`) },
            { label: 'Open in New Tab', action: () => window.open(`/project-hub/${ctxMenu.project.key}/dashboard`, '_blank') },
            { label: 'Copy Key', action: () => { navigator.clipboard.writeText(ctxMenu.project.key); toast.success('Copied'); } },
            { label: 'Copy Link', action: () => { navigator.clipboard.writeText(`${window.location.origin}/project-hub/${ctxMenu.project.key}/dashboard`); toast.success('Link copied'); } },
            { label: 'Archive', action: () => toast.info('Archive not yet implemented') },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full text-left px-3 py-1.5 transition-colors hover:bg-[#F8FAFC]"
              style={{
                fontSize: 12,
                color: item.label === 'Archive' ? '#EF4444' : '#334155',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
