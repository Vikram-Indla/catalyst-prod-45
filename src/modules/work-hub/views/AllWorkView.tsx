import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, MoreHorizontal, Download, Columns, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ViewMode = 'basic' | 'jql';

interface WorkItem {
  id: string;
  type: 'Feature' | 'Story' | 'Task' | 'Defect' | 'Subtask';
  key: string;
  summary: string;
  status: string;
  assignee: string | null;
  priority: string;
  children?: WorkItem[];
}

const mockItems: WorkItem[] = [
  {
    id: '1',
    type: 'Feature',
    key: 'PROJ-1',
    summary: 'User authentication system',
    status: 'In Progress',
    assignee: 'John D.',
    priority: 'High',
    children: [
      { id: '1-1', type: 'Story', key: 'PROJ-2', summary: 'Implement login page UI', status: 'To Do', assignee: 'Sarah M.', priority: 'Medium' },
      { id: '1-2', type: 'Story', key: 'PROJ-3', summary: 'Add password validation', status: 'Done', assignee: 'John D.', priority: 'Medium' },
    ],
  },
  {
    id: '2',
    type: 'Feature',
    key: 'PROJ-4',
    summary: 'Dashboard redesign',
    status: 'To Do',
    assignee: 'Mike R.',
    priority: 'Medium',
    children: [
      { id: '2-1', type: 'Story', key: 'PROJ-5', summary: 'Create wireframes', status: 'In Progress', assignee: 'Sarah M.', priority: 'High' },
    ],
  },
  {
    id: '3',
    type: 'Task',
    key: 'PROJ-6',
    summary: 'Set up monitoring',
    status: 'To Do',
    assignee: null,
    priority: 'Low',
  },
];

const typeColors: Record<string, string> = {
  Feature: 'bg-purple-500',
  Story: 'bg-green-500',
  Task: 'bg-blue-500',
  Defect: 'bg-red-500',
  Subtask: 'bg-cyan-500',
};

export function AllWorkView() {
  const [viewMode, setViewMode] = useState<ViewMode>('basic');
  const [searchQuery, setSearchQuery] = useState('');
  const [jqlQuery, setJqlQuery] = useState('project = PROJ ORDER BY created DESC');
  const [showHierarchy, setShowHierarchy] = useState(true);
  const [hideDone, setHideDone] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['1', '2']));
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const renderRow = (item: WorkItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    return (
      <React.Fragment key={item.id}>
        <tr className="hover:bg-muted/30 border-b border-border">
          <td className="px-3 py-2 w-10">
            <Checkbox
              checked={selectedItems.has(item.id)}
              onCheckedChange={(checked) => {
                const newSelected = new Set(selectedItems);
                if (checked) newSelected.add(item.id);
                else newSelected.delete(item.id);
                setSelectedItems(newSelected);
              }}
            />
          </td>
          <td className="px-3 py-2" style={{ paddingLeft: `${12 + level * 24}px` }}>
            <div className="flex items-center gap-2">
              {showHierarchy && hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ) : (
                <div className="w-5" />
              )}
              <div className={cn('w-3 h-3 rounded-sm', typeColors[item.type])} />
              <span className="text-sm font-medium text-primary">{item.key}</span>
            </div>
          </td>
          <td className="px-3 py-2">
            <span className="text-sm">{item.summary}</span>
          </td>
          <td className="px-3 py-2">
            <Badge variant="outline" className="text-xs">{item.status}</Badge>
          </td>
          <td className="px-3 py-2">
            <span className="text-sm text-muted-foreground">{item.assignee || 'Unassigned'}</span>
          </td>
          <td className="px-3 py-2">
            <span className="text-sm text-muted-foreground">{item.priority}</span>
          </td>
        </tr>
        {showHierarchy && hasChildren && isExpanded && item.children?.map((child) => renderRow(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Controls */}
      <div className="px-4 py-3 border-b border-border space-y-3">
        {/* Mode Toggle + Search */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Ask AI
          </Button>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="basic" className="text-xs px-3 h-7">Basic</TabsTrigger>
              <TabsTrigger value="jql" className="text-xs px-3 h-7">JQL</TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === 'basic' ? (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search work"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          ) : (
            <Textarea
              value={jqlQuery}
              onChange={(e) => setJqlQuery(e.target.value)}
              className="flex-1 h-8 min-h-8 resize-none font-mono text-sm"
              placeholder="Enter JQL query..."
            />
          )}
        </div>

        {/* Filter Chips + Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Select defaultValue="all">
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                <SelectItem value="proj">PROJ</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                <SelectItem value="me">Me</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="defect">Defect</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              More filters
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Saved Filters */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  Saved filters
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>My open issues</DropdownMenuItem>
                <DropdownMenuItem>Recently updated</DropdownMenuItem>
                <DropdownMenuItem>High priority</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Save current filter...</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Group */}
            <Button variant="outline" size="sm" className="text-xs gap-1">
              Group
              <ChevronDown className="h-3 w-3" />
            </Button>

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem>Print list</DropdownMenuItem>
                <DropdownMenuItem>Print details</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Export XML</DropdownMenuItem>
                <DropdownMenuItem>Export RSS</DropdownMenuItem>
                <DropdownMenuItem>Export RSS (with comments)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Export Word</DropdownMenuItem>
                <DropdownMenuItem>Export HTML report (all fields)</DropdownMenuItem>
                <DropdownMenuItem>Export HTML report (my defaults)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Export CSV (all fields)</DropdownMenuItem>
                <DropdownMenuItem>Export CSV (my defaults)</DropdownMenuItem>
                <DropdownMenuItem>Export Excel CSV (all fields)</DropdownMenuItem>
                <DropdownMenuItem>Export Excel CSV (my defaults)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Create dashboard gadget</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Columns */}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Columns className="h-4 w-4" />
            </Button>

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>View work items as a chart</DropdownMenuItem>
                <DropdownMenuItem>Format rules</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={hideDone}
                  onCheckedChange={setHideDone}
                >
                  Hide done work items
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showHierarchy}
                  onCheckedChange={setShowHierarchy}
                >
                  Show hierarchy
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Bulk change work items</DropdownMenuItem>
                <DropdownMenuItem>Import work items from CSV</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Go to all work items</DropdownMenuItem>
                <DropdownMenuItem>Give feedback</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-muted/50 sticky top-0">
            <tr className="border-b border-border">
              <th className="w-10 px-3 py-2">
                <Checkbox />
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Key</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Summary</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Assignee</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Priority</th>
            </tr>
          </thead>
          <tbody>
            {mockItems.map((item) => renderRow(item))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border text-sm text-muted-foreground">
        Showing {mockItems.length} items
      </div>
    </div>
  );
}

export default AllWorkView;
