/**
 * ProjectDashboard V4 — 11 widget dashboard with V12 Hybrid Precision tokens
 */
import { useState } from 'react';
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
      const upper = key.toUpperCase();
      // Try ph_projects first
      const { data: d1 } = await supabase.from('ph_projects').select('*').eq('key', upper).maybeSingle();
      if (d1) return d1;
      // Fall back to projects table (backlog pages use this)
      const { data: d2 } = await supabase.from('projects').select('*').eq('key', upper).maybeSingle();
      if (d2) return d2;
      // Last resort: try case-insensitive on projects
      const { data: d3 } = await supabase.from('projects').select('*').ilike('key', upper).maybeSingle();
      return d3 ?? null;
    },
    enabled: !!key,
  });

  const projectId = (project as any)?.id ?? null;
  const pKey = (project as any)?.key || key?.toUpperCase() || '';

  const { widgets, visibleCount, toggleVisibility, resetToDefaults } = useDashboardWidgetConfig(projectId ?? 'none');

  const btnStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--cp-text-secondary)',
    background: 'transparent', border: '0.75px solid var(--cp-border-default)',
    cursor: 'pointer', borderRadius: 'var(--cp-radius-default)',
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
    transition: 'all 120ms ease',
  };

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', background: 'var(--cp-bg-page)', minHeight: '100%' }}>
      <div style={{ padding: '16px 20px' }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-3">
          <span
            className="cursor-pointer hover:underline"
            style={{ fontSize: 13, color: 'var(--cp-text-tertiary)', fontWeight: 500 }}
            onClick={() => navigate('/project-hub/projects')}
          >
            ProjectHub
          </span>
          <ChevronRight size={12} style={{ color: 'var(--cp-text-muted)' }} />
          <span style={{ fontSize: 13, color: 'var(--cp-text-tertiary)', fontWeight: 500 }}>{pKey}</span>
          <ChevronRight size={12} style={{ color: 'var(--cp-text-muted)' }} />
          <span style={{ fontSize: 13, color: 'var(--cp-text-primary)', fontWeight: 650 }}>Dashboard</span>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-12 rounded-lg" style={{ background: 'var(--cp-bg-sunken)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-lg" style={{ background: 'var(--cp-bg-sunken)' }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Management Bar */}
            <CatalystPageHeader
              title="Dashboard"
              actions={
                <div className="flex items-center gap-2">
                  <button onClick={() => setGalleryOpen(true)} style={btnStyle}>
                    <Plus size={13} />
                    Add Widget
                  </button>
                  <button style={btnStyle}>
                    <LayoutGrid size={13} />
                    Edit Layout
                  </button>
                  <button onClick={resetToDefaults} style={{ ...btnStyle, color: 'var(--cp-text-tertiary)' }}>
                    <RotateCcw size={13} />
                    Reset
                  </button>
                </div>
              }
            />

            {/* Widget Grid — always render; hooks gracefully handle missing projectId */}
            <DashboardWidgetGrid projectId={projectId || pKey} projectKey={pKey} />
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
