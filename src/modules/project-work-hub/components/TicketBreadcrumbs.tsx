/**
 * TicketBreadcrumbs — canonical issue-level breadcrumb.
 *
 * Rendered inline in the top bar of CatalystViewBase (the shared shell for
 * every detail view: Story / Epic / Feature / Task / Defect / Incident /
 * Subtask / Business Request). Shape:
 *
 *   <ProjectAvatar> <ProjectName>  /  <ParentIcon> <ParentKey or +Add parent>  /  <IssueTypeIcon> <ISSUE-KEY>
 *
 * Middle crumb rules:
 *   - parent epic exists        → show parentKey + epic icon, clickable
 *   - parent missing + non-epic → show "+ Add parent" action (calls onAddParent)
 *   - current item IS the epic  → collapse middle crumb (Jira behavior)
 *
 * Built on:
 *   - @atlaskit/breadcrumbs           Breadcrumbs + BreadcrumbsItem
 *   - @atlaskit/primitives            Box for padding via tokens
 *   - @atlaskit/tokens                color/typography tokens + theme sync
 *   - react-router-dom Link via       RouterBreadcrumbLink adapter
 *   - useAtlaskitThemeSync            light/dark parity with Catalyst theme
 *
 * Canonical — do NOT fork this for per-surface variants. Every detail view
 * composes CatalystViewBase, which renders this once.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import { Box } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { useAtlaskitThemeSync } from '@/modules/project-work-hub/components/SubtasksPanel/atlaskitTheme';
import { IssueIcon } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';
import {
  getAvatarColor,
  getInitials,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

export interface TicketBreadcrumbsProps {
  projectKey: string;
  projectName?: string;
  itemType: string;
  itemKey: string | null;
  parentKey?: string | null;
  parentType?: string;
  onParentClick?: () => void;
  /** Fires when user clicks "+ Add parent" — open the set-parent UI. */
  onAddParent?: () => void;
  /**
   * Optional override for the middle crumb. When provided, replaces the
   * default parent / +Add-parent button with this node — used to embed
   * surface-specific controls like AddParentPicker (which owns its own
   * popover). If set, `parentKey`, `onParentClick`, `onAddParent` are
   * ignored for rendering but still available if the consumer wants them.
   */
  middleSlot?: React.ReactNode;
}

/* ── Project avatar: small square with initials, Jira style ─────────────── */
function ProjectAvatar({ projectKey, projectName, size = 16 }: { projectKey: string; projectName?: string; size?: number }) {
  const label = projectName || projectKey;
  const initial = getInitials(label).slice(0, 1) || projectKey.slice(0, 1);
  const bg = getAvatarColor(label);
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: 3,
        background: bg,
        color: '#FFFFFF',
        fontFamily: "'Inter', sans-serif",
        fontSize: Math.round(size * 0.65),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initial.toUpperCase()}
    </span>
  );
}

/* ── Router adapter for BreadcrumbsItem.component ───────────────────────── */
type AnyAnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string;
  children?: React.ReactNode;
};
const RouterBreadcrumbLink = React.forwardRef<HTMLAnchorElement, AnyAnchorProps>(
  ({ href, children, className, onClick, ...rest }, ref) => {
    if (!href) {
      return (
        <a ref={ref} className={className} onClick={onClick} {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} to={href} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  },
);
RouterBreadcrumbLink.displayName = 'RouterBreadcrumbLink';

/* ── Button-as-crumb adapter: for "+ Add parent" and parent-navigation when
      onParentClick is an in-app handler rather than a direct URL. ────────── */
interface CallbackProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
  className?: string;
}
const CallbackBreadcrumb = React.forwardRef<HTMLButtonElement, CallbackProps>(
  ({ onClick, children, className }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={className}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        font: 'inherit',
        color: 'inherit',
      }}
    >
      {children}
    </button>
  ),
);
CallbackBreadcrumb.displayName = 'CallbackBreadcrumb';

/* ── Terminal crumb (current issue) — non-interactive span ──────────────── */
const TerminalCrumb = React.forwardRef<HTMLSpanElement, { children?: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => (
    <span
      ref={ref}
      aria-current="page"
      className={className}
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 13,
        fontWeight: 600,
        color: token('color.text', '#172B4D'),
        letterSpacing: '0.01em',
      }}
    >
      {children}
    </span>
  ),
);
TerminalCrumb.displayName = 'TerminalCrumb';

export function TicketBreadcrumbs({
  projectKey,
  projectName,
  itemType,
  itemKey,
  parentKey,
  parentType,
  onParentClick,
  onAddParent,
  middleSlot,
}: TicketBreadcrumbsProps) {
  useAtlaskitThemeSync();

  const isEpic = (itemType || '').toLowerCase().includes('epic');
  const hasSlot = middleSlot !== undefined;
  const showParent = !hasSlot && Boolean(parentKey);
  const showAddParent = !hasSlot && !isEpic && !parentKey;

  return (
    <Box
      xcss={{
        paddingBlock: 'space.050',
        font: 'font.body',
        color: 'color.text.subtlest',
      } as never}
    >
      <Breadcrumbs label="Breadcrumbs">
        {/* Crumb 1 — Project (no icon, text only per spec) */}
        <BreadcrumbsItem
          href={`/project-hub/${projectKey}/list`}
          text={projectName || projectKey}
          component={RouterBreadcrumbLink}
        />

        {/* Crumb 2 — Parent OR "+ Add parent" (hidden when the current issue is an epic) */}
        {showParent && (
          onParentClick ? (
            <BreadcrumbsItem
              text={parentKey!}
              iconBefore={<IssueIcon type={parentType || 'Epic'} size={14} />}
              onClick={onParentClick}
              component={CallbackBreadcrumb}
            />
          ) : (
            <BreadcrumbsItem
              href={`/project-hub/${projectKey}/issue/${parentKey}`}
              text={parentKey!}
              iconBefore={<IssueIcon type={parentType || 'Epic'} size={14} />}
              component={RouterBreadcrumbLink}
            />
          )
        )}
        {showAddParent && (
          <BreadcrumbsItem
            text="+ Add parent"
            onClick={onAddParent}
            component={CallbackBreadcrumb}
          />
        )}
        {hasSlot && !isEpic && (
          <BreadcrumbsItem
            text=""
            component={React.forwardRef<HTMLSpanElement>(() => (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>{middleSlot}</span>
            ))}
          />
        )}

        {/* Crumb 3 — Current issue (terminal) */}
        <BreadcrumbsItem
          text={itemKey ?? '—'}
          iconBefore={<IssueIcon type={itemType} size={14} />}
          component={TerminalCrumb}
        />
      </Breadcrumbs>
    </Box>
  );
}
