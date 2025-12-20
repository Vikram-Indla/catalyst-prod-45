// ═══════════════════════════════════════════════════════════════════════════
// CATALYST ENTERPRISE TABLE — SAVED VIEWS PANEL
// Dropdown for managing saved table views/presets
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { 
  Bookmark, BookmarkCheck, ChevronDown, Plus, Edit2, Trash2, 
  Star, StarOff, MoreHorizontal, Check, RotateCcw 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TableView } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SavedViewsPanelProps {
  views: TableView[];
  activeViewId?: string;
  onViewChange: (viewId: string) => void;
  onViewSave: (view: TableView) => void;
  onViewDelete?: (viewId: string) => void;
  onViewRename?: (viewId: string, newName: string) => void;
  onSetDefault?: (viewId: string) => void;
  onReset?: () => void;
  currentState?: Partial<TableView>;
  trigger?: React.ReactNode;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SavedViewsPanel({
  views,
  activeViewId,
  onViewChange,
  onViewSave,
  onViewDelete,
  onViewRename,
  onSetDefault,
  onReset,
  currentState,
  trigger,
}: SavedViewsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [newViewName, setNewViewName] = useState('');
  const [editingName, setEditingName] = useState('');

  const activeView = views.find(v => v.id === activeViewId);
  const systemViews = views.filter(v => v.isSystem);
  const customViews = views.filter(v => !v.isSystem);

  // Handle create new view
  const handleCreateView = () => {
    if (!newViewName.trim()) return;

    const newView: TableView = {
      id: `view-${Date.now()}`,
      name: newViewName.trim(),
      ...currentState,
    };

    onViewSave(newView);
    setNewViewName('');
    setIsCreating(false);
  };

  // Handle rename view
  const handleRenameView = (viewId: string) => {
    if (!editingName.trim() || !onViewRename) return;
    onViewRename(viewId, editingName.trim());
    setEditingViewId(null);
    setEditingName('');
  };

  // Start editing
  const startEditing = (view: TableView) => {
    setEditingViewId(view.id);
    setEditingName(view.name);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingViewId(null);
    setEditingName('');
    setIsCreating(false);
    setNewViewName('');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            {activeView ? (
              <BookmarkCheck className="h-4 w-4 text-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            {activeView?.name || 'Views'}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-medium text-foreground">Saved Views</span>
          <div className="flex items-center gap-1">
            {onReset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-7 w-7 p-0"
                title="Reset to default"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreating(true);
                setNewViewName('');
              }}
              className="h-7 w-7 p-0"
              title="Save current view"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-[320px]">
          {/* Create new view input */}
          {isCreating && (
            <div className="p-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Input
                  value={newViewName}
                  onChange={e => setNewViewName(e.target.value)}
                  placeholder="View name..."
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateView();
                    if (e.key === 'Escape') cancelEditing();
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCreateView}
                  disabled={!newViewName.trim()}
                  className="h-8 w-8 p-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* System views */}
          {systemViews.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 py-1">
                System Views
              </div>
              {systemViews.map(view => (
                <ViewItem
                  key={view.id}
                  view={view}
                  isActive={view.id === activeViewId}
                  isEditing={editingViewId === view.id}
                  editingName={editingName}
                  onSelect={() => {
                    onViewChange(view.id);
                    setIsOpen(false);
                  }}
                  onEditNameChange={setEditingName}
                  onSaveEdit={() => handleRenameView(view.id)}
                  onCancelEdit={cancelEditing}
                />
              ))}
            </div>
          )}

          {/* Custom views */}
          {customViews.length > 0 && (
            <div className="p-2 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 py-1">
                Custom Views
              </div>
              {customViews.map(view => (
                <ViewItem
                  key={view.id}
                  view={view}
                  isActive={view.id === activeViewId}
                  isEditing={editingViewId === view.id}
                  editingName={editingName}
                  onSelect={() => {
                    onViewChange(view.id);
                    setIsOpen(false);
                  }}
                  onEditNameChange={setEditingName}
                  onSaveEdit={() => handleRenameView(view.id)}
                  onCancelEdit={cancelEditing}
                  onStartEdit={() => startEditing(view)}
                  onDelete={onViewDelete ? () => onViewDelete(view.id) : undefined}
                  onSetDefault={onSetDefault ? () => onSetDefault(view.id) : undefined}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {views.length === 0 && !isCreating && (
            <div className="p-6 text-center">
              <Bookmark className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No saved views yet</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsCreating(true)}
                className="mt-2"
              >
                Save current view
              </Button>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {views.length > 0 && (
          <div className="border-t border-border p-2">
            <p className="text-xs text-muted-foreground text-center">
              {customViews.length} custom {customViews.length === 1 ? 'view' : 'views'}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── View Item Component ────────────────────────────────────────────────────

interface ViewItemProps {
  view: TableView;
  isActive: boolean;
  isEditing: boolean;
  editingName: string;
  onSelect: () => void;
  onEditNameChange: (name: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
}

function ViewItem({
  view,
  isActive,
  isEditing,
  editingName,
  onSelect,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDelete,
  onSetDefault,
}: ViewItemProps) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 px-2 py-1">
        <Input
          value={editingName}
          onChange={e => onEditNameChange(e.target.value)}
          className="h-7 text-sm flex-1"
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') onSaveEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={onSaveEdit}
          className="h-7 w-7 p-0"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer',
        'transition-colors group',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-muted/50 text-foreground'
      )}
      onClick={onSelect}
    >
      {/* Default star */}
      {view.isDefault && (
        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
      )}

      {/* View name */}
      <span className="flex-1 text-sm truncate">{view.name}</span>

      {/* Active indicator */}
      {isActive && <Check className="h-4 w-4 shrink-0" />}

      {/* Actions menu (for non-system views) */}
      {!view.isSystem && (onStartEdit || onDelete || onSetDefault) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={e => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {onStartEdit && (
              <DropdownMenuItem onClick={onStartEdit}>
                <Edit2 className="h-3.5 w-3.5 mr-2" />
                Rename
              </DropdownMenuItem>
            )}
            {onSetDefault && (
              <DropdownMenuItem onClick={onSetDefault}>
                {view.isDefault ? (
                  <>
                    <StarOff className="h-3.5 w-3.5 mr-2" />
                    Remove Default
                  </>
                ) : (
                  <>
                    <Star className="h-3.5 w-3.5 mr-2" />
                    Set as Default
                  </>
                )}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
