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
 *     - h1:      Atlassian Sans 20/653/-0.003em — matches Jira list-view's
 *                Atlaskit Heading semibold (Apr 27, 2026 audit found Jira
 *                resolves to fw=653 in DevTools, not 600).
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
   * Atlassian Sans 20/653/-0.003em (Jira list-view canonical).
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
  /**
   * Optional right-side rail (Apr 27, 2026 — L46). When provided, renders
   * a fixed-width column on the right side of the white card spanning the
   * full card height — alongside the H1 row, NOT below it. Mirrors Jira's
   * issue list+rail pattern where the rail starts at y=67 alongside the
   * "Senaei BAU" project header (probed 2026-04-27).
   *
   * Implementation: white card switches to flex-row when sideRail is
   * present. Left column scrolls/contains the H1 + main content. Right
   * column hosts the rail. Default width 400px (matches BacklogPage's
   * rail). Pass `sideRailWidth` to override.
   */
  sideRail?: ReactNode;
  /** Width of the side rail column. Default 400px (Jira parity). */
  sideRailWidth?: number;
  /** Test selector forwarded to the outer wrapper. */
  testId?: string;
}

export function AtlaskitPageShell({
  title,
  actions,
  children,
  sideRail,
  sideRailWidth = 400,
  testId,
}: AtlaskitPageShellProps) {
  const hasHeaderRow = title != null || actions != null;
  const hasSideRail = sideRail != null;

  // Header + children block. When sideRail is present this becomes the
  // LEFT column of a 2-column white card (Jira parity — rail extends to
  // the top of the page, alongside H1). Otherwise it's the whole card.
  const mainBlock = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
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
                // 653 = Atlaskit Heading semibold resolved weight in
                // Jira's Atlassian Sans theme (probed 2026-04-27 vs Jira
                // BAU list view). Was 600; bumped to match parity exactly.
                fontWeight: 653,
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
  );

  return (
    <div
      {...forwardTestId(testId)}
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: ATLASSIAN_SANS_STACK,
        background: cp(adsTokens.bg.hubPage),
        // Apr 27, 2026 (L48): when sideRail is present, drop the 8px
        // outer padding + inner border-radius so the rail touches the
        // global nav (y=56) flush — matches Jira's rail-meets-global-nav
        // pattern. Standalone (no sideRail) surfaces keep the rounded
        // padded card aesthetic for non-list pages.
        padding: hasSideRail ? 0 : 8,
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          // 2-column when sideRail is present, single-column otherwise.
          flexDirection: hasSideRail ? 'row' : 'column',
          flex: 1,
          minHeight: 0,
          background: cp(adsTokens.bg.surface),
          borderRadius: hasSideRail ? 0 : 8,
          overflow: 'hidden',
        }}
      >
        {mainBlock}
        {hasSideRail && (
          <div
            style={{
              width: sideRailWidth,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              borderLeft: '1px solid #DFE1E6',
              overflow: 'hidden',
            }}
          >
            {sideRail}
          </div>
        )}
      </div>
    </div>
  );
}
