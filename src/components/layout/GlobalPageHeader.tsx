/**
 * GlobalPageHeader — Unified enterprise page header with breadcrumb inheritance
 * 
 * This is the SINGLE source of truth for page headers across Catalyst.
 * All routes must use this component for consistent breadcrumb + title styling.
 * 
 * Structure:
 * - Row 1: Breadcrumb (SECTION / Page Title) + optional right actions
 * - Row 2 (optional): Toolbar with controls + single divider below
 * 
 * Typography (enterprise contract):
 * - Section label: 11px, semibold, uppercase, tracking-wider
 * - Page title: 18px, semibold
 * - Divider: only ONE, always below header (never above)
 */

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlobalPageHeaderProps {
  /** Section label (e.g., 'Enterprise', 'Product', 'Program') - displayed uppercase */
  sectionLabel: string;
  /** Page title (e.g., 'Strategy Room', 'Product Backlog') */
  pageTitle: string;
  /** Optional right-side actions (filters, buttons, selectors) */
  rightActions?: ReactNode;
  /** Optional toolbar content - when provided, shows Row 2 with divider */
  toolbar?: ReactNode;
  /** Whether to show divider under header (default: true when no toolbar) */
  showDivider?: boolean;
  /** Additional classes for the wrapper */
  className?: string;
}

export function GlobalPageHeader({
  sectionLabel,
  pageTitle,
  rightActions,
  toolbar,
  showDivider = true,
  className,
}: GlobalPageHeaderProps) {
  return (
    <div 
      className={cn('shrink-0', className)} 
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Row 1: Breadcrumb + Title + Actions */}
      <div
        className="flex items-center justify-between px-6"
        style={{ 
          height: '52px',
          borderBottom: !toolbar && showDivider ? '1px solid var(--divider)' : undefined,
        }}
      >
        {/* Left: Breadcrumb + Title */}
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-3)' }}
          >
            {sectionLabel}
          </span>
          <span 
            className="text-[14px]" 
            style={{ color: 'var(--text-4)' }}
          >
            /
          </span>
          <h1
            className="text-[18px] font-semibold"
            style={{ color: 'var(--text-1)' }}
          >
            {pageTitle}
          </h1>
        </div>

        {/* Right: Actions slot */}
        {rightActions && (
          <div className="flex items-center gap-3">
            {rightActions}
          </div>
        )}
      </div>

      {/* Row 2: Toolbar - only rendered if toolbar provided */}
      {toolbar && (
        <div
          className="flex items-center px-6"
          style={{
            height: '44px',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          {toolbar}
        </div>
      )}
    </div>
  );
}

/**
 * Route metadata mapping for automatic header generation
 * Use this to derive sectionLabel and pageTitle from route paths
 */
export const ROUTE_META: Record<string, { sectionLabel: string; pageTitle: string }> = {
  '/enterprise/strategy-room': { sectionLabel: 'Enterprise', pageTitle: 'Strategy Room' },
  '/enterprise/strategic-backlog': { sectionLabel: 'Enterprise', pageTitle: 'Strategic Backlog' },
  '/enterprise/roadmaps': { sectionLabel: 'Enterprise', pageTitle: 'Theme Roadmap' },
  '/industry/backlog': { sectionLabel: 'Product', pageTitle: 'Product Backlog' },
  '/industry/kanban': { sectionLabel: 'Product', pageTitle: 'Product Kanban' },
  '/industry/roadmaps': { sectionLabel: 'Product', pageTitle: 'Product Roadmap' },
  '/product/capacity': { sectionLabel: 'Product', pageTitle: 'Capacity Planning' },
  '/program/:programId/backlog': { sectionLabel: 'Program', pageTitle: 'Program Backlog' },
  '/program/:programId/epic-backlog': { sectionLabel: 'Program', pageTitle: 'Epic Backlog' },
  '/program/:programId/roadmaps': { sectionLabel: 'Program', pageTitle: 'Epic Roadmap' },
  '/project/:projectKey': { sectionLabel: 'Project', pageTitle: 'Project' },
  '/releases': { sectionLabel: 'Release', pageTitle: 'Releases' },
};

/**
 * Helper to derive route meta from path
 * Falls back to extracting section/page from path segments
 */
export function getRouteMeta(pathname: string): { sectionLabel: string; pageTitle: string } {
  // Check exact match first
  if (ROUTE_META[pathname]) {
    return ROUTE_META[pathname];
  }

  // Check pattern matches (for dynamic routes)
  for (const [pattern, meta] of Object.entries(ROUTE_META)) {
    if (pattern.includes(':')) {
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
      if (regex.test(pathname)) {
        return meta;
      }
    }
  }

  // Fallback: derive from path segments
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return { sectionLabel: 'Home', pageTitle: 'Dashboard' };
  }

  const sectionLabel = segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
  const lastSegment = segments[segments.length - 1];
  const pageTitle = lastSegment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return { sectionLabel, pageTitle };
}

export default GlobalPageHeader;
