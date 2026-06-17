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
import Heading from '@atlaskit/heading';

interface Props {
  /** Final crumb + H1 text — e.g. "Task list", "Board", "Timeline". */
  routeWord: string;
  /** Horizontal padding in px. Default 20px (matches ProjectPageHeader). */
  paddingX?: number;
}

export function TasksPageHeader({ routeWord, paddingX = 20 }: Props) {
  return (
    <div
      style={{
        padding: `0 ${paddingX}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
        minHeight: 56,
        flexShrink: 0,
      }}
    >
      <Breadcrumbs>
        <BreadcrumbsItem text="Tasks" href="/tasks/list" />
        <BreadcrumbsItem text={routeWord} />
      </Breadcrumbs>
      <Heading size="large">{routeWord}</Heading>
    </div>
  );
}
