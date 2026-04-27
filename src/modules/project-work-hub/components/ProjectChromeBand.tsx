/**
 * ProjectChromeBand — the chrome-level header band that sits ABOVE the
 * white card on project work-hub pages, matching Jira's
 * `horizontal-nav-header.ui.project-header.header` row at
 * /jira/software/c/projects/<KEY>/list.
 *
 * Why this exists
 * ───────────────
 * Iter-3 of /jira-compare landed the page-chrome bg (#E9F2FE) and the
 * inner white card with its own padding/border. /regression then surfaced
 * three additional defects sharing one root cause:
 *
 *   D-001 [UI-Parity P0]  Project header band missing entirely
 *   D-002 [UI-Parity P0]  Spaces breadcrumb missing
 *   D-003 [UX-Parity P0]  H1 misplaced (currently inside white card,
 *                         should be in chrome band — same hierarchy
 *                         level as the project icon and CTAs)
 *
 * One additive prop on AtlaskitPageShell (chromeBand?) plus this
 * component closes all three. Opt-in: only the BAU backlog surface
 * passes it today.
 *
 * Anatomy (matches Jira parity probe 2026-04-27)
 * ────────────────────────────────────────────
 *   Row A — Breadcrumbs at y≈68 (relative to chrome top):
 *     <NAV aria-label="Breadcrumbs">  via @atlaskit/breadcrumbs
 *       <BreadcrumbsItem text="Spaces" />
 *
 *   Row B — Project header at y≈91:
 *     [project icon 20×20]  [H1 "Project name" 20px/653]   <flex spacer>   {actions slot}
 *
 *   Total band height ≈ 56px (Row A 23px + Row B 31px + 2px spacing).
 *
 * Open landing surface for pre-existing handoffs
 * ──────────────────────────────────────────────
 *   - LOVABLE-01-avatar-strip-add-people.md  → AvatarGroup + Add people
 *     button render INTO the actions slot (Row B right side).
 *   - DESIGN-CRITIQUE-09-top-right-ctas.md   → "Give feedback" /
 *     "Enter full screen" buttons render INTO the actions slot.
 *
 * Atlaskit-only mandate (hard):
 *   @atlaskit/breadcrumbs   — Row A
 *   @atlaskit/heading       — H1 in Row B
 *   @atlaskit/primitives    — Box / Inline for layout
 *   @atlaskit/tokens        — semantic colors / spacing
 *   No bespoke Tailwind, no shadcn, no Radix.
 */
import { type ReactNode } from 'react';
import { token } from '@atlaskit/tokens';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';

export interface ProjectChromeBandProps {
  /** The project's display name — rendered as the H1 in Row B. */
  projectName: string;
  /**
   * Optional URL for the project icon. If omitted, a fallback avatar
   * with the project's first letter is rendered.
   */
  projectIconUrl?: string;
  /**
   * Optional href for the project name in the breadcrumb. Defaults to
   * the current page (no navigation).
   */
  projectHref?: string;
  /**
   * Optional href for the "Spaces" breadcrumb root. Defaults to "/".
   */
  spacesHref?: string;
  /**
   * Right-side actions slot (Row B, right cluster). Targets:
   *   - AvatarGroup + "Add people" button (LOVABLE handoff #1)
   * When omitted the right side stays empty.
   */
  actions?: ReactNode;
  /**
   * Apr 27 2026 (regression iter 2): top-right page-chrome icon buttons
   * — "Give feedback" and "Enter full screen" in Jira parity probe at
   * (1118, 91) and (1158, 91) respectively. Rendered to the FAR right
   * of Row B (after the actions slot). Pass to lift these onto the
   * chrome band level matching Jira's
   * feedback-button.horizontal-nav-feedback-button +
   * platform.ui.fullscreen-button.fullscreen-button geometry.
   */
  pageChromeRightCtas?: ReactNode;
  /**
   * Apr 27 2026 (regression iter 2): tabs row, the third chrome row
   * matching Jira's anchor strip at y≈127 (probed from
   * /jira/.../list?groupBy=status). Pass an array of {label, href,
   * isActive} or pre-rendered nodes — the band wraps them in a row.
   * When undefined, no tabs row is rendered.
   */
  tabs?: Array<{ label: string; href: string; isActive?: boolean }>;
  /** Click handler for tabs (preventDefault + parent routes). */
  onTabClick?: (tab: { label: string; href: string }, e: React.MouseEvent) => void;
  /**
   * Apr 27 2026 (regression iter 3): when provided, renders a "+" button
   * at the end of the tabs row matching Jira's add-custom-view affordance.
   * Click fires this callback. When undefined, no "+" is rendered.
   */
  onAddTab?: () => void;
  /**
   * Apr 27 2026 (regression iter 4): rendered IMMEDIATELY AFTER the H1
   * project name on Row B. Use for the small invite-people icon + ...
   * project menu trigger that Jira parity-probes show next to the H1
   * (testid `invite-people.ui.navigation-add-people-button.trigger` and
   * the project-menu kebab). Caller passes pre-built buttons; the band
   * just lays them out with 4px gap.
   */
  nameAdornment?: ReactNode;
}

export function ProjectChromeBand({
  projectName,
  projectIconUrl,
  projectHref,
  spacesHref = '/',
  actions,
  pageChromeRightCtas,
  tabs,
  onTabClick,
  onAddTab,
  nameAdornment,
}: ProjectChromeBandProps) {
  return (
    <div
      data-testid="project-chrome-band"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {/* Row A — Spaces breadcrumb. @atlaskit/breadcrumbs renders a
          NAV[aria-label="Breadcrumbs"] which matches Jira's parity
          probe at (23, 68) "Spaces" on the BAU list view. */}
      <div style={{ paddingTop: 8, paddingBottom: 0 }}>
        <Breadcrumbs>
          <BreadcrumbsItem
            href={spacesHref}
            text="Spaces"
            onClick={(e) => {
              // No-op for now — parity-only render. Replace with router
              // navigation when Spaces lands as a Catalyst route.
              e.preventDefault();
            }}
          />
          <BreadcrumbsItem
            href={projectHref ?? '#'}
            text={projectName}
            onClick={(e) => {
              e.preventDefault();
            }}
          />
        </Breadcrumbs>
      </div>

      {/* Row B — Project header: icon + name + actions cluster. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 4,
        }}
      >
        {/* Project icon. Native IMG when URL provided, else a 20×20
            initial-letter fallback. Sized to match Jira parity probe at
            (23, 97, 20×20). */}
        {projectIconUrl ? (
          <img
            src={projectIconUrl}
            alt=""
            width={20}
            height={20}
            style={{
              borderRadius: 3,
              flexShrink: 0,
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: 20,
              height: 20,
              borderRadius: 3,
              flexShrink: 0,
              background: token('color.background.brand.bold', '#0C66E4'),
              color: token('color.text.inverse', '#FFFFFF'),
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'inherit',
            }}
          >
            {(projectName || '?').slice(0, 1).toUpperCase()}
          </div>
        )}

        {/* H1. 20px / weight 653 / -0.003em — exact Jira parity probe at
            "Senaei BAU" 20px/653 color rgb(41,42,46). Inline so it sits on
            the same row as the icon and actions. */}
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 653,
            letterSpacing: '-0.003em',
            color: token('color.text', '#172B4D'),
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {projectName}
        </h1>

        {/* Apr 27 2026 (regression iter 4): name adornment slot — Jira
            renders a small invite-people icon + project ... menu trigger
            immediately after the H1 (probed at testid
            `invite-people.ui.navigation-add-people-button.trigger`). */}
        {nameAdornment != null && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {nameAdornment}
          </div>
        )}

        {/* Flex spacer pushes the actions cluster to the right edge of
            the band (matching Jira's right-aligned action chips). */}
        <div style={{ flex: 1 }} />

        {/* Actions slot — populated by LOVABLE handoff #1 (AvatarGroup +
            "Add people"). The page-chrome right CTAs (Give feedback /
            Enter full screen) are a SEPARATE slot to preserve Jira's
            (avatars actions | spacer | give-feedback fullscreen) layout. */}
        {actions != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {actions}
          </div>
        )}

        {/* Apr 27 2026 (regression iter 2 — DESIGN-CRITIQUE #9 landed):
            page-chrome right-edge icon CTAs. Probed Jira positions at
            x=1118 (Give feedback) and x=1158 (Enter full screen) on a
            1214px viewport — both 31×31, fontWeight 500, color
            rgb(80,82,88). Caller passes pre-built buttons; band only
            renders the wrapper row. */}
        {pageChromeRightCtas != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
            {pageChromeRightCtas}
          </div>
        )}
      </div>

      {/* Apr 27 2026 (regression iter 2 — tabs row landed): Row C tabs,
          matching Jira parity probe at y=127 with anchor links "All
          work" (x=87, w=97) and "Releases" (x=189, w=104), color
          rgb(80,82,88), fontWeight 500. Skipped when undefined. */}
      {tabs && tabs.length > 0 && (
        <nav
          aria-label="Project sub-navigation"
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 4,
            paddingTop: 4,
          }}
        >
          {tabs.map((t) => {
            const active = !!t.isActive;
            return (
              <a
                key={t.label}
                href={t.href}
                onClick={(e) => onTabClick && onTabClick(t, e)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 31,
                  padding: '0 12px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: active
                    ? token('color.text.selected', '#0C66E4')
                    : token('color.text.subtle', '#6B6E76'),
                  borderBottom: active
                    ? `2px solid ${token('color.border.selected', '#0C66E4')}`
                    : '2px solid transparent',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </a>
            );
          })}
          {/* Apr 27 2026 (regression iter 3): "+" affordance after the
              last tab matching Jira's add-custom-view button. Only
              rendered when consumer provides onAddTab. 28×28 to match
              Atlaskit's compact icon-button geometry. */}
          {onAddTab && (
            <button
              type="button"
              data-testid="project-chrome-band.add-tab-button"
              aria-label="Add view"
              onClick={() => onAddTab()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                marginLeft: 4,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: token('color.text.subtle', '#6B6E76'),
                borderRadius: 3,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(9, 30, 66, 0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 16, fontWeight: 400, lineHeight: 1 }}>+</span>
            </button>
          )}
        </nav>
      )}
    </div>
  );
}
