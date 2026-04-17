/**
 * TicketBreadcrumbs — canonical issue-level breadcrumb.
 *
 * Rendered inline in every detail view surface (Story / Epic / Feature /
 * Task / Defect / Incident / Subtask / Business Request). Two-crumb shape:
 *
 *   <ParentIcon> <ParentKey or +Add parent>   /   <IssueTypeIcon> <ISSUE-KEY>
 *
 * Middle / first crumb rules:
 *   - parent epic exists        → show parentKey + epic icon, clickable
 *   - parent missing + non-epic → show "+ Add parent" action
 *   - current item IS the epic  → crumb collapses, only issue key remains
 *
 * Built on:
 *   - @atlaskit/breadcrumbs           Breadcrumbs + BreadcrumbsItem
 *   - @atlaskit/primitives            Box for padding via tokens
 *   - @atlaskit/tokens                color/typography tokens + theme sync
 *   - react-router-dom Link via       RouterBreadcrumbLink adapter
 *   - useAtlaskitThemeSync            light/dark parity with Catalyst theme
 *
 * Canonical — do NOT fork this for per-surface variants.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import { Box } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { useAtlaskitThemeSync } from '@/modules/project-work-hub/components/SubtasksPanel/atlaskitTheme';
import { IssueIcon } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';

export interface TicketBreadcrumbsProps {
  /** Used to build the parent-navigation href when `onParentClick` isn't set. */
  projectKey: string;
  itemType: string;
  itemKey: string | null;
  parentKey?: string | null;
  parentType?: string;
  onParentClick?: () => void;
  /** Fires when user clicks "+ Add parent" — open the set-parent UI. */
  onAddParent?: () => void;
  /**
   * Optional override for the first crumb. When provided, replaces the
   * default parent / +Add-parent button with this node — used to embed
   * surface-specific controls like AddParentPicker (which owns its own
   * popover). If set, `parentKey`, `onParentClick`, `onAddParent` are
   * ignored for rendering but still available if the consumer wants them.
   */
  middleSlot?: React.ReactNode;
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

/* ── Terminal crumb (current issue) — inline-flex container, single baseline ── */
const TerminalCrumb = React.forwardRef<HTMLSpanElement, { children?: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => (
    <span
      ref={ref}
      aria-current="page"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap',
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1,
        color: token('color.text', '#172B4D'),
      }}
    >
      {children}
    </span>
  ),
);
TerminalCrumb.displayName = 'TerminalCrumb';

export function TicketBreadcrumbs({
  projectKey,
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
      {/* Scoped polish for this breadcrumb instance only — does NOT affect
          other Atlaskit Breadcrumbs in the app. Targets the wrapper class
          `tk-breadcrumbs` exclusively. */}
      <style>{`
        .tk-breadcrumbs nav > ol,
        .tk-breadcrumbs ol[role="list"],
        .tk-breadcrumbs ol {
          display: inline-flex;
          align-items: center;
          flex-wrap: wrap;
          row-gap: 2px;
        }
        .tk-breadcrumbs li {
          display: inline-flex;
          align-items: center;
          line-height: 1;
        }
        .tk-breadcrumbs a,
        .tk-breadcrumbs button {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          line-height: 1;
          padding: 2px 4px;
          border-radius: 3px;
        }
        .tk-breadcrumbs a > span,
        .tk-breadcrumbs button > span {
          line-height: 1;
        }
        /* Separator — lighter, smaller, recede into chrome */
        .tk-breadcrumbs [aria-hidden="true"],
        .tk-breadcrumbs span[role="presentation"] {
          color: ${token('color.text.subtlest', '#8993A4')};
          font-size: 12px;
          font-weight: 400;
          margin: 0 6px;
          opacity: 0.55;
          line-height: 1;
          user-select: none;
        }
        /* Icons inside crumbs sit on shared optical baseline */
        .tk-breadcrumbs svg {
          flex-shrink: 0;
          display: block;
        }
      `}</style>
      <div className="tk-breadcrumbs">
        <Breadcrumbs label="Breadcrumbs">
          {/* Crumb 1 — Parent OR "+ Add parent" (hidden when current is epic) */}
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

          {/* Crumb 2 — Current issue (terminal). */}
          <BreadcrumbsItem
            text={
              (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                  <IssueIcon type={itemType} size={14} />
                  <span>{itemKey ?? '—'}</span>
                </span>
              ) as unknown as string
            }
            component={TerminalCrumb}
          />
        </Breadcrumbs>
      </div>
    </Box>
  );
}
