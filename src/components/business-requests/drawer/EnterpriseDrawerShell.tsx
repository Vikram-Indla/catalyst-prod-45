/**
 * EnterpriseDrawerShell - Reusable enterprise-grade drawer wrapper
 * Provides consistent layout, spacing, and theming for all drawers
 * 
 * Features:
 * - Sticky header with breadcrumb, title, status, and actions
 * - Sticky tabs row with horizontal scroll
 * - 2-column layout support (main content + CIO panel)
 * - Token-based theming for light/dark mode
 * - Enterprise density (8px grid)
 */

import { ReactNode, useState, useRef, KeyboardEvent } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  X, 
  Pencil, 
  Link as LinkIcon, 
  ChevronDown, 
  Maximize2, 
  Minimize2,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnterpriseDrawerShellProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Header content
  breadcrumb?: string;
  entityKey?: string;
  title: string;
  onTitleChange?: (newTitle: string) => void;
  onCopyLink?: () => void;
  
  // Status control (rendered in header)
  statusControl?: ReactNode;
  
  // Metadata chips (rendered under title)
  metadataChips?: ReactNode;
  
  // Save/actions
  onSave?: () => void;
  onSaveAndClose?: () => void;
  saveDisabled?: boolean;
  additionalActions?: Array<{
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive';
  }>;
  
  // Layout
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  
  // CIO Panel
  cioPanelContent?: ReactNode;
  cioPanelCollapsed?: boolean;
  onToggleCIOPanel?: () => void;
  
  // Children (tabs + content)
  children: ReactNode;
}

export function EnterpriseDrawerShell({
  isOpen,
  onClose,
  breadcrumb = 'Details',
  entityKey,
  title,
  onTitleChange,
  onCopyLink,
  statusControl,
  metadataChips,
  onSave,
  onSaveAndClose,
  saveDisabled,
  additionalActions = [],
  isExpanded = false,
  onToggleExpand,
  cioPanelContent,
  cioPanelCollapsed = false,
  onToggleCIOPanel,
  children
}: EnterpriseDrawerShellProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Title edit handlers
  const handleStartEditTitle = () => {
    if (!onTitleChange) return;
    setIsEditingTitle(true);
    setEditedTitle(title);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== title && onTitleChange) {
      onTitleChange(editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setEditedTitle(title);
    }
  };

  // Drawer width based on expanded state
  const drawerWidthClass = isExpanded 
    ? 'w-screen sm:w-[75vw] sm:max-w-[1200px]' 
    : 'w-screen sm:w-[65vw] sm:max-w-[980px]';

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        hideClose 
        className={cn(
          "enterprise-drawer p-0 flex flex-col overflow-hidden",
          drawerWidthClass
        )}
        style={{ background: 'var(--surface-1)' }}
      >
        {/* ========== STICKY HEADER ========== */}
        <SheetHeader 
          className="enterprise-drawer-header flex-col space-y-0 shrink-0 p-0" 
          style={{ background: 'var(--surface-1)' }}
        >
          {/* Row 1: Breadcrumb + Entity Key */}
          <div className="px-4 md:px-5 pt-3 pb-1 flex items-center gap-2">
            <span 
              className="text-[10px] uppercase tracking-wider font-medium"
              style={{ color: 'var(--text-3)' }}
            >
              {breadcrumb}
            </span>
            {entityKey && (
              <>
                <span style={{ color: 'var(--text-3)' }}>/</span>
                <span className="text-xs font-semibold text-secondary-green">
                  {entityKey}
                </span>
              </>
            )}
            {onCopyLink && (
              <button
                onClick={onCopyLink}
                className="p-0.5 transition-colors"
                style={{ color: 'var(--text-3)' }}
                title="Copy link"
              >
                <LinkIcon className="h-3 w-3 hover:text-[var(--accent-color)]" />
              </button>
            )}
          </div>

          {/* Row 2: Title + Status + Actions */}
          <div 
            className="flex items-start justify-between px-4 md:px-5 pb-3 gap-4" 
            style={{ background: 'var(--surface-1)' }}
          >
            {/* Left: Title + Status + Metadata */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Editable title */}
              <div className="flex items-center gap-1.5 group">
                {isEditingTitle ? (
                  <Input
                    ref={titleInputRef}
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={handleTitleKeyDown}
                    className="text-base font-semibold h-auto py-1 px-2 max-w-[500px]"
                    style={{ 
                      borderColor: 'var(--accent-color)',
                      background: 'var(--input-bg)',
                      color: 'var(--text-1)'
                    }}
                  />
                ) : (
                  <>
                    <SheetTitle 
                      className="text-base font-semibold truncate max-w-[500px]" 
                      style={{ color: 'var(--text-1)' }}
                      title={title}
                    >
                      {title || 'Untitled'}
                    </SheetTitle>
                    {onTitleChange && (
                      <button
                        onClick={handleStartEditTitle}
                        className="opacity-0 group-hover:opacity-100 transition-all p-0.5"
                        style={{ color: 'var(--text-3)' }}
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5 hover:text-[var(--accent-color)]" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Status control + Metadata chips row */}
              <div className="flex items-center gap-3 flex-wrap">
                {statusControl}
                {metadataChips}
              </div>
            </div>
            
            {/* Right: Save + Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onSave && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      disabled={saveDisabled}
                      className="h-8 px-3 text-sm font-medium"
                      style={{
                        background: 'var(--btn-primary-bg)',
                        color: 'var(--btn-primary-text)'
                      }}
                    >
                      Save
                      <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="z-[400]"
                    style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}
                  >
                    <DropdownMenuItem onSelect={onSave}>Save</DropdownMenuItem>
                    {onSaveAndClose && (
                      <DropdownMenuItem onSelect={onSaveAndClose}>Save & Close</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Additional actions menu */}
              {additionalActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      style={{ color: 'var(--text-3)' }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-56 z-[400]"
                    style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}
                  >
                    {additionalActions.map((action, idx) => (
                      <DropdownMenuItem
                        key={idx}
                        onSelect={action.onClick}
                        className={cn(
                          action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                        )}
                      >
                        {action.icon}
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Expand/Collapse */}
              {onToggleExpand && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleExpand}
                  className="h-8 w-8"
                  style={{ color: 'var(--text-3)' }}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              )}
              
              {/* Close */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="h-8 w-8"
                style={{ color: 'var(--text-3)' }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Bottom accent border */}
          <div style={{ borderBottom: '2px solid var(--accent-color)' }} />
          <SheetDescription className="sr-only">Entity details panel</SheetDescription>
        </SheetHeader>

        {/* ========== BODY: Tabs + CIO Panel ========== */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Main content area (tabs + content) */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {children}
          </div>
          
          {/* CIO Panel (right sidebar) - optional */}
          {cioPanelContent}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Export common drawer section components for consistent styling
export function DrawerSection({ 
  title, 
  children, 
  className,
  collapsible = false,
  defaultCollapsed = false
}: { 
  title?: string; 
  children: ReactNode; 
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div 
      className={cn("rounded-md", className)}
      style={{ 
        background: 'var(--surface-2)', 
        border: '1px solid var(--border-color)' 
      }}
    >
      {title && (
        <div 
          className={cn(
            "px-3 py-2 flex items-center justify-between",
            collapsible && "cursor-pointer hover:bg-[var(--surface-3)]"
          )}
          style={{ borderBottom: isCollapsed ? 'none' : '1px solid var(--divider)' }}
          onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
        >
          <span 
            className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: 'var(--text-3)' }}
          >
            {title}
          </span>
        </div>
      )}
      {!isCollapsed && (
        <div className="px-3 py-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function DrawerDetailRow({
  label,
  value,
  onEdit,
  className
}: {
  label: string;
  value: ReactNode;
  onEdit?: () => void;
  className?: string;
}) {
  return (
    <div 
      className={cn(
        "flex items-start gap-2 py-1.5 group",
        onEdit && "cursor-pointer hover:bg-[var(--surface-3)] -mx-2 px-2 rounded",
        className
      )}
      onClick={onEdit}
    >
      <div className="flex-1 min-w-0">
        <div 
          className="text-[10px] uppercase tracking-wider font-medium"
          style={{ color: 'var(--text-3)' }}
        >
          {label}
        </div>
        <div 
          className="text-xs font-medium mt-0.5 truncate"
          style={{ color: 'var(--text-1)' }}
        >
          {value || <span style={{ color: 'var(--text-3)' }}>Not set</span>}
        </div>
      </div>
      {onEdit && (
        <Pencil 
          className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1"
          style={{ color: 'var(--text-3)' }}
        />
      )}
    </div>
  );
}

// Empty state for tabs
export function DrawerEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-12 px-6 rounded-md"
      style={{ 
        background: 'var(--empty-state-bg)', 
        border: '1px solid var(--empty-state-border)' 
      }}
    >
      {icon && (
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
          style={{ background: 'var(--surface-3)' }}
        >
          {icon}
        </div>
      )}
      <h4 
        className="text-sm font-medium mb-1"
        style={{ color: 'var(--text-1)' }}
      >
        {title}
      </h4>
      {description && (
        <p 
          className="text-xs text-center max-w-xs mb-4"
          style={{ color: 'var(--empty-state-text)' }}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button 
          size="sm" 
          onClick={onAction}
          className="h-8 px-3 text-sm"
          style={{
            background: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)'
          }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// Tab toolbar for consistent tab headers
export function DrawerTabToolbar({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div 
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-2 shrink-0",
        className
      )}
      style={{ 
        background: 'var(--surface-2)', 
        borderBottom: '1px solid var(--divider)' 
      }}
    >
      {children}
    </div>
  );
}
