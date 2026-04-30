/**
 * AdminV2OverviewPage — landing card for /admin/v2.
 *
 * Phase 0. The shell (AdminV2Shell) gates on `useAdminV2Flag('admin_v2_enabled')`
 * and renders this overview at the index route. It exists primarily to
 * orient first-visit admins and link them into the live sections.
 */
import { Heading, SectionMessage } from '@/components/ads';

export default function AdminV2OverviewPage() {
  return (
    <div
      data-testid="admin-v2/overview/page"
      style={{
        padding: 'var(--ds-space-400, 24px)',
        maxWidth: 880,
      }}
    >
      <div style={{ marginBottom: 'var(--ds-space-200, 12px)' }}>
        <Heading as="h1" size="large">
          Catalyst admin
        </Heading>
      </div>

      <p
        style={{
          margin: '0 0 var(--ds-space-400, 24px)',
          color: 'var(--ds-text-subtle, #44546F)',
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        Catalyst admin v2 — re-architected to mirror Jira&apos;s admin information
        architecture. System, Work items, Spaces, Users, and Apps live in the
        side nav. Every change you make here is captured in the Audit log.
      </p>

      <SectionMessage appearance="information" title="Phase 0 — foundation">
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Most sections are dark-launched while their content is migrated. The
          Audit log is live; under <strong>Work items</strong>, Custom fields,
          Statuses, and Work types are functional. Everything else is coming.
        </p>
      </SectionMessage>
    </div>
  );
}
