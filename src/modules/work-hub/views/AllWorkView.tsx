import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, MoreHorizontal, Download, LayoutGrid, List, User, Zap, AlertCircle, CheckSquare, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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

// Mock data for filters
const mockAssignees = [
  { id: 'current', name: 'Current User', avatar: '👤' },
  { id: 'unassigned', name: 'Unassigned', avatar: '○' },
  { id: '1', name: 'Faisal Javed Paracha', avatar: '👨' },
  { id: '2', name: 'Hassan Raza Hasrat', avatar: '👨' },
  { id: '3', name: 'Adnan Ali', avatar: '👨' },
  { id: '4', name: 'Imran Aslam', avatar: '👨' },
  { id: '5', name: 'Muhammad Raza Bangi', avatar: '👨' },
];

const mockTypes = [
  { id: 'epic', name: 'Epic', icon: Zap, color: 'text-purple-500' },
  { id: 'business-gap', name: 'Business Gap', icon: AlertCircle, color: 'text-orange-500' },
  { id: 'change-request', name: 'Change Request', icon: CheckSquare, color: 'text-blue-500' },
  { id: 'production-incident', name: 'Production Incident', icon: AlertCircle, color: 'text-red-500' },
  { id: 'backend', name: 'Backend', icon: FileText, color: 'text-cyan-500' },
];

const mockStatuses = [
  { id: 'analysis', name: 'ANALYSIS', category: 'todo' },
  { id: 'awaiting-info', name: 'AWAITING INFO', category: 'todo' },
  { id: 'backlog', name: 'BACKLOG', category: 'todo' },
  { id: 'beta-ready', name: 'BETA READY', category: 'in_progress' },
  { id: 'blocked', name: 'BLOCKED', category: 'todo' },
  { id: 'closed', name: 'CLOSED', category: 'done' },
  { id: 'deferred', name: 'DEFERRED FOR INT', category: 'todo' },
  { id: 'done', name: 'DONE', category: 'done' },
  { id: 'hold', name: 'HOLD', category: 'todo' },
];

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

// Status badge for filter dropdown
function StatusBadge({ name, category }: { name: string; category: string }) {
  const categoryStyles: Record<string, string> = {
    todo: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-yellow-100 text-yellow-800',
    done: 'bg-green-100 text-green-700',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-[10px] leading-[14px] font-semibold uppercase',
      categoryStyles[category] || 'bg-slate-100 text-slate-700'
    )}>
      {name}
    </span>
  );
}

// Filter button component
function FilterButton({ 
  label, 
  isActive,
  onClick 
}: { 
  label: string; 
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 h-8 px-3 rounded-md border text-[13px] leading-[20px] transition-colors',
        isActive 
          ? 'bg-blue-600 border-blue-600 text-white' 
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
      )}
    >
      {label}
      <ChevronDown className="h-3.5 w-3.5" />
      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
    </button>
  );
}

export function AllWorkView() {
  const [showHierarchy, setShowHierarchy] = useState(true);
  const [hideDone, setHideDone] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['1', '2']));
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Filter states
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [statusSearch, setStatusSearch] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());

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
      <div className="px-4 py-3 bg-white">
        {/* Filter Chips + Right Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Assignee Filter */}
            <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
              <PopoverTrigger asChild>
                <FilterButton 
                  label="Assignee" 
                  isActive={assigneeOpen || selectedAssignees.size > 0} 
                />
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 bg-white border-slate-200 shadow-lg" align="start">
                <div className="p-3 border-b border-slate-100">
                  <div className="text-[13px] text-slate-500 mb-2">Assignee = (equals)</div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search Assignee"
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      className="pl-9 h-9 text-[14px] border-blue-400 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {mockAssignees
                    .filter(a => a.name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                    .map((assignee) => (
                      <label key={assignee.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                        <Checkbox
                          checked={selectedAssignees.has(assignee.id)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedAssignees);
                            if (checked) newSet.add(assignee.id);
                            else newSet.delete(assignee.id);
                            setSelectedAssignees(newSet);
                          }}
                        />
                        <span className="text-lg">{assignee.avatar}</span>
                        <span className="text-[14px] text-slate-900">{assignee.name}</span>
                      </label>
                    ))}
                </div>
                <div className="p-3 border-t border-slate-100">
                  <button className="text-[13px] text-blue-600 hover:underline">Show full list</button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Type Filter */}
            <Popover open={typeOpen} onOpenChange={setTypeOpen}>
              <PopoverTrigger asChild>
                <FilterButton 
                  label="Type" 
                  isActive={typeOpen || selectedTypes.size > 0} 
                />
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 bg-white border-slate-200 shadow-lg" align="start">
                <div className="p-3 border-b border-slate-100">
                  <div className="text-[13px] text-slate-500 mb-2">Type = (equals)</div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search Type"
                      value={typeSearch}
                      onChange={(e) => setTypeSearch(e.target.value)}
                      className="pl-9 h-9 text-[14px] border-blue-400 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase">Standard work types</div>
                  {mockTypes
                    .filter(t => t.name.toLowerCase().includes(typeSearch.toLowerCase()))
                    .map((type) => {
                      const Icon = type.icon;
                      return (
                        <label key={type.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                          <Checkbox
                            checked={selectedTypes.has(type.id)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedTypes);
                              if (checked) newSet.add(type.id);
                              else newSet.delete(type.id);
                              setSelectedTypes(newSet);
                            }}
                          />
                          <Icon className={cn('h-4 w-4', type.color)} />
                          <span className="text-[14px] text-slate-900">{type.name}</span>
                        </label>
                      );
                    })}
                </div>
                <div className="p-3 border-t border-slate-100">
                  <button className="text-[13px] text-blue-600 hover:underline">Show full list</button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Status Filter */}
            <Popover open={statusOpen} onOpenChange={setStatusOpen}>
              <PopoverTrigger asChild>
                <FilterButton 
                  label="Status" 
                  isActive={statusOpen || selectedStatuses.size > 0} 
                />
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 bg-white border-slate-200 shadow-lg" align="start">
                <div className="p-3 border-b border-slate-100">
                  <div className="text-[13px] text-slate-500 mb-2">Status = (equals)</div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search Status"
                      value={statusSearch}
                      onChange={(e) => setStatusSearch(e.target.value)}
                      className="pl-9 h-9 text-[14px] border-blue-400 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {mockStatuses
                    .filter(s => s.name.toLowerCase().includes(statusSearch.toLowerCase()))
                    .map((status) => (
                      <label key={status.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                        <Checkbox
                          checked={selectedStatuses.has(status.id)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedStatuses);
                            if (checked) newSet.add(status.id);
                            else newSet.delete(status.id);
                            setSelectedStatuses(newSet);
                          }}
                        />
                        <StatusBadge name={status.name} category={status.category} />
                      </label>
                    ))}
                </div>
                <div className="p-3 border-t border-slate-100 flex justify-between">
                  <button className="text-[13px] text-blue-600 hover:underline">Show full list</button>
                  <span className="text-[12px] text-slate-500">{mockStatuses.length} of 32</span>
                </div>
              </PopoverContent>
            </Popover>

            <button className="text-[13px] text-slate-600 hover:text-slate-900 px-2 flex items-center gap-1">
              More filters
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
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
