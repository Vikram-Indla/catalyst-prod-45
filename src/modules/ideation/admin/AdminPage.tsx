/**
 * Ideation · Admin — /admin/ideation.
 *
 * Phase 3 S3: real read views of the active scoring model + drivers and the
 * ideation role-permission matrix (04 §C.9's Scoring + Roles rows only).
 * Workflow/Intake/AI/Retention stay out of scope — see
 * 03_PLAN_LOCK_PHASE3_S3_ADMIN.md (none are backed by a real config table
 * yet; building toggles for them would be fabricated UI over nothing).
 */
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { JiraTable, type Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge/StatusLozenge';
import {
  useIdeationActiveScoringModel,
  useIdeationRoleMatrix,
  type RolePermissionRow,
} from '@/hooks/useIdeationAdmin';

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        font: '600 12px/16px var(--ds-font-family-body, "Atlassian Sans")',
        color: token('color.text.subtle', 'var(--ds-text-subtle)'),
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        margin: '32px 16px 12px',
      }}
    >
      {children}
    </div>
  );
}

const ACCESS_APPEARANCE: Record<RolePermissionRow['access_level'], 'success' | 'inprogress' | 'default'> = {
  full: 'success',
  view: 'inprogress',
  hidden: 'default',
};

function ScoringSection() {
  const { data: model, isLoading } = useIdeationActiveScoringModel();

  if (isLoading) {
    return (
      <div style={{ padding: '0 16px' }}>
        <Spinner size="small" />
      </div>
    );
  }

  if (!model) {
    return (
      <div style={{ padding: '0 16px' }}>
        <EmptyState
          header="No active scoring model"
          description="No scoring model has been approved yet. Ideas won't compute a score total until one is active."
          testId="ideation-admin-no-scoring-model"
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          font: '600 16px/22px var(--ds-font-family-body, "Atlassian Sans")',
          color: token('color.text', 'var(--ds-text)'),
        }}
      >
        {model.name} v{model.version}
        <StatusLozenge status={model.status} appearance="success" />
      </div>
      <table style={{ width: '100%', maxWidth: 560, borderCollapse: 'collapse' }} data-testid="ideation-admin-scoring-drivers">
        <thead>
          <tr>
            {['Driver', 'Weight', 'Scale', 'Direction'].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                  font: '600 12px/16px var(--ds-font-family-body, "Atlassian Sans")',
                  color: token('color.text.subtle', 'var(--ds-text-subtle)'),
                  textTransform: 'uppercase',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.drivers.map((d) => (
            <tr key={d.id}>
              <td style={{ padding: '10px 12px', borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`, color: token('color.text', 'var(--ds-text)') }}>
                {d.label_en}
              </td>
              <td style={{ padding: '10px 12px', borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`, color: token('color.text', 'var(--ds-text)') }}>
                {d.weight}
              </td>
              <td style={{ padding: '10px 12px', borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`, color: token('color.text', 'var(--ds-text)') }}>
                {d.scale_min}–{d.scale_max}
              </td>
              <td style={{ padding: '10px 12px', borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`, color: token('color.text', 'var(--ds-text)') }}>
                {d.direction === 'higher_better' ? 'Higher is better' : 'Lower is better'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RolesSection() {
  const { data: rows, isLoading } = useIdeationRoleMatrix();

  const columns: Column<RolePermissionRow>[] = [
    {
      id: 'role_code',
      label: 'Role',
      width: 50,
      cell: ({ row }) => (
        <span style={{ color: token('color.text', 'var(--ds-text)') }}>{row.role_code.replace(/_/g, ' ')}</span>
      ),
    },
    {
      id: 'access_level',
      label: 'Access',
      width: 20,
      cell: ({ row }) => (
        <StatusLozenge status={row.access_level} appearance={ACCESS_APPEARANCE[row.access_level]} />
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ padding: '0 16px' }}>
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 16px' }} data-testid="ideation-admin-role-matrix">
      <JiraTable columns={columns} data={rows ?? []} getRowId={(r) => r.role_code} density="comfortable" showRowCount />
    </div>
  );
}

export default function AdminPage() {
  return (
    <div data-testid="ideation-admin-page">
      <HubPageHeader title="Ideation administration" />
      <SectionHeader>Scoring model</SectionHeader>
      <ScoringSection />
      <SectionHeader>Roles</SectionHeader>
      <RolesSection />
    </div>
  );
}
