import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/standard-button';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { useDefects, useCreateDefect } from '@/hooks/test-management/useDefects';
import { useProjects } from '@/hooks/test-management/useProjects';
import { DefectSeverity, DefectStatus } from '@/types/test-management';

// ─── Severity → Lozenge appearance mapping ───────────────────────────────────
function severityAppearance(severity: DefectSeverity): 'removed' | 'moved' | 'default' {
  if (severity === 'CRITICAL') return 'removed';
  if (severity === 'MAJOR') return 'moved';
  return 'default';
}

function severityLabel(severity: DefectSeverity): string {
  const map: Record<DefectSeverity, string> = {
    CRITICAL: 'Critical',
    MAJOR: 'Major',
    MINOR: 'Minor',
    TRIVIAL: 'Trivial',
  };
  return map[severity] ?? severity;
}

// ─── Status → Lozenge appearance mapping ─────────────────────────────────────
function statusAppearance(
  status: DefectStatus
): 'default' | 'inprogress' | 'success' {
  if (status === 'IN_PROGRESS') return 'inprogress';
  if (status === 'FIXED' || status === 'VERIFIED') return 'success';
  return 'default';
}

function statusLabel(status: DefectStatus): string {
  const map: Record<DefectStatus, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In progress',
    FIXED: 'Fixed',
    VERIFIED: 'Verified',
    CLOSED: 'Closed',
    WONT_FIX: "Won't fix",
    DUPLICATE: 'Duplicate',
  };
  return map[status] ?? status;
}

// ─── Column header ────────────────────────────────────────────────────────────
function ColHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 'var(--ds-font-size-200)',
        fontWeight: 653,
        color: 'var(--ds-text-subtlest)',
        padding: '8px 0',
        borderBottom: '1px solid var(--ds-border)',
        userSelect: 'none',
      }}
    >
      {children}
    </div>
  );
}

// ─── Cell ─────────────────────────────────────────────────────────────────────
function Cell({
  children,
  mono,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        fontSize: 'var(--ds-font-size-400)',
        color: 'var(--ds-text)',
        padding: '10px 0',
        borderBottom: '1px solid var(--ds-border-subtle)',
        fontFamily: mono ? 'var(--ds-font-family-code, monospace)' : undefined,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {children ?? '—'}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DefectsPage() {
  const { projectKey = 'BAU' } = useParams<{ projectKey: string }>();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const projectId = projects[0]?.id ?? undefined;

  const {
    data,
    isLoading: defectsLoading,
  } = useDefects(projectId, undefined, 1, 50);

  const defects = data?.data ?? [];

  const createDefect = useCreateDefect();

  // Inline create form state
  const [showCreate, setShowCreate] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formSeverity, setFormSeverity] = useState<DefectSeverity>('MINOR');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isLoading = projectsLoading || defectsLoading;

  function resetForm() {
    setFormTitle('');
    setFormSeverity('MINOR');
    setFormDescription('');
    setFormError(null);
    setShowCreate(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!projectId) {
      setFormError('No project available.');
      return;
    }
    setFormError(null);

    createDefect.mutate(
      {
        title: formTitle.trim(),
        severity: formSeverity,
        description: formDescription.trim() || undefined,
        project_id: projectId,
      },
      { onSuccess: resetForm }
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'var(--ds-font-family-body)',
        background: 'var(--ds-surface)',
        paddingTop: 16,
      }}
    >
      <ProjectPageHeader
        hubType="test"
        actions={
          <Button
            appearance="primary"
            onClick={() => setShowCreate((v) => !v)}
          >
            Report defect
          </Button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        {/* ── Inline create form ──────────────────────────────────────── */}
        {showCreate && (
          <form
            onSubmit={handleSubmit}
            style={{
              marginBottom: 16,
              padding: 16,
              background: 'var(--ds-surface-sunken)',
              border: '1px solid var(--ds-border)',
              borderRadius: 4,
            }}
          >
            <div
              style={{
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: 600,
                color: 'var(--ds-text)',
                marginBottom: 12,
              }}
            >
              Report defect
            </div>

            {/* Title */}
            <div style={{ marginBottom: 12 }}>
              <label
                htmlFor="defect-title"
                style={{
                  display: 'block',
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 600,
                  color: 'var(--ds-text-subtle)',
                  marginBottom: 4,
                }}
              >
                Title <span style={{ color: 'var(--ds-text-danger)' }}>*</span>
              </label>
              <input
                id="defect-title"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Short description of the defect"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 10px',
                  fontSize: 'var(--ds-font-size-400)',
                  fontFamily: 'var(--ds-font-family-body)',
                  color: 'var(--ds-text)',
                  background: 'var(--ds-surface)',
                  border: '2px solid var(--ds-border)',
                  borderRadius: 3,
                  outline: 'none',
                }}
              />
            </div>

            {/* Severity */}
            <div style={{ marginBottom: 12 }}>
              <label
                htmlFor="defect-severity"
                style={{
                  display: 'block',
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 600,
                  color: 'var(--ds-text-subtle)',
                  marginBottom: 4,
                }}
              >
                Severity
              </label>
              <select
                id="defect-severity"
                value={formSeverity}
                onChange={(e) =>
                  setFormSeverity(e.target.value as DefectSeverity)
                }
                style={{
                  padding: '8px 10px',
                  fontSize: 'var(--ds-font-size-400)',
                  fontFamily: 'var(--ds-font-family-body)',
                  color: 'var(--ds-text)',
                  background: 'var(--ds-surface)',
                  border: '2px solid var(--ds-border)',
                  borderRadius: 3,
                  outline: 'none',
                  cursor: 'pointer',
                  minWidth: 160,
                }}
              >
                <option value="CRITICAL">Critical</option>
                <option value="MAJOR">Major</option>
                <option value="MINOR">Minor</option>
                <option value="TRIVIAL">Trivial</option>
              </select>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 12 }}>
              <label
                htmlFor="defect-description"
                style={{
                  display: 'block',
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 600,
                  color: 'var(--ds-text-subtle)',
                  marginBottom: 4,
                }}
              >
                Description
              </label>
              <textarea
                id="defect-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Steps to reproduce, expected vs actual behaviour…"
                rows={4}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 10px',
                  fontSize: 'var(--ds-font-size-400)',
                  fontFamily: 'var(--ds-font-family-body)',
                  color: 'var(--ds-text)',
                  background: 'var(--ds-surface)',
                  border: '2px solid var(--ds-border)',
                  borderRadius: 3,
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {formError && (
              <div
                style={{
                  marginBottom: 12,
                  fontSize: 'var(--ds-font-size-200)',
                  color: 'var(--ds-text-danger)',
                }}
              >
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                type="submit"
                appearance="primary"
                isLoading={createDefect.isPending}
              >
                Save defect
              </Button>
              <Button appearance="subtle" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 48,
            }}
          >
            <Spinner size="large" />
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {!isLoading && defects.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 24px',
              color: 'var(--ds-text-subtlest)',
            }}
          >
            <div style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 500, marginBottom: 8 }}>
              No defects found
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-400)', marginBottom: 16 }}>
              Defects are tracked here when they are reported during test execution.
            </div>
            <Button appearance="primary" onClick={() => setShowCreate(true)}>
              Report the first defect
            </Button>
          </div>
        )}

        {/* ── Defects grid ─────────────────────────────────────────────── */}
        {!isLoading && defects.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 110px 110px 160px 160px 140px 120px',
              columnGap: 16,
            }}
            role="table"
            aria-label="Defects"
          >
            {/* Header row */}
            <ColHeader>Key</ColHeader>
            <ColHeader>Title</ColHeader>
            <ColHeader>Severity</ColHeader>
            <ColHeader>Status</ColHeader>
            <ColHeader>Linked test run</ColHeader>
            <ColHeader>Assigned to</ColHeader>
            <ColHeader>Sprint</ColHeader>
            <ColHeader>Created</ColHeader>

            {/* Data rows */}
            {defects.map((defect) => {
              const createdDate = defect.created_at
                ? new Date(defect.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : null;

              return (
                <React.Fragment key={defect.id}>
                  <Cell mono>
                    {defect.jira_key ?? defect.key ?? '—'}
                  </Cell>
                  <Cell>
                    <span
                      style={{
                        fontWeight: 500,
                        color: 'var(--ds-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {defect.title ?? '—'}
                    </span>
                  </Cell>
                  <Cell>
                    {defect.severity ? (
                      <Lozenge appearance={severityAppearance(defect.severity)}>
                        {severityLabel(defect.severity)}
                      </Lozenge>
                    ) : (
                      '—'
                    )}
                  </Cell>
                  <Cell>
                    {defect.status ? (
                      <Lozenge appearance={statusAppearance(defect.status)}>
                        {statusLabel(defect.status)}
                      </Lozenge>
                    ) : (
                      '—'
                    )}
                  </Cell>
                  <Cell>
                    {defect.run_id ? (
                      <span
                        style={{
                          fontSize: 'var(--ds-font-size-200)',
                          color: 'var(--ds-link)',
                        }}
                      >
                        Run linked
                      </span>
                    ) : (
                      '—'
                    )}
                  </Cell>
                  <Cell>
                    {defect.assignee?.full_name ??
                      defect.jira_assignee_name ??
                      '—'}
                  </Cell>
                  <Cell>
                    <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
                      {(defect as any).sprint?.name ?? '—'}
                    </span>
                  </Cell>
                  <Cell>{createdDate ?? '—'}</Cell>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
