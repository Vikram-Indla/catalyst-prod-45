/**
 * ScreensPage — placeholder for Phase 2c.
 *
 * "Screens" in Jira parlance are the field layouts shown for an issue
 * type — which fields appear, in which order, on Create/View/Edit. The
 * Catalyst implementation is greenfield: no `ph_screens` or
 * `ph_screen_field_layouts` tables exist yet, and the field layout is
 * currently hardcoded in CatalystKeyDetails per issue type.
 *
 * This page reserves the URL and the side-nav slot so the IA is visible
 * end-to-end. Once the schema lands in Phase 2c the placeholder gets
 * replaced with a real CRUD page.
 */
import { EmptyState, Heading, SectionMessage } from '@/components/ads';

export default function ScreensPage() {
  return (
    <div
      data-testid="admin-v2/screens/page"
      style={{ padding: 'var(--ds-space-400, 24px)', maxWidth: 1280 }}
    >
      <div style={{ marginBottom: 'var(--ds-space-300, 16px)' }}>
        <Heading as="h1" size="large">
          Screens
        </Heading>
        <p
          style={{
            margin: 'var(--ds-space-100, 8px) 0 0',
            color: 'var(--ds-text-subtle, #44546F)',
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: 640,
          }}
        >
          Screens define which fields appear on each issue type, and in
          what order, for the Create / View / Edit surfaces.
        </p>
      </div>

      <div style={{ marginBottom: 'var(--ds-space-300, 16px)' }}>
        <SectionMessage appearance="discovery" title="Phase 2c — coming soon">
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Screen layouts are currently hardcoded per issue type in{' '}
            <code>CatalystKeyDetails</code>. This page reserves the URL and
            nav slot. Phase 2c will introduce the <code>ph_screens</code> +{' '}
            <code>ph_screen_field_layouts</code> tables along with a real
            CRUD surface here.
          </p>
        </SectionMessage>
      </div>

      <EmptyState
        header="Nothing to configure yet"
        description="Once the schema migration ships, you'll be able to design and apply screen layouts to each issue type from this page."
      />
    </div>
  );
}
