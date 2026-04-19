/**
 * AtlaskitPageShell — canonical outer page surface for Atlaskit-migrated hubs.
 *
 * Why this exists
 * ───────────────
 * Every migrated hub surface needs the same outer shell. Without a shared
 * wrapper each migration invented its own — the BacklogPage and
 * ProjectDashboardPage diverged within one sprint. See the consistency
 * critique in `docs/design/BAU-Dashboard-Atlaskit-Conversion.md` (follow-up
 * addendum).
 *
 * Pattern derived from `BacklogPage.atlaskit.tsx:1085-1124` (pre-V3 chrome
 * had a Jira-blue page wash; V3 flattened to a single white canvas — see
 * the hubPage token docstring in src/theme/ads/tokens.ts).
 *
 * Chrome (locked)
 * ───────────────
 *   Outer wrapper
 *     - background: --cp-bg-hub-page (#FFFFFF light / #0A0A0A dark).
 *                   V3 white — flattened Apr 19, 2026 (see token docstring).
 *                   Pre-V3 was Jira-blue #E9F2FE.
 *     - padding:    8px (preserved from pre-V3 even though it's now
 *                   invisible white-on-white — keeps the inner rounded
 *                   card's corners off the page edges and makes it cheap
 *                   to A/B a tinted outer bg again if we need to).
 *     - font:       "Atlassian Sans" base stack
 *     - flex column, minHeight 100%
 *
 *   Inner content card
 *     - background: elevation.surface (#FFFFFF light / #1A1A1A dark)
 *     - borderRadius: 8px
 *     - overflow: hidden
 *     - flex: 1 — fills the outer wrapper
 *
 *   Header row (if `title` or `actions`)
 *     - padding: 16px 16px 4px
 *     - h1:      Atlassian Sans 20/600/-0.003em — matches Jira list-view
 *     - actions: inline row on the right, 8px gap
 *
 * Deliberate omissions
 * ────────────────────
 * - No breadcrumb slot. The top nav chrome already shows location; the
 *   backlog migration decided breadcrumb was redundant (see comment at
 *   BacklogPage.atlaskit.tsx:1115-1119) and we align dashboard to match.
 * - No fixed-height title wrapper. BacklogPage's h1 is inline, not in a
 *   52px chrome — we preserve that vertical rhythm.
 *
 * Usage
 * ─────
 *   <AtlaskitPageShell title="Dashboard" actions={<><AddWidget/><Reset/></>}>
 *     <DashboardWidgetGrid />
 *   </AtlaskitPageShell>
 *
 *   <AtlaskitPageShell title="Backlog">
 *     <TypeChips /> <Toolbar /> <Table /> <DetailPanel />
 *   </AtlaskitPageShell>
 */
import { type ReactNode } from 'react';
import { token } from '@atlaskit/tokens';
import { adsTokens, cp } from '@/theme/ads/tokens';
import { forwardTestId } from './internal/forwardTestId';

/**
 * ATLASSIAN_SANS_STACK — canonical font family for migrated hub surfaces.
 * Declared once here so every shell consumer inherits the same stack; kept
 * out of the style object below so we don't repeat the string in callers.
 */
const ATLASSIAN_SANS_STACK =
  '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif';

export interface AtlaskitPageShellProps {
  /**
   * Page title — rendered as <h1> inside the nested white card.
   * Atlassian Sans 20/600/-0.003em (Jira list-view canonical).
   * Omit to render a shell without a title row (rare — prefer passing a
   * title so the surface stays diagnosable in Playwright).
   */
  title?: ReactNode;
  /**
   * Optional actions rendered on the right side of the title row.
   * Pass ADS `<Button appearance="subtle" spacing="compact">` instances —
   * the shell applies 8px gap between siblings.
   */
  actions?: ReactNode;
  /** Main surface content — filters, tables, widget grids, etc. */
  children: ReactNode;
  /** Test selector forwarded to the outer wrapper. */
  testId?: string;
}

export function AtlaskitPageShell({
  title,
  actions,
  children,
  testId,
}: AtlaskitPageShellProps) {
  const hasHeaderRow = title != null || actions != null;

  return (
    <div
      {...forwardTestId(testId)}
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: ATLASSIAN_SANS_STACK,
        background: cp(adsTokens.bg.hubPage),
        padding: 8,
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          background: cp(adsTokens.bg.surface),
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {hasHeaderRow && (
          <div
            style={{
              padding: '16px 16px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            {title != null && (
              <h1
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: '-0.003em',
                  color: token('color.text'),
                }}
              >
                {title}
              </h1>
            )}
            {actions != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {actions}
              </div>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
