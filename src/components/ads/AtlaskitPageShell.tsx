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
  /**
   * Apr 27, 2026 (audit pass 9): when `flush` is true, drop the 8px
   * outer padding around the white card so the content extends to the
   * page chrome's inner edge. Used for list-view surfaces (BAU backlog)
   * where every pixel of horizontal width is needed for table columns
   * and the page chrome already provides edge breathing room. Default
   * false preserves the rounded padded card aesthetic for non-list
   * surfaces.
   */
  flush?: boolean;
  /** Width of the side rail column. Default 400px (Jira parity). */
  sideRailWidth?: number;
  /**
   * Apr 27, 2026 (jira-compare iter 3): override the outer wrapper
   * background. Opt-in, single-surface scope. Used by BAU backlog list
   * view to paint the Jira-parity blue chrome (`#E9F2FE`) WITHOUT
   * affecting other migrated hub surfaces (Dashboard, Releases, etc.)
   * which keep the V3 flat white. When undefined, falls back to the
   * canonical `--cp-bg-hub-page` token.
   */
  chromeBg?: string;
  /**
   * Apr 27, 2026 (jira-compare iter 3): override the outer padding
   * around the inner white card. Number = uniform px; object = per-axis
   * (matches Jira's card x=48, y=16-ish offsets from the chrome edge).
   * Takes precedence over `flush` when defined.
   */
  cardPadding?: number | { x: number; y: number };
  /**
   * Apr 27, 2026 (jira-compare iter 3): override the inner card border.
   * Defaults to none. BAU backlog passes a subtle 1px border to mirror
   * Jira's BaseTable card outline (probed 0.555px solid; rounded to 1px
   * for crisp render at 1× zoom).
   */
  cardBorder?: string;
  /**
   * Apr 27, 2026 (jira-compare regression D-001/002/003): when provided,
   * renders a chrome-band region BETWEEN the outer chrome bg and the
   * inner white card. The band sits in the tinted chrome (e.g., #E9F2FE
   * for BAU backlog) and contains the breadcrumb row + project header
   * row (Spaces > Senaei BAU + project icon + H1 + actions). When absent,
   * the chrome and the card sit flush as before — opt-in, scoped to the
   * BAU backlog surface for Jira parity. Other consumers unaffected.
   *
   * The chromeBand sits inside the outer chromeBg padding, so it uses the
   * same horizontal alignment as the card (cardPadding.x). A 12px gap
   * separates the band from the card top.
   */
  chromeBand?: ReactNode;
  /** Test selector forwarded to the outer wrapper. */
  testId?: string;
}

export function AtlaskitPageShell({
  title,
  actions,
  children,
  sideRail,
  flush = false,
  sideRailWidth = 400,
  chromeBg,
  cardPadding,
  cardBorder,
  chromeBand,
  testId,
}: AtlaskitPageShellProps) {
  const hasHeaderRow = title != null || actions != null;
  const hasSideRail = sideRail != null;

  // Resolve outer padding. Explicit cardPadding prop wins over flush
  // and over the default 8px. This is the lever BAU backlog uses to
  // sit the white card off the blue chrome edges (Jira parity).
  const padX = cardPadding != null
    ? (typeof cardPadding === 'number' ? cardPadding : cardPadding.x)
    : (hasSideRail || flush ? 0 : 8);
  const padY = cardPadding != null
    ? (typeof cardPadding === 'number' ? cardPadding : cardPadding.y)
    : (hasSideRail || flush ? 0 : 8);

  // Resolve outer wrapper bg. Defaults to the V3 flat white (hubPage
  // token). BAU backlog passes `#E9F2FE` to paint Jira's blue chrome.
  const outerBg = chromeBg ?? cp(adsTokens.bg.hubPage);

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
        // Apr 27, 2026 (L67): clamp height to 100% (was minHeight: 100%)
        // when sideRail is present so the rail's internal scroll fires
        // instead of the whole page scrolling. With minHeight, when the
        // rail's content was taller than the viewport the entire page
        // grew vertically — meaning scrolling the rail also moved the
        // table column. height: 100% caps the shell at its parent's
        // height (CatalystShell <main> is fixed to viewport-minus-nav).
        // Standalone (no sideRail) keeps minHeight so non-list surfaces
        // can grow naturally.
        height: hasSideRail ? '100%' : undefined,
        minHeight: hasSideRail ? undefined : '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: ATLASSIAN_SANS_STACK,
        background: outerBg,
        // Apr 27, 2026 (L48 + jira-compare iter 3): outer padding now
        // resolved upstream (padX/padY). When `cardPadding` is supplied
        // the caller wins (BAU backlog passes {x:48,y:16} for Jira chrome
        // parity); else falls back to the original sideRail/flush logic.
        padding: `${padY}px ${padX}px`,
      }}
    >
      {/* Apr 27 2026 (jira-compare regression D-001/002/003): chromeBand
          slot. Renders inside the outer chromeBg padding, aligned with the
          card horizontally, with a 12px gap before the card starts. Holds
          the Spaces breadcrumb + project icon + H1 + actions row that Jira
          renders above the white card. Opt-in via the chromeBand prop —
          when undefined the shell collapses back to chrome→card flush. */}
      {chromeBand && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            paddingBottom: 12,
          }}
        >
          {chromeBand}
        </div>
      )}
      <div
        style={{
          width: '100%',
          display: 'flex',
          // 2-column when sideRail is present, single-column otherwise.
          flexDirection: hasSideRail ? 'row' : 'column',
          flex: 1,
          minHeight: 0,
          background: cp(adsTokens.bg.surface),
          // jira-compare iter 3: when cardPadding is explicitly supplied,
          // we're rendering a visible card on a tinted chrome — keep the
          // 8px radius even if a sideRail is present. Otherwise preserve
          // the original behavior (sideRail surfaces flatten radius=0).
          borderRadius: hasSideRail && cardPadding == null ? 0 : 8,
          // jira-compare iter 3: optional subtle border for the card
          // outline (mirrors Jira's BaseTable card stroke).
          border: cardBorder,
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
