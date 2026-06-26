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
import { ProjectAvatar } from '@/components/icons';


export interface TicketBreadcrumbsProps {
  /** Used to build the parent-navigation href when `onParentClick` isn't set. */
  projectKey: string;
  /**
   * Project display name shown as the leading crumb (Jira-parity, 2026-05-03).
   * Falls back to projectKey when not provided.
   */
  projectName?: string;
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
  /** Override for the project crumb href. Defaults to /project-hub/:key/list */
  projectHref?: string;
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
  projectName,
  itemType,
  itemKey,
  parentKey,
  parentType,
  onParentClick,
  onAddParent,
  middleSlot,
  projectHref,
}: TicketBreadcrumbsProps) {
  const isEpic = (itemType || '').toLowerCase().includes('epic');
  const hasSlot = middleSlot !== undefined;
  const showParent = !hasSlot && Boolean(parentKey);
  const showAddParent = !hasSlot && !isEpic && !parentKey && Boolean(onAddParent);

  const items: BreadcrumbItem[] = [];

  // jira-compare 2026-05-03 — Crumb 0 (project): leading crumb that
  // matches Jira's "Senaei BAU" segment. Provides project context inside
  // the breadcrumb hierarchy. Catalyst's higher-level "Spaces" equivalent
  // lives in the global Hub Switcher chrome, so we stop at project level.
  if (projectKey) {
    items.push({
      key: 'project',
      text: projectName || projectKey,
      iconBefore: <ProjectAvatar projectKey={projectKey} size={14} />,
      href: projectHref ?? `/project-hub/${projectKey}/list`,
      ariaLabel: `Project ${projectName || projectKey}`,
    });
  }

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
            href: `/browse/${parentKey}`,
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

  // Crumb 2 — current issue (terminal). Jira-parity: clicking the key
  // navigates to the full-page issue view (/browse/:issueKey).
  // 2026-06-26: Sprint / Release entities are NOT Jira issue types — render
  // a small inline glyph (zap for sprint, package for release) instead of
  // routing through the JiraIssueTypeIcon registry (which would fall
  // through to the default story icon).
  const isSprintCrumb = itemType === 'Sprint / Iteration' || itemType === 'Sprint';
  const isReleaseCrumb = itemType === 'Release';
  const sprintGlyph = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ds-icon-warning, #B38600)' }}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" />
    </svg>
  );
  const releaseGlyph = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ds-icon-information, #1868DB)' }}>
      <path d="M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );

  items.push({
    key: 'current',
    text: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
        {isSprintCrumb ? sprintGlyph
          : isReleaseCrumb ? releaseGlyph
          : <IssueIcon type={itemType} size={14} />}
        <span>{itemKey ?? '—'}</span>
      </span>
    ),
    href: itemKey ? `/browse/${itemKey}` : undefined,
    ariaLabel: itemKey ?? 'Current issue',
  });

  return (
    <div style={{ paddingBlock: 0 }}>
      {/* Scoped polish for this breadcrumb instance only — does NOT affect
          other Breadcrumbs in the app. Targets `.tk-breadcrumbs` exclusively.
          Styling uses Catalyst --cp-* CSS custom properties so dark mode
          follows AdsThemeProvider automatically. */}
      <style>{`
        .tk-breadcrumbs {
          /* Scoped token override — Jira-canonical breadcrumb color (CLAUDE.md 2026-05-12: 14px/400/#42526E).
             ADS deploys --ds-text-subtle as #505258 (neutral grey); Jira uses #42526E (blue-grey, more visual
             weight). Overriding the token here means all var(--ds-text-subtle) children resolve correctly. */
          --ds-text-subtle: #42526E;
        }
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
        /* Reset the @atlaskit/breadcrumbs li > span wrapper that inherits
           16px/500 from the ADS Breadcrumbs component defaults. Without this
           the middleSlot (AddParentPicker) appears visually bolder/larger
           than the other breadcrumb items. */
        .tk-breadcrumbs li > span {
          font-size: 14px;
          font-weight: 400;
          color: var(--ds-text-subtle, #505258);
        }
        .tk-breadcrumbs a,
        .tk-breadcrumbs button,
        .tk-breadcrumbs [aria-current="page"] {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--cp-font-body);
          font-size: 14px;
          font-weight: 400;
          color: var(--ds-text-subtle, #505258);
          line-height: 20px;
          padding: 2px 4px;
          border-radius: 3px;
        }
        /* jira-compare 2026-05-16 re-probe (corrected): Jira breadcrumb items
           are 14px/400/var(--ds-text-subtle, rgb(80,82,88)) — grey at rest for ALL items including
           anchor links. No blue link colour at rest (muted text is Jira UX). */
        .tk-breadcrumbs a:hover {
          color: var(--ds-link, #1868DB);
          text-decoration: underline;
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
