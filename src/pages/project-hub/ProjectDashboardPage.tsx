import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight } from 'lucide-react';
import { ProjectHeaderCard } from '@/components/project-hub/dashboard/ProjectHeaderCard';
import { WidgetGrid } from '@/components/project-hub/dashboard/WidgetGrid';
import { SkeletonWidgetGrid } from '@/components/project-hub/shared/SkeletonPulse';
import { LiveAIInsightsCard } from '@/components/project-hub/dashboard/LiveAIInsightsCard';
import { AIInsightsCard } from '@/components/project-hub/dashboard/AIInsightsCard';
import '@/components/project-hub/shared/phStyles.css';

export default function ProjectDashboardPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [showInsights, setShowInsights] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-dashboard', key],
    queryFn: async () => {
      if (!key) return null;
      const { data, error } = await supabase
        .from('ph_projects')
        .select('*')
        .eq('key', key.toUpperCase())
        .maybeSingle();
      if (error) { console.warn(error.message); return null; }
      return data;
    },
    enabled: !!key,
  });

  const name = project?.name || key?.toUpperCase() || 'Project';
  const color = project?.color || '#2563EB';
  const pKey = project?.key || key?.toUpperCase() || '';

  return (
    <div className="ph-content-wrapper" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="ph-inner-content">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-5">
          <span className="cursor-pointer hover:underline" style={{ fontSize: 13, color: '#64748B' }} onClick={() => navigate('/project-hub/projects')}>
            ProjectHub
          </span>
          <ChevronRight size={12} color="#94A3B8" />
          <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>
            {pKey} — {name}
          </span>
        </div>

        {isLoading ? (
          <>
            <div className="ph-skeleton rounded-lg" style={{ height: 160, marginBottom: 20 }} />
            <SkeletonWidgetGrid />
          </>
        ) : (
          <>
            <ProjectHeaderCard
              name={name}
              icon={project?.icon || 'rocket'}
              color={color}
              projectKey={pKey}
              status={project?.status || 'active'}
              health={project?.health || 'green'}
              memberCount={5}
              dateRange="Jan 15 – Mar 30, 2026"
              progress={67}
              doneCount={30}
              totalCount={45}
              estCompletion="Mar 15"
              starred={false}
              onSettings={() => navigate(`/project-hub/${key}/settings`)}
            />

            {/* Intelligence button toolbar */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setShowInsights(!showInsights)}
                className="inline-flex items-center gap-2 transition-all"
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: showInsights ? '1.5px solid #8B5CF6' : '1px solid #E2E8F0',
                  background: showInsights ? '#F5F3FF' : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: showInsights ? '#6D28D9' : '#334155',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                  }}
                >
                  <span style={{ color: '#FFFFFF', fontSize: 13, lineHeight: 1 }}>✦</span>
                </span>
                Intelligence
              </button>
            </div>

            {showInsights && (
              <div className="mt-4">
                {project?.id ? <LiveAIInsightsCard projectId={project.id} /> : <AIInsightsCard />}
              </div>
            )}

            <div className="mt-5">
              <WidgetGrid projectId={project?.id} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
