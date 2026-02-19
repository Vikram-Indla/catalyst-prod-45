import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ProjectListPage() {
  const navigate = useNavigate();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['ph-projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_projects')
        .select('id, key, name, description, department, status, health, color, icon, created_at')
        .eq('is_archived', false)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.3px' }}>
            Projects
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Manage and access your project workspaces
          </p>
        </div>
        <button
          onClick={() => toast.info('Create Project modal coming in Phase 4')}
          className="flex items-center gap-1.5 rounded-md hover:opacity-90 transition-opacity"
          style={{
            height: 34,
            padding: '0 14px',
            background: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          New Project
        </button>
      </div>

      {/* Projects grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse rounded-xl" style={{ height: 160, background: '#E2E8F0' }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
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
            No projects yet
          </h3>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center', maxWidth: 360 }}>
            Create your first project to start tracking work items, sprints, and releases.
          </p>
          <button
            onClick={() => toast.info('Create Project modal coming in Phase 4')}
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
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => navigate(`/project-hub/${project.key}/dashboard`)}
              className="flex flex-col rounded-xl transition-shadow hover:shadow-md text-left"
              style={{
                padding: 20,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                cursor: 'pointer',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex items-center justify-center rounded flex-shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    background: project.color || '#2563EB',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    borderRadius: 8,
                    fontFamily: "'Sora', sans-serif",
                  }}
                >
                  {project.key.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }} className="truncate">
                    {project.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{project.key}</div>
                </div>
              </div>
              {project.description && (
                <p
                  className="line-clamp-2"
                  style={{ fontSize: 12, color: '#64748B', marginBottom: 12, lineHeight: '18px' }}
                >
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-auto">
                <span
                  className="rounded-full"
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '2px 8px',
                    background: project.status === 'active' ? '#F0FDF4' : '#F1F5F9',
                    color: project.status === 'active' ? '#16A34A' : '#64748B',
                  }}
                >
                  {project.status}
                </span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>{project.department}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
