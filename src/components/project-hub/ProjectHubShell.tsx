import { lazy, Suspense, useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TopNav } from './shell/TopNav';
import { Sidebar } from './shell/Sidebar';
import { ProjectEntry } from './shell/ProjectSwitcher';
const CreateProjectModal = lazy(() => import('./CreateProjectModal').then(m => ({ default: m.CreateProjectModal })));
const CreateWorkItemModal = lazy(() => import('./work-items/CreateWorkItemModal').then(m => ({ default: m.CreateWorkItemModal })));
import { toast } from 'sonner';

export function ProjectHubShell() {
  const params = useParams<{ key?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createWorkItemOpen, setCreateWorkItemOpen] = useState(false);

  const isInProjectContext = !!params.key && /\/(list|board|backlog|epic-backlog|feature-backlog|story-backlog|hierarchy|timeline|releases|reports|sprint-predictor|risk-scanner|dashboard)/.test(location.pathname);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setCollapsed(true);
      else setCollapsed(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['ph-projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_projects')
        .select('id, key, name, color, icon, status')
        .eq('is_archived', false)
        .order('name');
      if (error) { console.warn('ph_projects shell query error:', error.message); return []; }
      return (data || []).map(p => ({
        key: p.key, name: p.name, color: p.color || '#2563EB', icon: p.icon || 'rocket',
      })) as ProjectEntry[];
    },
  });

  const { data: currentProject } = useQuery({
    queryKey: ['ph-project', params.key],
    queryFn: async () => {
      if (!params.key) return null;
      const { data, error } = await supabase
        .from('ph_projects')
        .select('id, key, name, color, icon')
        .eq('key', params.key.toUpperCase())
        .maybeSingle();
      if (error) { console.warn('ph_project query error:', error.message); return null; }
      return data ? { key: data.key, name: data.name, color: data.color || '#2563EB' } : null;
    },
    enabled: !!params.key,
  });

  const handleTopCreateClick = () => {
    if (isInProjectContext && currentProject) setCreateWorkItemOpen(true);
    else setCreateModalOpen(true);
  };

  const { data: fullProject } = useQuery({
    queryKey: ['ph-project-full', params.key],
    queryFn: async () => {
      if (!params.key) return null;
      const { data } = await supabase.from('ph_projects').select('id, key, name').eq('key', params.key.toUpperCase()).maybeSingle();
      return data;
    },
    enabled: !!params.key && isInProjectContext,
  });

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-1)] dark:!bg-[#0A0A0A]" style={{ ['--ph-bg' as string]: '#0A0A0A' }}>
      <TopNav onCreateClick={handleTopCreateClick} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} projects={projects} currentProject={currentProject} />
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#F8FAFC] dark:!bg-[#0A0A0A]">
          <Outlet context={{ onNewProject: () => setCreateModalOpen(true) }} />
        </main>
      </div>
      <CreateProjectModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      {fullProject && (
        <CreateWorkItemModal open={createWorkItemOpen} onClose={() => setCreateWorkItemOpen(false)} projectId={fullProject.id} projectKey={fullProject.key} />
      )}
    </div>
  );
}