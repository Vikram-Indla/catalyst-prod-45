/**
 * ProjectDashboard V4 — Overhauled widget-based dashboard
 * 11 configurable, collapsible widgets with persistence
 */
import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Plus, LayoutGrid, RotateCcw } from 'lucide-react';

import DashboardWidgetGrid, { useDashboardWidgetConfig } from '@/components/project-hub/dashboard/DashboardWidgetGrid';
import WidgetGalleryModal from '@/components/project-hub/dashboard/WidgetGalleryModal';

export default function ProjectDashboardPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [galleryOpen, setGalleryOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-dashboard-v4', key],
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

  const projectId = (project as any)?.id ?? null;
  const pKey = (project as any)?.key || key?.toUpperCase() || '';

  const { widgets, visibleCount, toggleVisibility, resetToDefaults } = useDashboardWidgetConfig(projectId ?? 'none');

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: 'var(--cp-bg)', minHeight: '100%' }}>
      <div style={{ padding: '12px 16px' }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-3">
          <span
            className="cursor-pointer hover:underline"
            style={{ fontSize: 13, color: 'var(--cp-t3)', fontWeight: 500 }}
            onClick={() => navigate('/project-hub/projects')}
          >
            ProjectHub
          </span>
          <ChevronRight size={12} style={{ color: 'var(--cp-t4)' }} />
          <span style={{ fontSize: 13, color: 'var(--cp-t3)', fontWeight: 500 }}>{pKey}</span>
          <ChevronRight size={12} style={{ color: 'var(--cp-t4)' }} />
          <span style={{ fontSize: 13, color: 'var(--cp-t1)', fontWeight: 700 }}>Dashboard</span>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-12 rounded-lg" style={{ background: 'var(--cp-bg-sunken)' }} />
            <div className="grid grid-cols-3 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-lg" style={{ background: 'var(--cp-bg-sunken)' }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Management Bar */}
            <div
              className="flex items-center justify-between flex-wrap gap-3 mb-3 px-1"
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 650, color: 'var(--cp-t1)', fontFamily: "'Sora', sans-serif" }}>
                  Dashboard
                </div>
                <div style={{ fontSize: 11, color: 'var(--cp-t3)', marginTop: 1 }}>
                  Showing {visibleCount} of 11 widgets
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGalleryOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors"
                  style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--cp-t2)',
                    background: 'transparent', border: '1px solid var(--cp-bd)',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={13} />
                  Add Widget
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors"
                  style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--cp-t2)',
                    background: 'transparent', border: '1px solid var(--cp-bd)',
                    cursor: 'pointer',
                  }}
                >
                  <LayoutGrid size={13} />
                  Edit Layout
                </button>
                <button
                  onClick={resetToDefaults}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors"
                  style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--cp-t3)',
                    background: 'transparent', border: '1px solid var(--cp-bd)',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={13} />
                  Reset
                </button>
              </div>
            </div>

            {/* Widget Grid */}
            {projectId && (
              <DashboardWidgetGrid projectId={projectId} projectKey={pKey} />
            )}
          </>
        )}
      </div>

      {/* Widget Gallery Modal */}
      <WidgetGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        widgets={widgets}
        onToggleVisibility={toggleVisibility}
        onReset={resetToDefaults}
      />
    </div>
  );
}
