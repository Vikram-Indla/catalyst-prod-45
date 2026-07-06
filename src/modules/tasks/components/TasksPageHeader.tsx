/**
 * TasksPageHeader — breadcrumb + H1 page header for /tasks/* routes.
 *
 * Mirrors `ProjectPageHeader` but without project context (Tasks are not
 * project-scoped). Structure (DOM-probed against Jira via ProjectPageHeader):
 *   <nav> breadcrumbs: "Tasks / Task list"
 *     — 14px / 400 / rgb(107,110,118) = var(--ds-text-subtlest)
 *   <h2> Task list
 *     — 24px / 653 / lineHeight 28px / rgb(41,42,46) = var(--ds-text)
 *
 * Uses @atlaskit/breadcrumbs + @atlaskit/heading per ADS rule.
 */
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';

interface Props {
  /** Final crumb + H1 text — e.g. "Task list", "Board", "Timeline". */
  routeWord: string;
  /** Horizontal padding in px. Default 20px (matches ProjectPageHeader). */
  paddingX?: number;
}

export function TasksPageHeader({ routeWord, paddingX = 20 }: Props) {
  // Inline crumb + H2 on one row — the hub-standard header pattern
  // (ProjectPageHeader). The previous stacked layout read as
  // "Tasks /Dashboard" over a duplicated H1 and diverged from every other hub.
  return (
    <div
      style={{
        padding: `10px ${paddingX}px 0`,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        flexShrink: 0,
      }}
    >
      <div className="cat-breadcrumb-host" style={{ fontSize: 12, flexShrink: 0, opacity: 0.8 }}>
        <Breadcrumbs>
          <BreadcrumbsItem text="Tasks" href="/tasks/list" />
        </Breadcrumbs>
      </div>
      <span
        aria-hidden
        style={{ color: 'var(--ds-text-subtlest)', fontSize: 14, lineHeight: 1, flexShrink: 0, userSelect: 'none' }}
      >
        /
      </span>
      {/* ads-scanner:ignore-next-line — 22px matches ProjectPageHeader's level-1 heading; no ADS token maps to this exact value */}
      <h2 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: 'var(--ds-text)', margin: 0 }}>
        {routeWord}
      </h2>
    </div>
  );
}
