import React, { useState } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface WorkItem {
  id: string;
  type: 'Feature' | 'Story' | 'Task' | 'Defect' | 'Subtask' | 'Incident';
  key: string;
  summary: string;
  status: string;
  comments: number;
  assignee: string | null;
  dueDate: string | null;
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  labels: string[];
  created: string;
  updated: string;
  reporter: string;
}

// Mock data
const mockItems: WorkItem[] = [
  { id: '1', type: 'Feature', key: 'PROJ-1', summary: 'User authentication system', status: 'In Progress', comments: 5, assignee: 'John D.', dueDate: '2024-12-15', priority: 'High', labels: ['auth', 'security'], created: '2024-11-01', updated: '2024-12-08', reporter: 'Sarah M.' },
  { id: '2', type: 'Story', key: 'PROJ-2', summary: 'Implement login page UI', status: 'To Do', comments: 2, assignee: 'Sarah M.', dueDate: '2024-12-10', priority: 'Medium', labels: ['ui'], created: '2024-11-05', updated: '2024-12-07', reporter: 'John D.' },
  { id: '3', type: 'Task', key: 'PROJ-3', summary: 'Set up CI/CD pipeline', status: 'Done', comments: 0, assignee: 'Mike R.', dueDate: null, priority: 'Low', labels: ['devops'], created: '2024-11-10', updated: '2024-12-05', reporter: 'Mike R.' },
  { id: '4', type: 'Defect', key: 'PROJ-4', summary: 'Login button not working on mobile', status: 'In Progress', comments: 8, assignee: null, dueDate: '2024-12-08', priority: 'Highest', labels: ['bug', 'mobile'], created: '2024-12-01', updated: '2024-12-08', reporter: 'QA Team' },
  { id: '5', type: 'Story', key: 'PROJ-5', summary: 'Add password reset functionality', status: 'To Do', comments: 1, assignee: 'John D.', dueDate: '2024-12-20', priority: 'Medium', labels: ['auth'], created: '2024-11-15', updated: '2024-12-06', reporter: 'Sarah M.' },
];

const typeColors: Record<string, string> = {
  Feature: 'bg-purple-500',
  Story: 'bg-green-500',
  Task: 'bg-blue-500',
  Defect: 'bg-red-500',
  Subtask: 'bg-cyan-500',
  Incident: 'bg-orange-500',
};

const priorityColors: Record<string, string> = {
  Highest: 'text-red-600',
  High: 'text-orange-500',
  Medium: 'text-yellow-500',
  Low: 'text-green-500',
  Lowest: 'text-blue-500',
};

const statusOptions = ['To Do', 'In Progress', 'Done', 'Blocked'];
const priorityOptions = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

type SortField = keyof WorkItem;
type SortDirection = 'asc' | 'desc';

export function ListView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('key');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [items, setItems] = useState<WorkItem[]>(mockItems);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(items.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleInlineEdit = (id: string, field: 'status' | 'priority' | 'assignee', value: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const filteredItems = items.filter(item =>
    item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    if (aValue === null) return 1;
    if (bValue === null) return -1;
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        )}
      </div>
    </th>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search list"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          {/* Avatar group placeholder */}
          <div className="flex -space-x-2">
            {['JD', 'SM', 'MR'].map((initials) => (
              <Avatar key={initials} className="h-7 w-7 border-2 border-background">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Status</DropdownMenuItem>
            <DropdownMenuItem>Assignee</DropdownMenuItem>
            <DropdownMenuItem>Priority</DropdownMenuItem>
            <DropdownMenuItem>Type</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="w-10 px-3 py-2">
                <Checkbox
                  checked={selectedItems.size === items.length && items.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <SortHeader field="type">Type</SortHeader>
              <SortHeader field="key">Key</SortHeader>
              <SortHeader field="summary">Summary</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="comments">Comments</SortHeader>
              <SortHeader field="assignee">Assignee</SortHeader>
              <SortHeader field="dueDate">Due date</SortHeader>
              <SortHeader field="priority">Priority</SortHeader>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Labels</th>
              <SortHeader field="created">Created</SortHeader>
              <SortHeader field="updated">Updated</SortHeader>
              <SortHeader field="reporter">Reporter</SortHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedItems.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => console.log('Open item:', item.key)}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className={cn('w-3 h-3 rounded-sm', typeColors[item.type])} title={item.type} />
                </td>
                <td className="px-3 py-2">
                  <span className="text-sm font-medium text-primary">{item.key}</span>
                </td>
                <td className="px-3 py-2 max-w-xs">
                  <span className="text-sm truncate block">{item.summary}</span>
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={item.status}
                    onValueChange={(value) => handleInlineEdit(item.id, 'status', value)}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <span className="text-sm text-muted-foreground">{item.comments}</span>
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={item.assignee || 'unassigned'}
                    onValueChange={(value) => handleInlineEdit(item.id, 'assignee', value === 'unassigned' ? '' : value)}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      <SelectItem value="John D.">John D.</SelectItem>
                      <SelectItem value="Sarah M.">Sarah M.</SelectItem>
                      <SelectItem value="Mike R.">Mike R.</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <span className={cn('text-sm', isOverdue(item.dueDate) && 'text-destructive font-medium')}>
                    {item.dueDate || '-'}
                  </span>
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={item.priority}
                    onValueChange={(value) => handleInlineEdit(item.id, 'priority', value)}
                  >
                    <SelectTrigger className={cn('h-7 w-24 text-xs', priorityColors[item.priority])}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((priority) => (
                        <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1 flex-wrap max-w-32">
                    {item.labels.slice(0, 2).map((label) => (
                      <Badge key={label} variant="secondary" className="text-xs px-1.5 py-0">
                        {label}
                      </Badge>
                    ))}
                    {item.labels.length > 2 && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        +{item.labels.length - 2}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="text-sm text-muted-foreground">{item.created}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-sm text-muted-foreground">{item.updated}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-sm text-muted-foreground">{item.reporter}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border text-sm text-muted-foreground">
        Showing {sortedItems.length} of {items.length} items
      </div>
    </div>
  );
}

export default ListView;
