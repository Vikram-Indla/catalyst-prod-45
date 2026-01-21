// ════════════════════════════════════════════════════════════════════════════
// SPACE BACKLOG - List view of all work items (Epics, Features, Stories)
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Search, Filter, ArrowUp, ArrowDown, Minus, Bug, BookOpen, CheckSquare, Layers, Target, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpace, useSpaceWorkItems, type SpaceWorkItem, type SpaceWorkItemType } from '@/hooks/spaces';
import { UserAvatar } from '../shared/UserAvatar';
import { useSpaceStore } from '@/stores/spaceStore';

const typeConfig: Record<SpaceWorkItemType, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  epic: { icon: Target, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20', label: 'Epic' },
  feature: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20', label: 'Feature' },
  story: { icon: BookOpen, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20', label: 'Story' },
  task: { icon: CheckSquare, color: 'text-primary', bg: 'bg-primary/10', label: 'Task' },
  bug: { icon: Bug, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20', label: 'Bug' },
  subtask: { icon: Layers, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/20', label: 'Subtask' },
};

const priorityConfig = {
  highest: { icon: ArrowUp, color: 'text-red-600', label: 'Highest' },
  high: { icon: ArrowUp, color: 'text-red-500', label: 'High' },
  medium: { icon: Minus, color: 'text-amber-500', label: 'Medium' },
  low: { icon: ArrowDown, color: 'text-blue-500', label: 'Low' },
  lowest: { icon: ArrowDown, color: 'text-blue-400', label: 'Lowest' },
};

const statusConfig: Record<string, { color: string; bg: string }> = {
  backlog: { color: 'text-muted-foreground', bg: 'bg-muted' },
  ready: { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  in_progress: { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/20' },
  in_review: { color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20' },
  blocked: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20' },
  done: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
  closed: { color: 'text-muted-foreground', bg: 'bg-muted' },
};

export function SpaceBacklog() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { data: space, isLoading: spaceLoading } = useSpace(spaceId);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<SpaceWorkItemType | ''>('');
  const { openCreateWorkItemModal } = useSpaceStore();

  const { data: items = [], isLoading: itemsLoading } = useSpaceWorkItems(spaceId, {
    type: typeFilter || undefined,
    search: searchQuery || undefined,
  });

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
              placeholder="Search backlog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as SpaceWorkItemType | '')}
            className="px-3 py-2 border border-border rounded-md text-sm bg-background focus:border-primary focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="epic">Epics</option>
            <option value="feature">Features</option>
            <option value="story">Stories</option>
            <option value="task">Tasks</option>
            <option value="bug">Bugs</option>
          </select>
        </div>
        <button 
          onClick={() => openCreateWorkItemModal()}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Package className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No work items yet</p>
            <p className="text-sm">Create your first epic, feature, or story</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="text-left text-xs font-medium text-muted-foreground uppercase">
                <th className="px-4 py-3 w-16">Type</th>
                <th className="px-4 py-3 w-28">Key</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3 w-28">Status</th>
                <th className="px-4 py-3 w-24">Priority</th>
                <th className="px-4 py-3 w-20">Points</th>
                <th className="px-4 py-3 w-40">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => {
                const typeStyle = typeConfig[item.type];
                const TypeIcon = typeStyle?.icon || CheckSquare;
                const priorityStyle = priorityConfig[item.priority] || priorityConfig.medium;
                const PriorityIcon = priorityStyle.icon;
                const status = statusConfig[item.status] || statusConfig.backlog;

                return (
                  <tr key={item.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className={cn('inline-flex p-1.5 rounded', typeStyle?.bg)}>
                        <TypeIcon className={cn('w-4 h-4', typeStyle?.color)} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground">{item.key}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{item.summary}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize', status.bg, status.color)}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <PriorityIcon className={cn('w-4 h-4', priorityStyle.color)} />
                        <span className="text-xs text-muted-foreground">{priorityStyle.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.story_points != null && (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-muted rounded text-xs font-medium text-foreground">
                          {item.story_points}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.assignee ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar name={item.assignee.full_name || 'Unknown'} size="xs" />
                          <span className="text-sm text-foreground">{item.assignee.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
