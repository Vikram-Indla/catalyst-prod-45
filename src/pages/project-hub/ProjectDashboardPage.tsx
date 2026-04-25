// @ts-nocheck
/**
 * ProjectDashboard V4 — 11 widget dashboard.
 *
 * Apr 19, 2026: Migrated to Atlaskit (ADS) wrappers per CLAUDE.md §1 protocol.
 *   - Breadcrumb → <Breadcrumbs> from @/components/ads
 *   - Toolbar buttons → <Button appearance="subtle"> from @/components/ads
 *   - Page shell → Atlaskit tokens via `token()` — no hex, no --cp-* inline
 *
 * Apr 19, 2026 (follow-up — Shell Unification):
 *   - Wrapped page in <AtlaskitPageShell>. Shell now owns:
 *       • Jira-blue page bg (#E9F2FE) via --cp-bg-hub-page
 *       • Inner white rounded card (#FFFFFF, r=8)
 *       • h1 + actions row inside the card (padding 16 16 4)
 *       • "Atlassian Sans" font stack at the page root
 *   - Breadcrumb REMOVED. Top nav chrome already shows location; backlog
 *     migration already dropped it (see BacklogPage.atlaskit.tsx:1115-1119).
 *     Keeping dashboard aligned prevents the two surfaces from drifting.
 *   - <CatalystPageHeader> replaced by the shell's title + actions slots —
 *     the 52px fixed chrome didn't sit well inside the nested card.
 *
 * Blueprint reference: docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 3
 * + follow-up shell unification (Apr 19, 2026).
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, LayoutGrid, RotateCcw } from 'lucide-react';
import { token } from '@atlaskit/tokens';

import { supabase } from '@/integrations/supabase/client';
import { AtlaskitPageShell, Button } from '@/components/ads';
import DashboardWidgetGrid, { useDashboardWidgetConfig } from '@/components/project-hub/dashboard/DashboardWidgetGrid';
import WidgetGalleryModal from '@/components/project-hub/dashboard/WidgetGalleryModal';
import DashboardDatePicker from '@/components/project-hub/dashboard/DashboardDatePicker';
import { DashboardFilterProvider } from '@/contexts/DashboardFilterContext';

export default function ProjectDashboardPage() {
  return (
    <DashboardFilterProvider>
      <ProjectDashboardPageInner />
    </DashboardFilterProvider>
  );
}

function ProjectDashboardPageInner() {
  const { key } = useParams<{ key: string }>();
  const [galleryOpen, setGalleryOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-dashboard-v4', key],
    queryFn: async () => {
      if (!key) return null;
      const upper = key.toUpperCase();
      const { data: d1 } = await supabase.from('ph_projects').select('*').eq('key', upper).maybeSingle();
      if (d1) return d1;
      const { data: d2 } = await supabase.from('projects').select('*').eq('key', upper).maybeSingle();
      if (d2) return d2;
      const { data: d3 } = await supabase.from('projects').select('*').ilike('key', upper).maybeSingle();
      return d3 ?? null;
    },
    enabled: !!key,
  });

  const projectId = (project as any)?.id ?? null;
  const pKey = (project as any)?.key || key?.toUpperCase() || '';

  const { widgets, toggleVisibility, resetToDefaults } = useDashboardWidgetConfig(projectId ?? 'none');

  const actions = (
    <>
      <Button
        appearance="subtle"
        spacing="compact"
        iconBefore={<Plus size={13} />}
        onClick={() => setGalleryOpen(true)}
        testId="dashboard-add-widget"
      >
        Add Widget
      </Button>
      <Button
        appearance="subtle"
        spacing="compact"
        iconBefore={<LayoutGrid size={13} />}
        testId="dashboard-edit-layout"
      >
        Edit Layout
      </Button>
      <Button
        appearance="subtle"
        spacing="compact"
        iconBefore={<RotateCcw size={13} />}
        onClick={resetToDefaults}
        testId="dashboard-reset-layout"
      >
        Reset
      </Button>
    </>
  );

  return (
    <AtlaskitPageShell
      title="Dashboard"
      actions={actions}
      testId="project-dashboard-shell"
    >
      {isLoading ? (
        /* Skeleton — rendered inside the shell's white card, so the
           shimmer fills the nested surface, not the outer blue page. */
        <div style={{ padding: '12px 16px 16px' }}>
          <div className="space-y-4 animate-pulse">
            <div
              className="h-12 rounded-lg"
              style={{ background: token('color.background.neutral.subtle', '#F1F5F9') }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 rounded-lg"
                  style={{ background: token('color.background.neutral.subtle', '#F1F5F9') }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Widget Grid — always render; hooks gracefully handle missing projectId.
           Horizontal padding matches the h1 row (16px); bottom padding gives the
           grid breathing room against the card's bottom edge. */
        <div style={{ padding: '12px 16px 16px' }}>
          <DashboardWidgetGrid projectId={projectId || pKey} projectKey={pKey} />
        </div>
      )}

      {/* Widget Gallery Modal — rendered inside the shell's white card, but
          Modal portals out so this placement doesn't affect the overlay. */}
      <WidgetGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        widgets={widgets}
        onToggleVisibility={toggleVisibility}
        onReset={resetToDefaults}
      />
    </AtlaskitPageShell>
  );
}
