// ════════════════════════════════════════════════════════════════════════════
// BOARD COLUMN
// ════════════════════════════════════════════════════════════════════════════

import { Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BoardCard } from './BoardCard';
import type { BoardColumn as BoardColumnType } from '@/types/spaces';

interface BoardColumnProps {
  column: BoardColumnType;
  searchQuery: string;
}

export function BoardColumn({ column, searchQuery }: BoardColumnProps) {
  const filteredItems = column.items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isOverWipLimit = column.wipLimit && column.items.length > column.wipLimit;

  return (
    <div className="flex flex-col min-w-[280px] max-w-[280px] h-full">
      {/* Column Header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 rounded-t-lg',
          isOverWipLimit ? 'bg-destructive/10' : 'bg-muted'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
          <span className="font-medium text-sm text-foreground">{column.title}</span>
          <span className="text-xs text-muted-foreground">
            {column.items.length}
            {column.wipLimit && `/${column.wipLimit}`}
          </span>
        </div>
        <button className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* WIP Warning */}
      {isOverWipLimit && (
        <div className="px-3 py-1.5 bg-destructive/10 text-xs text-destructive border-b border-destructive/20">
          WIP limit exceeded
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 overflow-y-auto bg-muted/30 p-2 space-y-2 rounded-b-lg">
        {filteredItems.map((item) => (
          <BoardCard key={item.id} item={item} />
        ))}

        {filteredItems.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {searchQuery ? 'No matching items' : 'No items'}
          </div>
        )}

        {/* Add Item Button */}
        <button className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
          <Plus className="w-4 h-4" />
          Add item
        </button>
      </div>
    </div>
  );
}
