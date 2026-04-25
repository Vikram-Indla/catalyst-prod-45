/**
 * PageChrome - Global page layout wrapper with unified header/breadcrumb
 * 
 * ALL in-scope routes must use this component to ensure:
 * - Consistent breadcrumb format (SECTION / Page Title)
 * - Single divider rule (only one divider under header/toolbar)
 * - No title icons
 * - Light/dark mode parity (spacing identical, only colors differ)
 * 
 * Usage:
 * <PageChrome rightActions={<SnapshotSelector />} toolbar={<ToolbarContent />}>
 *   {page content}
 * </PageChrome>
 */

import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getRouteConfig } from '@/config/routeRegistry';

interface PageChromeProps {
  /** Page content */
  children: ReactNode;
  /** Optional right-side header actions (filters, selectors, buttons) */
  rightActions?: ReactNode;
  /** Optional toolbar row below header - when provided, divider appears below toolbar */
  toolbar?: ReactNode;
  /** Override section label (uses route registry by default) */
  sectionOverride?: string;
  /** Override page title (uses route registry by default) */
  titleOverride?: string;
  /** Additional className for wrapper */
  className?: string;
  /** Hide header completely (for pages with custom header needs) */
  hideHeader?: boolean;
}

export function PageChrome({
  children,
  rightActions,
  toolbar,
  sectionOverride,
  titleOverride,
  className,
  hideHeader = false,
}: PageChromeProps) {
  const location = useLocation();
  const routeConfig = getRouteConfig(location.pathname);
  
  const section = sectionOverride || routeConfig.section;
  const pageTitle = titleOverride || routeConfig.pageTitle;

  return (
    <div 
      className={cn('h-full flex flex-col min-w-0', className)}
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {!hideHeader && (
        <div className="shrink-0" style={{ backgroundColor: 'var(--bg)' }}>
          {/* Row 1: Breadcrumb + Title + Actions - with border to align with sidebar */}
          <div
            className="flex items-center justify-between px-6"
            style={{ 
              height: '52px',
              borderBottom: '1px solid var(--divider)',
            }}
          >
            {/* Left: Title only (breadcrumb removed Apr 2026 — Decision A,
                matches BacklogPage.atlaskit.tsx:1114-1123 rationale: top nav
                + sidebar already show location, breadcrumb is redundant). */}
            <div className="flex items-center gap-2">
              <h1
                style={{
                  fontFamily: 'var(--ds-font-family-body)',
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'var(--text-1)',
                  letterSpacing: '-0.003em',
                  margin: 0,
                  lineHeight: 1.2,
                }}
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

          {/* Row 2: Toolbar - only rendered if toolbar provided, no additional border */}
          {toolbar && (
            <div
              className="flex items-center px-6"
              style={{
                height: '44px',
              }}
            >
              {toolbar}
            </div>
          )}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto min-w-0">
        {children}
      </div>
    </div>
  );
}

export default PageChrome;
