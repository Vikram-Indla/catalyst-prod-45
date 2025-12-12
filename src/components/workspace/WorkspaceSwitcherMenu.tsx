/**
 * WorkspaceSwitcherMenu - Unified dropdown component for Program/Project selection
 * Follows Atlassian Design System patterns with 8px spacing rhythm
 */
import React, { useState, useCallback } from 'react';
import { Search, Plus, Settings, Folder, LayoutGrid, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface WorkspaceItem {
  id: string;
  key: string;
  name: string;
  subtext?: string;
  canAccess: boolean;
}

export interface WorkspaceSwitcherMenuProps {
  title: 'Programs' | 'Projects';
  searchPlaceholder: string;
  items: WorkspaceItem[];
  isLoading?: boolean;
  showActions: boolean;
  onSelectItem: (item: WorkspaceItem) => void;
  onCreate?: () => void;
  onManage?: () => void;
}

export const WorkspaceSwitcherMenu = React.memo(function WorkspaceSwitcherMenu({
  title,
  searchPlaceholder,
  items,
  isLoading = false,
  showActions,
  onSelectItem,
  onCreate,
  onManage,
}: WorkspaceSwitcherMenuProps) {
  const [search, setSearch] = useState('');

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.key.toLowerCase().includes(search.toLowerCase())
  );

  const handleItemClick = useCallback((item: WorkspaceItem) => {
    if (item.canAccess) {
      onSelectItem(item);
    }
    // Disabled items do nothing on click
  }, [onSelectItem]);

  return (
    <div className="w-72 bg-popover border border-border rounded-md shadow-md overflow-hidden">
      {/* Header - compact 8px rhythm */}
      <div className="px-3 py-2 border-b border-border">
        {/* Title matches nav label size/weight */}
        <p className="text-sm font-medium text-foreground mb-2">{title}</p>
        <div className="relative">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm pr-8"
            autoFocus
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Items List - ~40-44px row height */}
      <div className="max-h-[280px] overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            {search ? `No ${title.toLowerCase()} found` : `No ${title.toLowerCase()} available`}
          </div>
        ) : (
          filtered.map((item) => (
            <WorkspaceListItem
              key={item.id}
              item={item}
              type={title === 'Programs' ? 'program' : 'project'}
              onClick={handleItemClick}
            />
          ))
        )}
      </div>

      {/* Footer Actions - Admin only */}
      {showActions && (onCreate || onManage) && (
        <div className="border-t border-border divide-y divide-border/50">
          {onCreate && (
            <button
              onClick={onCreate}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              Create {title === 'Programs' ? 'Program' : 'Project'}
            </button>
          )}
          {onManage && (
            <button
              onClick={onManage}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Manage {title}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

// Individual list item with access control styling
interface WorkspaceListItemProps {
  item: WorkspaceItem;
  type: 'program' | 'project';
  onClick: (item: WorkspaceItem) => void;
}

const WorkspaceListItem = React.memo(function WorkspaceListItem({
  item,
  type,
  onClick,
}: WorkspaceListItemProps) {
  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  const Icon = type === 'program' ? Folder : LayoutGrid;

  return (
    <button
      onClick={handleClick}
      disabled={!item.canAccess}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2.5 text-left transition-colors",
        item.canAccess 
          ? "hover:bg-muted cursor-pointer" 
          : "opacity-50 cursor-not-allowed"
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-sm text-foreground truncate whitespace-nowrap overflow-hidden text-ellipsis">
          {item.name}
        </span>
        {!item.canAccess && (
          <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        )}
      </div>
      {/* Show canonical 3-letter key only - never long keys, never for Default */}
      {item.key && item.key.length === 3 && (
        <span className="text-xs text-muted-foreground flex-shrink-0 w-[40px] text-right font-mono uppercase">
          {item.key}
        </span>
      )}
    </button>
  );
});
