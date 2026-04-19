// @ts-nocheck
/**
 * PageHeader — Catalyst wrapper composed from @atlaskit/heading + primitives.
 *
 * Composition (NOT @atlaskit/page-header)
 * ───────────────────────────────────────
 * @atlaskit/page-header is opinionated (breadcrumbs slot, bottomBar, actions
 * layout, built-in bottom padding). Catalyst's canonical page header is a
 * flat 52px shell with title + actions — no slot reshuffling. Composing from
 * Heading + Inline keeps the contract surgical and removes three layers of
 * Atlaskit-internal padding we would otherwise need to override.
 *
 * Usage
 * ─────
 *   <PageHeader title="Dashboard" />
 *   <PageHeader title="BAU" actions={<Button>+ Add</Button>} icon={<Home size={16}/>} />
 *   <PageHeader title="Board" breadcrumbs={<Breadcrumbs items={...} />} />
 *
 * Surface chrome (locked per April 2026 Decision A)
 * ────────────────────────────────────────────────
 *   height:     52px (fixed)
 *   padding:    0 24px
 *   title:      Heading size="large" as="h1"  → Atlassian Sans 20/600/-0.003em
 *   actions:    Inline alignBlock="center" space="space.100"
 *   separator:  no border, no background — the nav chrome owns zoning
 *
 * Colours resolve through @atlaskit/tokens — light + dark flip automatically
 * via AdsThemeProvider. No hex literals permitted.
 */
import { Inline } from '@atlaskit/primitives';
import { type ReactNode } from 'react';
import { adsTokens, cp } from '@/theme/ads/tokens';
import { Heading } from './Heading';
import { forwardTestId } from './internal/forwardTestId';

export interface PageHeaderProps {
  /** Page title — rendered as <h1> via Atlaskit Heading size="large". */
  title: ReactNode;
  /** Optional leading icon (Lucide component). Rendered inline before the title. */
  icon?: ReactNode;
  /** Optional breadcrumbs rendered above the title row. */
  breadcrumbs?: ReactNode;
  /** Optional actions rendered on the right side of the title row. */
  actions?: ReactNode;
  /** Test selector forwarded to the header element. */
  testId?: string;
}

export function PageHeader({
  title,
  icon,
  breadcrumbs,
  actions,
  testId,
}: PageHeaderProps) {
  return (
    <header
      {...forwardTestId(testId)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: 52,
        padding: '0 24px',
        flexShrink: 0,
        background: 'transparent',
      }}
    >
      {breadcrumbs ? (
        <div style={{ marginBottom: 4 }}>{breadcrumbs}</div>
      ) : null}

      <Inline alignBlock="center" spread="space-between" space="space.100">
        <Inline alignBlock="center" space="space.100">
          {icon ? (
            <span
              aria-hidden
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                color: cp(adsTokens.text.secondary),
              }}
            >
              {icon}
            </span>
          ) : null}
          <Heading as="h1" size="large">
            {title}
          </Heading>
        </Inline>

        {actions ? (
          <Inline alignBlock="center" space="space.100">
            {actions}
          </Inline>
        ) : null}
      </Inline>
    </header>
  );
}
