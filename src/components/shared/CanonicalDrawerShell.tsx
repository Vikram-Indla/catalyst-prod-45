/**
 * =====================================================
 * CANONICAL DRAWER SHELL
 * =====================================================
 * 
 * This is the unified drawer shell that ALL entity drawers must use.
 * Reference: Business Request / Demand Drawer
 * 
 * Features:
 * - Consistent width: w-screen sm:w-[65vw] sm:max-w-[980px]
 * - Gold header border
 * - Entity ID in gold text with link icon
 * - Editable title
 * - Gold Save dropdown
 * - Kebab menu, expand/close icons
 * - Status row (optional)
 * - executive-tab styled tabs
 * - Unsaved changes protection
 */

import { useState, useRef, ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  X,
  Pencil,
  Link as LinkIcon,
  ChevronDown,
  Maximize2,
  Minimize2,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';

export interface DrawerTab {
  value: string;
  label: string;
  content: ReactNode;
}

export interface KebabMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'warning';
  separator?: boolean;
}

export interface CanonicalDrawerShellProps {
  // Core props
  open: boolean;
  onClose: () => void;
  
  // Entity identification
  entityId: string;
  entityKey?: string; // e.g., "MIM-004", "EPIC-001"
  entityTitle: string;
  entityType: string; // For link generation
  
  // Title editing
  onTitleChange?: (newTitle: string) => void;
  isTitleEditable?: boolean;
  
  // Save functionality
  onSave?: () => void;
  onSaveAndClose?: () => void;
  hasChanges?: boolean;
  isSaving?: boolean;
  
  // Status row (optional)
  statusRow?: ReactNode;
  
  // Secondary header row (module-specific metadata)
  secondaryHeaderRow?: ReactNode;
  
  // Tabs
  tabs: DrawerTab[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  
  // Kebab menu items
  kebabMenuItems?: KebabMenuItem[];
  
  // Screen reader description
  description?: string;
}

export function CanonicalDrawerShell({
  open,
  onClose,
  entityId,
  entityKey,
  entityTitle,
  entityType,
  onTitleChange,
  isTitleEditable = true,
  onSave,
  onSaveAndClose,
  hasChanges = false,
  isSaving = false,
  statusRow,
  secondaryHeaderRow,
  tabs,
  defaultTab,
  activeTab: controlledActiveTab,
  onTabChange,
  kebabMenuItems = [],
  description,
}: CanonicalDrawerShellProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(entityTitle);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || tabs[0]?.value || '');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Use controlled or internal tab state
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = onTabChange ?? setInternalActiveTab;

  // Sync editedName when entityTitle changes
  if (entityTitle !== editedName && !isEditingName) {
    setEditedName(entityTitle);
  }

  // Width classes based on expanded state
  const drawerWidthClass = isExpanded
    ? 'w-screen sm:w-[70vw] sm:max-w-[1120px]'
    : 'w-screen sm:w-[65vw] sm:max-w-[980px]';

  // Copy link handler
  const handleCopyLink = () => {
    const url = `${window.location.origin}/${entityType}/${entityId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  // Edit name handlers
  const handleStartEditName = () => {
    if (!isTitleEditable) return;
    setIsEditingName(true);
    setEditedName(entityTitle);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== entityTitle && onTitleChange) {
      onTitleChange(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(entityTitle);
    }
  };

  // Close handling with unsaved changes protection
  const handleAttemptClose = () => {
    if (hasChanges) {
      setShowUnsavedChangesDialog(true);
    } else {
      onClose();
    }
  };

  const handleDiscardAndClose = () => {
    setShowUnsavedChangesDialog(false);
    onClose();
  };

  const handleSaveAndCloseFromDialog = () => {
    setShowUnsavedChangesDialog(false);
    if (onSaveAndClose) {
      onSaveAndClose();
    } else if (onSave) {
      onSave();
      onClose();
    }
  };

  // Toggle expand/collapse
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle save
  const handleSave = () => {
    if (onSave) onSave();
  };

  const handleSaveAndClose = () => {
    if (onSaveAndClose) {
      onSaveAndClose();
    } else if (onSave) {
      onSave();
      onClose();
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleAttemptClose()}>
        <SheetContent
          side="right"
          hideClose
          className={`executive-drawer ${drawerWidthClass} p-0 flex flex-col overflow-hidden bg-white`}
        >
          <SheetHeader className="executive-drawer-header flex-col space-y-0 shrink-0 p-0 bg-white">
            {/* Primary Header Row */}
            <div className="flex items-center justify-between px-4 md:px-5 pt-4 pb-3 border-b border-brand-gold bg-white">
              {/* Left side: Entity ID + Title */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm font-medium text-brand-gold">
                    {entityKey || entityId?.slice(0, 8) || '...'}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="text-muted-foreground/60 hover:text-brand-gold transition-colors p-0.5"
                    title="Copy link"
                  >
                    <LinkIcon className="h-3 w-3" />
                  </button>
                </div>

                {/* Editable title */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0 group">
                  {isEditingName ? (
                    <Input
                      ref={nameInputRef}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={handleNameKeyDown}
                      className="text-base font-medium h-auto py-1 px-2 border-brand-gold/50 focus:border-brand-gold"
                    />
                  ) : (
                    <>
                      <SheetTitle className="truncate text-base font-medium text-foreground">
                        {entityTitle || 'Loading...'}
                      </SheetTitle>
                      {isTitleEditable && (
                        <button
                          onClick={handleStartEditName}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-brand-gold transition-all p-0.5"
                          title="Rename"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Right side: Save dropdown + action icons */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Save dropdown */}
                {(onSave || onSaveAndClose) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-sm font-medium bg-brand-gold hover:bg-brand-gold-hover text-white"
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                        <ChevronDown className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onSelect={handleSave}>Save</DropdownMenuItem>
                      <DropdownMenuItem onSelect={handleSaveAndClose}>Save & Close</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Kebab menu */}
                {kebabMenuItems.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-popover">
                      {kebabMenuItems.map((item, index) => (
                        <div key={index}>
                          {item.separator && <DropdownMenuSeparator />}
                          <DropdownMenuItem
                            onSelect={item.onClick}
                            className={
                              item.variant === 'destructive'
                                ? 'text-destructive focus:text-destructive'
                                : item.variant === 'warning'
                                ? 'text-warning focus:text-warning'
                                : ''
                            }
                          >
                            {item.icon}
                            {item.label}
                          </DropdownMenuItem>
                        </div>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Expand/collapse button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleExpand}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>

                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAttemptClose}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <SheetDescription className="sr-only">
              {description || `${entityType} details panel`}
            </SheetDescription>
          </SheetHeader>

          {/* Secondary Header Row (module-specific metadata) */}
          {secondaryHeaderRow && (
            <div className="px-4 md:px-5 py-2 bg-muted/10 border-b border-border/40">
              {secondaryHeaderRow}
            </div>
          )}

          {/* Status Row */}
          {statusRow && (
            <div className="px-4 md:px-5 py-2 flex items-center bg-white shrink-0">
              {statusRow}
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="executive-tabs-list w-full justify-start rounded-none border-b border-border h-10 shrink-0 overflow-x-auto flex-nowrap bg-white px-4 md:px-5">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="executive-tab whitespace-nowrap">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="executive-drawer-content flex-1 flex flex-col min-h-0 overflow-y-auto">
              {tabs.map((tab) => (
                <TabsContent
                  key={tab.value}
                  value={tab.value}
                  className="m-0 focus-visible:outline-none flex-1"
                >
                  {tab.content}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedChangesDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardAndClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
            {(onSave || onSaveAndClose) && (
              <AlertDialogAction
                onClick={handleSaveAndCloseFromDialog}
                className="bg-brand-gold text-white hover:bg-brand-gold-hover"
              >
                Save & Close
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
