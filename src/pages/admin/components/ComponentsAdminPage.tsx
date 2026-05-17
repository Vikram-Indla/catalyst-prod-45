/**
 * ComponentsAdminPage — /admin/components (v1 scaffold, 2026-05-17).
 *
 * Read-only inventory + spec + usage map for every component currently
 * rendered in Catalyst. Powered by `src/registry/components.registry.ts`
 * (single source of truth) and `src/registry/usage-map.generated.ts`
 * (AST-derived consumer map).
 *
 * Council mandate (preflight 2026-05-17):
 *   - AdminGuard wrap (CLAUDE.md 2026-05-10)
 *   - Sits inside admin content area, NOT a parallel sidebar
 *     (CLAUDE.md 2026-05-12 P0)
 *   - All interactive elements @atlaskit/* (CLAUDE.md 2026-05-10)
 *   - All colors via ADS tokens / var(--ds-*) (CLAUDE.md 2026-05-04)
 *   - Zero new Supabase tables in v1 (schema-probe gate, 2026-05-10)
 *
 * Subsequent steps wire in the registry, tabs (Inventory / Banned /
 * Violations / Roadmap), side-navigation, spec card, live preview, and
 * cascade-impact view.
 */
import Heading from '@atlaskit/heading';
import { token } from '@atlaskit/tokens';
import { AdminGuard } from '@/components/admin/AdminGuard';

export default function ComponentsAdminPage() {
  return (
    <AdminGuard>
      <div
        style={{
          padding: '24px 32px',
          maxWidth: 1280,
          margin: '0 auto',
          color: token('color.text', '#172B4D'),
        }}
      >
        <Heading size="xlarge">Components</Heading>
        <p
          style={{
            marginTop: token('space.100', '8px'),
            marginBottom: token('space.300', '24px'),
            color: token('color.text.subtle', '#44546F'),
            fontSize: 14,
            lineHeight: '20px',
          }}
        >
          Catalyst's component library, built on the Atlassian Design System.
          Browse every primitive currently rendered in Catalyst, see its consumers,
          and review cascade impact before changing a canonical component.
        </p>
        <div
          style={{
            border: `1px solid ${token('color.border', '#DCDFE4')}`,
            borderRadius: 6,
            padding: token('space.300', '24px'),
            background: token('color.background.neutral.subtle', '#F7F8F9'),
            color: token('color.text.subtle', '#44546F'),
            fontSize: 13,
          }}
        >
          Inventory, spec, live preview, ADS violations, banned registry, and
          cascade-impact view land in subsequent steps. This scaffold confirms
          AdminGuard wrap, route registration, and Design system pocket placement.
        </div>
      </div>
    </AdminGuard>
  );
}
