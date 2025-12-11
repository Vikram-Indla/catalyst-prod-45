import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, MoreHorizontal, Download, Columns, Sparkles, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ViewMode = 'basic' | 'jql';

interface WorkItem {
  id: string;
  type: 'Feature' | 'Story' | 'Task' | 'Defect' | 'Subtask';
  key: string;
  summary: string;
  status: string;
  statusCategory: 'todo' | 'in_progress' | 'done';
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
    statusCategory: 'in_progress',
    assignee: 'John D.',
    priority: 'High',
    children: [
      { id: '1-1', type: 'Story', key: 'PROJ-2', summary: 'Implement login page UI', status: 'To Do', statusCategory: 'todo', assignee: 'Sarah M.', priority: 'Medium' },
      { id: '1-2', type: 'Story', key: 'PROJ-3', summary: 'Add password validation', status: 'Done', statusCategory: 'done', assignee: 'John D.', priority: 'Medium' },
    ],
  },
  {
    id: '2',
    type: 'Feature',
    key: 'PROJ-4',
    summary: 'Dashboard redesign',
    status: 'To Do',
    statusCategory: 'todo',
    assignee: 'Mike R.',
    priority: 'Medium',
    children: [
      { id: '2-1', type: 'Story', key: 'PROJ-5', summary: 'Create wireframes', status: 'In Progress', statusCategory: 'in_progress', assignee: 'Sarah M.', priority: 'High' },
    ],
  },
  {
    id: '3',
    type: 'Task',
    key: 'PROJ-6',
    summary: 'Set up monitoring',
    status: 'To Do',
    statusCategory: 'todo',
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

// Jira-style status lozenge component
function StatusLozenge({ status, category }: { status: string; category: 'todo' | 'in_progress' | 'done' }) {
  const categoryStyles = {
    todo: 'bg-slate-100 text-slate-700 border-slate-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    done: 'bg-green-50 text-green-700 border-green-200',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-[11px] leading-[16px] font-medium border',
      categoryStyles[category]
    )}>
      {status}
    </span>
  );
}

// Filter chip component matching Jira's style
function FilterChip({ 
  label, 
  value, 
  hasValue = false,
  onClick 
}: { 
  label: string; 
  value?: string; 
  hasValue?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 h-8 px-3 rounded-md border text-[13px] leading-[20px] transition-colors',
        hasValue 
          ? 'bg-white border-slate-300 text-slate-900' 
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
      )}
    >
      {label}
      {value && <span className="text-blue-600 font-medium">{value}</span>}
      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
    </button>
  );
}

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

  const countItems = (items: WorkItem[]): number => {
    return items.reduce((count, item) => {
      return count + 1 + (item.children ? countItems(item.children) : 0);
    }, 0);
  };

  const renderRow = (item: WorkItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    return (
      <React.Fragment key={item.id}>
        <tr className="hover:bg-slate-50 border-b border-slate-200">
          {/* Checkbox */}
          <td className="px-3 py-2 w-10 border-r border-slate-200">
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
          {/* Key column */}
          <td className="px-3 py-2 border-r border-slate-200" style={{ paddingLeft: `${12 + level * 24}px` }}>
            <div className="flex items-center gap-2">
              {showHierarchy && hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="p-0.5 hover:bg-slate-100 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  )}
                </button>
              ) : (
                <div className="w-5" />
              )}
              <div className={cn('w-2.5 h-2.5 rounded-sm flex-shrink-0', typeColors[item.type])} />
              <span className="text-[14px] leading-[20px] font-medium text-blue-600 hover:underline cursor-pointer">
                {item.key}
              </span>
            </div>
          </td>
          {/* Summary */}
          <td className="px-3 py-2 border-r border-slate-200">
            <span className="text-[14px] leading-[20px] text-slate-900 truncate block max-w-md">
              {item.summary}
            </span>
          </td>
          {/* Status */}
          <td className="px-3 py-2 border-r border-slate-200">
            <StatusLozenge status={item.status} category={item.statusCategory} />
          </td>
          {/* Assignee */}
          <td className="px-3 py-2 border-r border-slate-200">
            <span className="text-[14px] leading-[20px] text-slate-700">
              {item.assignee || 'Unassigned'}
            </span>
          </td>
          {/* Priority */}
          <td className="px-3 py-2">
            <span className={cn(
              'text-[14px] leading-[20px]',
              item.priority === 'High' ? 'text-orange-600' : 
              item.priority === 'Low' ? 'text-slate-500' : 'text-slate-700'
            )}>
              {item.priority}
            </span>
          </td>
        </tr>
        {showHierarchy && hasChildren && isExpanded && item.children?.map((child) => renderRow(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Filter Toolbar */}
      <div className="px-4 py-3 space-y-3 bg-white">
        {/* Row 1: Ask AI + Basic/JQL + Search */}
        <div className="flex items-center gap-2">
          {/* Ask AI Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 gap-2 text-[13px] text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50"
          >
            <Sparkles className="h-4 w-4" />
            Ask AI
          </Button>
          
          {/* Basic / JQL Segmented Control */}
          <div className="inline-flex rounded-md border border-slate-200 overflow-hidden">
            <button
              onClick={() => setViewMode('basic')}
              className={cn(
                'px-3 h-8 text-[13px] font-medium transition-colors',
                viewMode === 'basic' 
                  ? 'bg-white text-blue-600 border-r border-blue-600' 
                  : 'bg-slate-50 text-slate-600 border-r border-slate-200 hover:bg-slate-100'
              )}
            >
              Basic
            </button>
            <button
              onClick={() => setViewMode('jql')}
              className={cn(
                'px-3 h-8 text-[13px] font-medium transition-colors',
                viewMode === 'jql' 
                  ? 'bg-white text-blue-600' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              )}
            >
              JQL
            </button>
          </div>

          {/* Search Input */}
          {viewMode === 'basic' ? (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search work"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-9 text-[14px] border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          ) : (
            <Textarea
              value={jqlQuery}
              onChange={(e) => setJqlQuery(e.target.value)}
              className="flex-1 h-8 min-h-8 resize-none font-mono text-[13px] border-slate-200"
              placeholder="Enter JQL query..."
            />
          )}
        </div>

        {/* Row 2: Filter Chips + Right Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilterChip label="All..." />
            <FilterChip label="All..." />
            <FilterChip label="All..." />
            <FilterChip label="All..." />
            <button className="text-[13px] text-slate-600 hover:text-slate-900 px-2">
              More filters
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Saved Filters */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3 text-[13px] gap-1 border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  Saved filters
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-slate-200">
                <DropdownMenuItem className="text-[14px]">My open issues</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">Recently updated</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">High priority</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-[14px]">Save current filter...</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Group */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3 text-[13px] gap-1 border-slate-200 text-slate-700 hover:bg-slate-50">
                  Group
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-slate-200">
                <DropdownMenuItem className="text-[14px]">None</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">Status</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">Assignee</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">Priority</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-100">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-white border-slate-200">
                <DropdownMenuItem className="text-[14px]">Print list</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">Print details</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-[14px]">Export CSV (all fields)</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">Export Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Toggle Icons */}
            <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
              <button className="h-8 w-8 flex items-center justify-center text-slate-400 hover:bg-slate-50">
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button className="h-8 w-8 flex items-center justify-center text-blue-600 bg-blue-50">
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200">
                <DropdownMenuItem className="text-[14px]">View work items as a chart</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">Format rules</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={hideDone}
                  onCheckedChange={setHideDone}
                  className="text-[14px]"
                >
                  Hide done work items
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showHierarchy}
                  onCheckedChange={setShowHierarchy}
                  className="text-[14px]"
                >
                  Show hierarchy
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-[14px]">Bulk change work items</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">Import work items from CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Table Container - Jira style with borders */}
      <div className="flex-1 overflow-auto mx-4 mt-2 rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr className="border-b border-slate-200">
              <th className="w-10 px-3 py-2 border-r border-slate-200">
                <Checkbox />
              </th>
              <th className="px-3 py-2 text-left text-[12px] leading-[16px] font-medium text-slate-500 border-r border-slate-200 uppercase tracking-wide">
                Key
              </th>
              <th className="px-3 py-2 text-left text-[12px] leading-[16px] font-medium text-slate-500 border-r border-slate-200 uppercase tracking-wide">
                Summary
              </th>
              <th className="px-3 py-2 text-left text-[12px] leading-[16px] font-medium text-slate-500 border-r border-slate-200 uppercase tracking-wide">
                Status
              </th>
              <th className="px-3 py-2 text-left text-[12px] leading-[16px] font-medium text-slate-500 border-r border-slate-200 uppercase tracking-wide">
                Assignee
              </th>
              <th className="px-3 py-2 text-left text-[12px] leading-[16px] font-medium text-slate-500 uppercase tracking-wide">
                Priority
              </th>
            </tr>
          </thead>
          <tbody>
            {mockItems.map((item) => renderRow(item))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 text-[13px] text-slate-600 bg-white">
        Showing {countItems(mockItems)} items
      </div>
    </div>
  );
}

export default AllWorkView;
