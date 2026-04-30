/**
 * NotificationsPage — Phase 2b admin v2 entry point for notification triggers.
 *
 * The legacy NotificationTriggers.tsx surface is a comprehensive
 * trigger / scheme / channel CRUD that already does most of what v2
 * needs. Rather than fork ~1200 lines into the v2 conventions, this
 * page renders the legacy component inside admin v2 chrome and routes
 * it under /admin/v2/work-items/notifications so users stay in the v2
 * IA when they click "Notifications" in the side nav.
 *
 * The legacy hooks (useNotificationTriggers, useNotificationSchemes)
 * already wrap supabase mutations in @tanstack/react-query, so toggle
 * / update / scheme-import flows continue to work. They do NOT route
 * through useAdminMutation, so they aren't captured in the
 * admin_action_audit table — when the legacy page is fully redesigned
 * in a future phase, the writes will move to useAdminMutation and
 * audit coverage closes.
 */
import { Suspense, lazy } from 'react';
import { Heading, SectionMessage, Spinner } from '@/components/ads';

const LegacyNotificationTriggers = lazy(
  () => import('@/pages/admin/NotificationTriggers'),
);

export default function NotificationsPage() {
  return (
    <div
      data-testid="admin-v2/notifications/page"
      style={{ padding: 'var(--ds-space-400, 24px)', maxWidth: 1280 }}
    >
      <div style={{ marginBottom: 'var(--ds-space-300, 16px)' }}>
        <Heading as="h1" size="large">
          Notifications
        </Heading>
        <p
          style={{
            margin: 'var(--ds-space-100, 8px) 0 0',
            color: 'var(--ds-text-subtle, #44546F)',
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: 720,
          }}
        >
          Configure which CRUD events trigger notifications, who receives
          them, and through which channels. Benchmarked against Jira&apos;s
          notification scheme surface.
        </p>
      </div>

      <div style={{ marginBottom: 'var(--ds-space-300, 16px)' }}>
        <SectionMessage appearance="information" title="Legacy surface embedded">
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            This page renders the live notification triggers surface inside
            admin v2 chrome. Mutations route through the existing trigger
            hooks &mdash; not <code>useAdminMutation</code> &mdash; so they
            won&apos;t appear in the v2 audit log until a follow-up phase
            redesigns the surface end-to-end.
          </p>
        </SectionMessage>
      </div>

      <Suspense
        fallback={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--ds-space-600, 48px)',
            }}
          >
            <Spinner size="medium" />
          </div>
        }
      >
        <LegacyNotificationTriggers />
      </Suspense>
    </div>
  );
}
