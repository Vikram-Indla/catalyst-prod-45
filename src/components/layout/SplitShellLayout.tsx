import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SplitShellLayoutProps {
  /** Left panel content (sidebar) */
  leftPanel?: ReactNode;
  /** Right body content */
  children: ReactNode;
  /** Left panel width in pixels (default: 192 for w-48, expands to 280 for expanded sidebars) */
  leftPanelWidth?: number;
  /** Whether the left panel is expanded */
  leftPanelExpanded?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Whether to show the vertical divider between panels */
  showVerticalDivider?: boolean;
}

/**
 * SplitShellLayout - Standardized layout wrapper for pages with left panel + right body split.
 * 
 * CRITICAL: This component ensures that all horizontal dividers are CONTINUOUS
 * across both left and right panels, rendered by the parent (this wrapper),
 * NOT by the child panels.
 * 
 * Layout Contract:
 * - Full white background (bg-white) for entire page
 * - Single continuous horizontal divider under top app header (rendered by CatalystShell)
 * - Grid-based 2-column layout: left panel (fixed width) + right body (1fr)
 * - Single vertical divider between panels (rendered by this wrapper)
 * - Child panels MUST NOT render their own border-r or border-b for header alignment
 */
export function SplitShellLayout({
  leftPanel,
  children,
  leftPanelWidth = 192,
  leftPanelExpanded = true,
  className,
  showVerticalDivider = true,
}: SplitShellLayoutProps) {
  // Calculate actual width based on expanded state
  const actualWidth = leftPanelExpanded ? leftPanelWidth : 64;
  
  return (
    <div 
      className={cn(
        'flex-1 flex overflow-hidden bg-white',
        className
      )}
    >
      {/* Left Panel */}
      {leftPanel && (
        <div
          className={cn(
            'flex-shrink-0 transition-all duration-300 relative',
            showVerticalDivider && 'border-r border-border'
          )}
          style={{ width: actualWidth }}
        >
          {leftPanel}
        </div>
      )}
      
      {/* Right Body */}
      <div className="flex-1 min-w-0 overflow-auto bg-white">
        {children}
      </div>
    </div>
  );
}

interface SplitHeaderRowProps {
  /** Left header content */
  leftContent?: ReactNode;
  /** Right header content */
  rightContent: ReactNode;
  /** Left panel width to match (default: 192) */
  leftPanelWidth?: number;
  /** Whether left panel is expanded */
  leftPanelExpanded?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * SplitHeaderRow - Renders a header row that spans both left and right columns
 * with a CONTINUOUS horizontal divider underneath.
 * 
 * Use this inside pages that have a left panel to ensure the header divider
 * spans the full width continuously.
 */
export function SplitHeaderRow({
  leftContent,
  rightContent,
  leftPanelWidth = 192,
  leftPanelExpanded = true,
  className,
}: SplitHeaderRowProps) {
  const actualWidth = leftPanelExpanded ? leftPanelWidth : 64;
  
  return (
    <div className={cn('border-b border-border bg-white', className)}>
      <div 
        className="flex"
        style={{ 
          display: 'grid',
          gridTemplateColumns: leftContent ? `${actualWidth}px 1fr` : '1fr',
        }}
      >
        {leftContent && (
          <div className="flex items-center h-[72px] px-4 border-r border-border">
            {leftContent}
          </div>
        )}
        <div className="flex items-center min-h-[72px]">
          {rightContent}
        </div>
      </div>
    </div>
  );
}

export default SplitShellLayout;
