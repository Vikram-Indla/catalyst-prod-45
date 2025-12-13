/**
 * Master Page Layout - per CATALYST_MASTER_PAGE_SPECIFICATION v1.0
 * Provides the standard layout structure for all Catalyst pages:
 * - Main content area fills remaining space
 * - Page header (2-row pattern) at top
 * - Page body scrollable below header
 */

import React, { ReactNode } from 'react';

interface MasterPageLayoutProps {
  /** Page header component (use MasterPageHeader) */
  header: ReactNode;
  /** Main page body content */
  children: ReactNode;
  /** Optional className for the main content area */
  className?: string;
}

export function MasterPageLayout({ 
  header, 
  children,
  className = ''
}: MasterPageLayoutProps) {
  return (
    <div className={`h-full flex flex-col bg-card ${className}`}>
      {/* Page Header - fixed at top */}
      {header}
      
      {/* Page Body - scrollable, fills remaining space */}
      <div 
        className="flex-1 overflow-auto"
        style={{ backgroundColor: '#f7f8fa' }} // bg-page per spec
      >
        {children}
      </div>
    </div>
  );
}
