// ════════════════════════════════════════════════════════════════════════════
// SPACE BOARD - Kanban board view with real work items
// ════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Filter, Search, Package } from 'lucide-react';
import { useSpace, useSpaceWorkItems, useUpdateSpaceWorkItem, type SpaceWorkItemStatus } from '@/hooks/spaces';
import { BoardColumn } from './board/BoardColumn';
import { useSpaceStore } from '@/stores/spaceStore';
import type { BoardColumn as BoardColumnType, WorkItem } from '@/types/spaces';

const BOARD_COLUMNS: { id: string; title: string; status: SpaceWorkItemStatus; color: string }[] = [
  { id: 'backlog', title: 'Backlog', status: 'backlog', color: '#64748b' },
  { id: 'ready', title: 'Ready', status: 'ready', color: '#0ea5e9' },
  { id: 'in-progress', title: 'In Progress', status: 'in_progress', color: '#3b82f6' },
  { id: 'in-review', title: 'In Review', status: 'in_review', color: '#a855f7' },
  { id: 'done', title: 'Done', status: 'done', color: '#22c55e' },
];

export function SpaceBoard() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { data: space, isLoading: spaceLoading } = useSpace(spaceId);
  const { data: items = [], isLoading: itemsLoading } = useSpaceWorkItems(spaceId);
  const updateWorkItem = useUpdateSpaceWorkItem();
  const { openCreateWorkItemModal } = useSpaceStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Group items by status into columns
  const columns: BoardColumnType[] = useMemo(() => {
    const filteredItems = items.filter(
      (item) =>
        !searchQuery ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return BOARD_COLUMNS.map((col) => ({
      id: col.id,
      title: col.title,
      status: col.status,
      color: col.color,
      items: filteredItems
        .filter((item) => item.status === col.status)
        .map((item) => ({
          id: item.id,
          key: item.key,
          title: item.summary,
          type: item.type as WorkItem['type'],
          priority: item.priority as WorkItem['priority'],
          storyPoints: item.story_points ?? undefined,
          assignee: item.assignee
            ? { id: item.assignee.id, name: item.assignee.full_name || 'Unknown', avatar: item.assignee.avatar_url || undefined }
            : undefined,
        })),
    }));
  }, [items, searchQuery]);

  const totalItems = items.length;
  const isLoading = spaceLoading || itemsLoading;

  if (isLoading && !space) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{totalItems} items</span>
          <button
            onClick={() => openCreateWorkItemModal('story')}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {totalItems === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Package className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No work items yet</p>
            <p className="text-sm mb-4">Create your first story, task, or bug</p>
            <button
              onClick={() => openCreateWorkItemModal('story')}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Work Item
            </button>
          </div>
        ) : (
          <div className="flex gap-4 h-full">
            {columns.map((column) => (
              <BoardColumn key={column.id} column={column} searchQuery={searchQuery} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
