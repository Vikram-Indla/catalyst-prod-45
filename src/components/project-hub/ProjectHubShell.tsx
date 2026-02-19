import { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TopNav } from './shell/TopNav';
import { Sidebar } from './shell/Sidebar';
import { ProjectEntry } from './shell/ProjectSwitcher';
import { CreateProjectModal } from './CreateProjectModal';
import { toast } from 'sonner';

export function ProjectHubShell() {
  const params = useParams<{ key?: string }>();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Auto-collapse on small viewport
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1280) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch all projects the user has access to
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
        key: p.key,
        name: p.name,
        color: p.color || '#2563EB',
        icon: p.icon || 'rocket',
      })) as ProjectEntry[];
    },
  });

  // Fetch current project if :key is in URL
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

  return (
    <div className="flex flex-col h-screen" style={{ background: '#F8FAFC' }}>
      {/* Top Nav */}
      <TopNav onCreateClick={() => setCreateModalOpen(true)} />

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          projects={projects}
          currentProject={currentProject}
        />

        {/* Content area */}
        <main className="flex-1 min-w-0 overflow-y-auto" style={{ background: '#F8FAFC' }}>
          <Outlet context={{ onNewProject: () => setCreateModalOpen(true) }} />
        </main>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </div>
  );
}
