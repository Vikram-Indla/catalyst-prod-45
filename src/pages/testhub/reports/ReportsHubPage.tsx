/**
 * ReportsHubPage — single Reports hub at /testhub/reports (S1.2).
 * Feature: CAT-REPORTS-HUB-20260703-001 (Phase 2 Lane B: all reports wired).
 *
 * Uses the Reports Lab shell as chassis: left ReportNavigator lists the
 * REPORT_REGISTRY grouped by category; selection is the :reportSlug URL param.
 * Every report renders a real-data Body (the seeded generator and its
 * demo-only KPI ribbon were removed in Lane B).
 */
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import EmptyState from '@atlaskit/empty-state';
import Button from '@atlaskit/button/standard-button';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import ReportNavigator from './lab/ReportNavigator';
import {
  REPORT_REGISTRY,
  REPORT_CATEGORY_ORDER,
  DEFAULT_REPORT_ID,
  getReportDefinition,
} from '@/components/testhub/reports/report-registry';
import ReportRenderer from '@/components/testhub/reports/ReportRenderer';
import SaveViewModal from '@/components/testhub/reports/SaveViewModal';
import {
  useDeleteReportView,
  useSavedReports,
  useSaveReportView,
} from '@/components/testhub/reports/hooks/useSavedReports';
import { REPORTS_LAST_PROJECT_KEY } from '@/components/testhub/reports/useReportPickerDefault';
import { useAuth } from '@/lib/auth';
import { Routes } from '@/lib/routes';

function readLastProject(): string | null {
  try {
    return window.localStorage.getItem(REPORTS_LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

export default function ReportsHubPage() {
  const navigate = useNavigate();
  const { reportSlug } = useParams<{ reportSlug: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Saved views (Phase 3 Task C)
  const [saveOpen, setSaveOpen] = useState(false);
  const { data: savedViews } = useSavedReports();
  const saveMutation = useSaveReportView();
  const deleteMutation = useDeleteReportView();

  if (!reportSlug) {
    return <Navigate to={Routes.testHub.report(DEFAULT_REPORT_ID)} replace />;
  }

  const def = getReportDefinition(reportSlug);

  const handleSave = (name: string, isShared: boolean) => {
    // Parameters: current URL deep-link params first, else the shared
    // last-used project. Nothing is fabricated — absent values stay absent.
    const projectId = searchParams.get('project') ?? readLastProject() ?? undefined;
    const range = searchParams.get('range') ?? undefined;
    saveMutation.mutate(
      {
        name,
        report_type: reportSlug,
        parameters: {
          ...(projectId ? { projectId } : {}),
          ...(range ? { range } : {}),
        },
        is_shared: isShared,
      },
      { onSuccess: () => setSaveOpen(false) },
    );
  };

  const handleOpenSaved = (id: string) => {
    const view = (savedViews ?? []).find((v) => v.id === id);
    if (!view) return;
    const qs = new URLSearchParams();
    if (view.parameters.projectId) qs.set('project', view.parameters.projectId);
    if (view.parameters.range) qs.set('range', view.parameters.range);
    const search = qs.toString();
    navigate(`${Routes.testHub.report(view.report_type)}${search ? `?${search}` : ''}`);
  };

  return (
    <div
      style={{
        fontFamily: 'var(--ds-font-family-body)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--ds-surface-sunken)',
      }}
    >
      <ProjectPageHeader
        hubType="test"
        title="Reports"
        trail={[
          { text: 'Test Hub', href: '/testhub/dashboard' },
          { text: 'Reports' },
        ]}
      />

      {/* main body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* left nav — registry entries grouped by category */}
        <ReportNavigator
          selected={reportSlug}
          onSelect={(slug) => navigate(Routes.testHub.report(slug))}
          entries={REPORT_REGISTRY.map((r) => ({
            slug: r.id,
            label: r.label,
            category: r.category,
            demo: r.status === 'demo',
          }))}
          categories={REPORT_CATEGORY_ORDER}
          saved={(savedViews ?? []).map((v) => ({
            id: v.id,
            name: v.name,
            shared: v.is_shared && v.owner_id !== user?.id,
            ownedByMe: v.owner_id === user?.id,
          }))}
          onSelectSaved={handleOpenSaved}
          onDeleteSaved={(id) => deleteMutation.mutate(id)}
        />

        {/* canvas area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {def ? (
            <>
              {/* canvas header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--ds-space-200)',
                  padding: 'var(--ds-space-150) var(--ds-space-250)',
                  background: 'var(--ds-surface)',
                  borderBottom: '1px solid var(--ds-border)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 'var(--ds-font-size-500)',
                      fontWeight: 700,
                      color: 'var(--ds-text)',
                      lineHeight: 1.2,
                    }}
                  >
                    {def.label}
                  </h1>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 'var(--ds-font-size-200)',
                      color: 'var(--ds-text-subtlest)',
                      lineHeight: 1.3,
                    }}
                  >
                    {def.description}
                  </p>
                </div>
                <Button appearance="default" onClick={() => setSaveOpen(true)}>
                  Save view
                </Button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--ds-surface)' }}>
                <ReportRenderer definition={def} />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ds-surface)' }}>
              <EmptyState
                header="Report not found"
                description={`No report named “${reportSlug}” exists. Pick a report from the list on the left.`}
              />
            </div>
          )}
        </div>
      </div>

      <SaveViewModal
        isOpen={saveOpen}
        reportLabel={def?.label ?? reportSlug}
        isSaving={saveMutation.isPending}
        error={saveMutation.error instanceof Error ? saveMutation.error : null}
        onSave={handleSave}
        onClose={() => {
          setSaveOpen(false);
          saveMutation.reset();
        }}
      />
    </div>
  );
}
