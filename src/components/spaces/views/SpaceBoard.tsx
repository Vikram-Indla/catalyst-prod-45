// ════════════════════════════════════════════════════════════════════════════
// SPACE BOARD - Kanban board view (NO Scrum/Sprints)
// ════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Filter, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpace } from '@/hooks/spaces';
import { BoardColumn } from './board/BoardColumn';
import type { WorkItem, BoardColumn as BoardColumnType } from '@/types/spaces';

// Mock data
const mockColumns: BoardColumnType[] = [
  {
    id: 'todo',
    title: 'To Do',
    status: 'todo',
    color: '#64748b',
    wipLimit: 10,
    items: [
      { id: '1', key: 'DT-101', title: 'Implement user authentication flow', type: 'story', priority: 'high', storyPoints: 5 },
      { id: '2', key: 'DT-102', title: 'Fix login button alignment', type: 'bug', priority: 'medium' },
      { id: '3', key: 'DT-103', title: 'Add password reset functionality', type: 'story', priority: 'high', storyPoints: 3 },
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    status: 'in_progress',
    color: '#3b82f6',
    wipLimit: 5,
    items: [
      { id: '4', key: 'DT-98', title: 'Dashboard redesign', type: 'story', priority: 'highest', storyPoints: 8, assignee: { id: 'u1', name: 'Vikram S' } },
      { id: '5', key: 'DT-99', title: 'API rate limiting', type: 'task', priority: 'high', assignee: { id: 'u2', name: 'Sarah J' } },
    ],
  },
  {
    id: 'in-review',
    title: 'In Review',
    status: 'in_review',
    color: '#a855f7',
    items: [
      { id: '6', key: 'DT-95', title: 'Export to PDF feature', type: 'story', priority: 'medium', storyPoints: 5, assignee: { id: 'u3', name: 'Mike C' } },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    status: 'done',
    color: '#22c55e',
    items: [
      { id: '7', key: 'DT-90', title: 'Setup CI/CD pipeline', type: 'task', priority: 'high', assignee: { id: 'u1', name: 'Vikram S' } },
      { id: '8', key: 'DT-91', title: 'Database optimization', type: 'task', priority: 'medium', assignee: { id: 'u2', name: 'Sarah J' } },
    ],
  },
];

export function SpaceBoard() {
  const { id } = useParams<{ id: string }>();
  const { data: space, isLoading } = useSpace(id);
  const [columns, setColumns] = useState<BoardColumnType[]>(mockColumns);
  const [searchQuery, setSearchQuery] = useState('');

  const totalItems = columns.reduce((acc, col) => acc + col.items.length, 0);

  if (isLoading || !space) {
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
        <span className="text-sm text-muted-foreground">{totalItems} items</span>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-4 h-full">
          {columns.map((column) => (
            <BoardColumn key={column.id} column={column} searchQuery={searchQuery} />
          ))}

          {/* Add Column Button */}
          <button className="flex items-center justify-center gap-2 min-w-[280px] h-12 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            <Plus className="w-4 h-4" />
            Add Column
          </button>
        </div>
      </div>
    </div>
  );
}
