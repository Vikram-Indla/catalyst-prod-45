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
 * Built on the Catalyst ADS wrapper layer:
 *   - @/components/ads        Breadcrumbs + BreadcrumbItem (data-driven)
 *   - react-router-dom Link   via RouterBreadcrumbLink adapter
 *
 * Theme sync is handled globally by AdsThemeProvider (see src/App.tsx);
 * no per-component hook is required.
 *
 * Canonical — do NOT fork this for per-surface variants.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ads';
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

/* ── Router adapter for Breadcrumbs.LinkComponent ───────────────────────── */
const RouterBreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: React.ReactNode }
>(function RouterBreadcrumbLink({ href, children, className, onClick, ...rest }, ref) {
  return (
    <Link ref={ref as React.Ref<HTMLAnchorElement>} to={href} className={className} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
});

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
  const isEpic = (itemType || '').toLowerCase().includes('epic');
  const hasSlot = middleSlot !== undefined;
  const showParent = !hasSlot && Boolean(parentKey);
  const showAddParent = !hasSlot && !isEpic && !parentKey;

  const items: BreadcrumbItem[] = [];

  // Crumb 1 — parent OR "+ Add parent" (hidden when current is epic).
  if (showParent) {
    items.push(
      onParentClick
        ? {
            key: 'parent',
            text: parentKey!,
            iconBefore: <IssueIcon type={parentType || 'Epic'} size={14} />,
            onClick: onParentClick,
            ariaLabel: `Parent ${parentKey}`,
          }
        : {
            key: 'parent',
            text: parentKey!,
            iconBefore: <IssueIcon type={parentType || 'Epic'} size={14} />,
            href: `/project-hub/${projectKey}/issue/${parentKey}`,
            ariaLabel: `Parent ${parentKey}`,
          },
    );
  } else if (showAddParent) {
    items.push({
      key: 'add-parent',
      text: '+ Add parent',
      onClick: onAddParent,
      ariaLabel: 'Add parent',
    });
  } else if (hasSlot && !isEpic) {
    items.push({
      key: 'middle-slot',
      text: '',
      render: () => middleSlot,
    });
  }

  // Crumb 2 — current issue (terminal).
  items.push({
    key: 'current',
    text: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
        <IssueIcon type={itemType} size={14} />
        <span>{itemKey ?? '—'}</span>
      </span>
    ),
    ariaLabel: itemKey ?? 'Current issue',
    isCurrent: true,
  });

  return (
    <div style={{ paddingBlock: 4 }}>
      {/* Scoped polish for this breadcrumb instance only — does NOT affect
          other Breadcrumbs in the app. Targets `.tk-breadcrumbs` exclusively.
          Styling uses Catalyst --cp-* CSS custom properties so dark mode
          follows AdsThemeProvider automatically. */}
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
        .tk-breadcrumbs button,
        .tk-breadcrumbs [aria-current="page"] {
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
        .tk-breadcrumbs button {
          background: transparent;
          border: none;
          cursor: pointer;
          color: inherit;
        }
        .tk-breadcrumbs a > span,
        .tk-breadcrumbs button > span,
        .tk-breadcrumbs [aria-current="page"] > span {
          line-height: 1;
        }
        /* Separator — lighter, smaller, recede into chrome */
        .tk-breadcrumbs [aria-hidden="true"],
        .tk-breadcrumbs span[role="presentation"] {
          color: var(--cp-text-muted, #94A3B8);
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
        <Breadcrumbs
          items={items}
          LinkComponent={RouterBreadcrumbLink}
          aria-label="Breadcrumbs"
        />
      </div>
    </div>
  );
}
