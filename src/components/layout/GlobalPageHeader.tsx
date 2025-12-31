/**
 * GlobalPageHeader — Unified enterprise page header with inline breadcrumb
 * 
 * CATALYST BREADCRUMB CONTRACT (PageChrome style):
 * - Inline format: SECTION / Page Title (single row)
 * - No duplication between breadcrumb and title
 * 
 * Structure:
 * - Row 1: Breadcrumb + Title (inline) + optional right actions
 * - Row 2 (optional): Toolbar with controls
 */

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlobalPageHeaderProps {
  /** 
   * Breadcrumb path - can be:
   * - Single string: "RELEASE" (section only)
   * - Slash-separated: "RELEASE / Incidents / Reports" (will truncate to max 2)
   * - Array: ['RELEASE', 'Incidents', 'Reports'] (will truncate to max 2)
   */
  sectionLabel: string | string[];
  /** Page title - final semantic node, displayed as H1 */
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

/**
 * Parse breadcrumb input into segments (max 2)
 */
function parseBreadcrumb(input: string | string[], pageTitle: string): string[] {
  let segments: string[];
  
  if (Array.isArray(input)) {
    segments = input.filter(Boolean);
  } else {
    segments = input.split('/').map(s => s.trim()).filter(Boolean);
  }
  
  // Remove any segment that matches the page title (avoid duplication)
  segments = segments.filter(s => 
    s.toLowerCase() !== pageTitle.toLowerCase() &&
    !pageTitle.toLowerCase().includes(s.toLowerCase().replace(' report', ''))
  );
  
  // Limit to max 2 segments
  return segments.slice(0, 2);
}

export function GlobalPageHeader({
  sectionLabel,
  pageTitle,
  rightActions,
  toolbar,
  showDivider = true,
  className,
}: GlobalPageHeaderProps) {
  const breadcrumbSegments = parseBreadcrumb(sectionLabel, pageTitle);
  
  return (
    <div 
      className={cn('shrink-0', className)} 
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Row 1: Inline Breadcrumb + Title + Actions (PageChrome style) */}
      <div
        className="flex items-center justify-between px-6"
        style={{ 
          height: '52px',
          borderBottom: !toolbar && showDivider ? '1px solid var(--divider)' : undefined,
        }}
      >
        {/* Left: Breadcrumb + Title (inline) */}
        <div className="flex items-center gap-2">
          {breadcrumbSegments.map((segment, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <span 
                  className="text-[14px]" 
                  style={{ color: 'var(--text-4)' }}
                  aria-hidden="true"
                >
                  /
                </span>
              )}
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-3)' }}
              >
                {segment.toUpperCase()}
              </span>
            </React.Fragment>
          ))}
          {breadcrumbSegments.length > 0 && (
            <span 
              className="text-[14px]" 
              style={{ color: 'var(--text-4)' }}
            >
              /
            </span>
          )}
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
  '/enterprise/roadmaps': { sectionLabel: 'Enterprise', pageTitle: 'Enterprise Roadmap' },
  '/industry/backlog': { sectionLabel: 'Product', pageTitle: 'Product Backlog' },
  '/industry/kanban': { sectionLabel: 'Product', pageTitle: 'Product Kanban' },
  '/industry/roadmaps': { sectionLabel: 'Product', pageTitle: 'Product Roadmap' },
  '/product/capacity': { sectionLabel: 'Product', pageTitle: 'Capacity Planning' },
  '/program/:programId/backlog': { sectionLabel: 'Program', pageTitle: 'Program Backlog' },
  '/program/:programId/epic-backlog': { sectionLabel: 'Program', pageTitle: 'Epic Backlog' },
  '/program/:programId/feature-backlog': { sectionLabel: 'Program', pageTitle: 'Feature Backlog' },
  '/program/:programId/roadmaps': { sectionLabel: 'Program', pageTitle: 'Program Roadmap' },
  '/project/:projectKey': { sectionLabel: 'Project', pageTitle: 'Project' },
  '/releases': { sectionLabel: 'Release', pageTitle: 'Releases' },
  '/release/incidents': { sectionLabel: 'Release', pageTitle: 'Incidents' },
  '/release/incidents/reports': { sectionLabel: 'Release / Incidents', pageTitle: 'Reports' },
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
