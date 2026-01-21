// ════════════════════════════════════════════════════════════════════════════
// SPACE BACKLOG - List view of all work items
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Search, Filter, ArrowUp, ArrowDown, Minus, Bug, BookOpen, CheckSquare, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpace } from '@/hooks/spaces';
import { UserAvatar } from '../shared/UserAvatar';
import type { WorkItem } from '@/types/spaces';

// Mock data
const mockItems: WorkItem[] = [
  { id: '1', key: 'DT-101', title: 'Implement user authentication flow', type: 'story', priority: 'high', storyPoints: 5 },
  { id: '2', key: 'DT-102', title: 'Fix login button alignment', type: 'bug', priority: 'medium' },
  { id: '3', key: 'DT-103', title: 'Add password reset functionality', type: 'story', priority: 'high', storyPoints: 3 },
  { id: '4', key: 'DT-98', title: 'Dashboard redesign', type: 'story', priority: 'highest', storyPoints: 8, assignee: { id: 'u1', name: 'Vikram S' } },
  { id: '5', key: 'DT-99', title: 'API rate limiting', type: 'task', priority: 'high', assignee: { id: 'u2', name: 'Sarah J' } },
  { id: '6', key: 'DT-95', title: 'Export to PDF feature', type: 'story', priority: 'medium', storyPoints: 5, assignee: { id: 'u3', name: 'Mike C' } },
  { id: '7', key: 'DT-90', title: 'Setup CI/CD pipeline', type: 'task', priority: 'high', assignee: { id: 'u1', name: 'Vikram S' } },
  { id: '8', key: 'DT-91', title: 'Database optimization', type: 'task', priority: 'medium', assignee: { id: 'u2', name: 'Sarah J' } },
];

const typeConfig = {
  story: { icon: BookOpen, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
  task: { icon: CheckSquare, color: 'text-primary', bg: 'bg-primary/10' },
  bug: { icon: Bug, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20' },
  subtask: { icon: Layers, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/20' },
};

const priorityConfig = {
  highest: { icon: ArrowUp, color: 'text-red-600', label: 'Highest' },
  high: { icon: ArrowUp, color: 'text-red-500', label: 'High' },
  medium: { icon: Minus, color: 'text-amber-500', label: 'Medium' },
  low: { icon: ArrowDown, color: 'text-blue-500', label: 'Low' },
  lowest: { icon: ArrowDown, color: 'text-blue-400', label: 'Lowest' },
};

export function SpaceBacklog() {
  const { id } = useParams<{ id: string }>();
  const { data: space, isLoading } = useSpace(id);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = mockItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              placeholder="Search backlog..."
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
        <button className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Create Issue
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr className="text-left text-xs font-medium text-muted-foreground uppercase">
              <th className="px-4 py-3 w-16">Type</th>
              <th className="px-4 py-3 w-24">Key</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3 w-24">Priority</th>
              <th className="px-4 py-3 w-20">Points</th>
              <th className="px-4 py-3 w-40">Assignee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredItems.map((item) => {
              const TypeIcon = typeConfig[item.type]?.icon || CheckSquare;
              const typeStyle = typeConfig[item.type] || typeConfig.task;
              const PriorityIcon = priorityConfig[item.priority]?.icon || Minus;
              const priorityStyle = priorityConfig[item.priority] || priorityConfig.medium;

              return (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className={cn('inline-flex p-1.5 rounded', typeStyle.bg)}>
                      <TypeIcon className={cn('w-4 h-4', typeStyle.color)} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-muted-foreground">{item.key}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{item.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <PriorityIcon className={cn('w-4 h-4', priorityStyle.color)} />
                      <span className="text-xs text-muted-foreground">{priorityStyle.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.storyPoints && (
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-muted rounded text-xs font-medium text-foreground">
                        {item.storyPoints}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.assignee ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar name={item.assignee.name} size="xs" />
                        <span className="text-sm text-foreground">{item.assignee.name}</span>
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
      </div>
    </div>
  );
}
