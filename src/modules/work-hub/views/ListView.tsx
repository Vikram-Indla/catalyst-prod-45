import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Search, ChevronRight, ChevronDown, 
  MessageSquare, Calendar, Minus, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
  Zap, Bug, Bookmark, CircleDot, Settings2, GripVertical, Plus, MoreHorizontal
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  ColumnHeaderMenu, 
  FieldPicker, 
  GroupByMenu, 
  type GroupByOption,
  InlineDatePicker,
  InlineSummaryEdit,
  IssueDetailPanel 
} from '../components';

interface WorkItem {
  id: string;
  type: 'Feature' | 'Story' | 'Task' | 'Defect' | 'Subtask' | 'Incident';
  key: string;
  summary: string;
  status: string;
  comments: number;
  assignee: { name: string; avatar?: string } | null;
  dueDate: string | null;
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  labels: string[];
  created: string;
  updated: string;
  hasChildren?: boolean;
  parentKey?: string;
  parentSummary?: string;
  description?: string;
}

// Mock data matching Jira screenshot
const mockItems: WorkItem[] = [
  { id: '1', type: 'Feature', key: 'ICP-1', summary: 'Invoices Management', status: 'Backlog', comments: 0, assignee: null, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-02', updated: '2025-07-29', hasChildren: true },
  { id: '2', type: 'Feature', key: 'ICP-6', summary: 'Upload 2025 Invoices for Review in the System - 2025 رفع فواتير عام', status: 'In Requirement', comments: 4, assignee: { name: 'Mohammed Hassan' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-03', updated: '2025-09-24', hasChildren: true, parentKey: 'ICP-1', parentSummary: 'Invoices Management' },
  { id: '3', type: 'Feature', key: 'ICP-51', summary: 'Upload 2025 Invoices for Review in the System - 2025 رفع فواتير', status: 'Backlog', comments: 0, assignee: null, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-30', updated: '2025-11-25', hasChildren: false },
  { id: '4', type: 'Feature', key: 'ICP-8', summary: 'Update Terminology in the Invoices Page [Back Office] - ...', status: 'In Production', comments: 0, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-03', updated: '2025-07-29', hasChildren: false },
  { id: '5', type: 'Feature', key: 'ICP-22', summary: 'Update Terminology in the Requests Page [Back Office] ...', status: 'In Production', comments: 0, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-14', updated: '2025-11-30', hasChildren: false },
  { id: '6', type: 'Feature', key: 'ICP-19', summary: 'Add Filter Option "Request Status" in the Invoice Page - ...', status: 'In Production', comments: 0, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-14', updated: '2025-08-17', hasChildren: false },
  { id: '7', type: 'Feature', key: 'ICP-23', summary: 'Update Pop-up Content in the Invoices Page - تحديث محتوى البوب', status: 'In Production', comments: 0, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-14', updated: '2025-08-05', hasChildren: false },
  { id: '8', type: 'Feature', key: 'ICP-20', summary: 'Modify Invoice Rejection Mechanism by Removing the D...', status: 'In Production', comments: 0, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-14', updated: '2025-12-01', hasChildren: false },
  { id: '9', type: 'Feature', key: 'ICP-7', summary: 'Improve Investor Experience in Invoice Submission Fea...', status: 'In Production', comments: 5, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-03', updated: '2025-10-30', hasChildren: false },
  { id: '10', type: 'Defect', key: 'ICP-105', summary: 'Invoice table label and date column format do not match...', status: 'Closed', comments: 0, assignee: { name: 'Abdulrahman Saad' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-08-11', updated: '2025-08-17', hasChildren: false },
  { id: '11', type: 'Defect', key: 'ICP-59', summary: 'Financial data fields no longer accept negative values', status: 'Closed', comments: 4, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-31', updated: '2025-08-17', hasChildren: false },
  { id: '12', type: 'Defect', key: 'ICP-96', summary: 'Amount field design issues - عدم تطابق تصميم حقل المبلغ', status: 'Closed', comments: 0, assignee: null, dueDate: null, priority: 'Medium', labels: [], created: '2025-08-06', updated: '2025-08-17', hasChildren: false },
  { id: '13', type: 'Defect', key: 'ICP-97', summary: 'Currency symbol design mismatch in pop-up - تصميم رمز العملة', status: 'Closed', comments: 0, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-08-06', updated: '2025-11-30', hasChildren: false },
  { id: '14', type: 'Defect', key: 'ICP-98', summary: 'Error when confirming rejection pop-up – Undefined arr...', status: 'Closed', comments: 0, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-08-06', updated: '2025-11-30', hasChildren: false },
  { id: '15', type: 'Defect', key: 'ICP-99', summary: 'Investor cannot view details of a rejected request with t...', status: 'Closed', comments: 5, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-08-10', updated: '2025-08-21', hasChildren: false },
  { id: '16', type: 'Defect', key: 'ICP-100', summary: '"Approve" button label not updated in "Industrial Compa...', status: 'Closed', comments: 2, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-08-11', updated: '2025-08-24', hasChildren: false },
  { id: '17', type: 'Defect', key: 'ICP-101', summary: 'Menu item name does not match the required name', status: 'Closed', comments: 2, assignee: { name: 'Abdulrahman Saad' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-08-11', updated: '2025-08-24', hasChildren: false },
];

// Type icons
const typeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  Feature: { icon: <Zap className="h-4 w-4" />, color: 'text-purple-500' },
  Story: { icon: <Bookmark className="h-4 w-4" />, color: 'text-green-600' },
  Task: { icon: <CircleDot className="h-4 w-4" />, color: 'text-blue-500' },
  Defect: { icon: <Bug className="h-4 w-4" />, color: 'text-red-500' },
  Subtask: { icon: <CircleDot className="h-4 w-4" />, color: 'text-cyan-500' },
  Incident: { icon: <Settings2 className="h-4 w-4" />, color: 'text-orange-500' },
};

// Status lozenge - NEUTRAL STYLING (no colors per status)
const statusOptions = ['Backlog', 'To Do', 'In Progress', 'In Requirement', 'In Production', 'Done', 'Closed', 'Blocked'];

const formatStatusLabel = (status: string): string => {
  return status.toUpperCase();
};

const assigneeOptions = [
  { name: 'Amal Alghofaily' },
  { name: 'Abdulrahman Saad' },
  { name: 'Mohammed Hassan' },
  { name: 'Waad Alasim' },
  { name: 'Faisal Javed Parachcha' },
  { name: 'Abdulrhman Alghizzi' },
  { name: 'Kareem Abu Elenin' },
  { name: 'nada nader' },
  { name: 'Alaa Al-Khayyat' },
  { name: 'Maaz Majid' },
];

const priorityIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  'Highest': { icon: <ChevronsUp className="h-4 w-4" />, color: 'text-red-500' },
  'High': { icon: <ArrowUp className="h-4 w-4" />, color: 'text-orange-500' },
  'Medium': { icon: <Minus className="h-4 w-4" />, color: 'text-amber-500' },
  'Low': { icon: <ArrowDown className="h-4 w-4" />, color: 'text-green-500' },
  'Lowest': { icon: <ChevronsDown className="h-4 w-4" />, color: 'text-slate-500' },
};

type SortField = string;
type SortDirection = 'asc' | 'desc';

// Status lozenge - NEUTRAL STYLING (no colors per status)
function StatusLozenge({ status, onStatusChange }: { status: string; onStatusChange: (status: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded">
          <span className="catalyst-status inline-flex items-center px-3 py-0.5 rounded-full text-[11px] leading-4 font-medium uppercase cursor-pointer whitespace-nowrap bg-muted/50 text-foreground border border-border">
            {formatStatusLabel(status)}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1 bg-white border border-slate-200 shadow-lg" align="start">
        <div className="flex flex-col">
          {statusOptions.map((opt) => {
            return (
              <button
                key={opt}
                className={cn(
                  "text-left px-2 py-1.5 text-sm rounded hover:bg-slate-50 transition-colors",
                  status === opt && "bg-blue-50"
                )}
                onClick={() => onStatusChange(opt)}
              >
                <span className="catalyst-status inline-flex items-center px-3 py-0.5 rounded-full text-[11px] leading-4 font-medium uppercase bg-muted/50 text-foreground border border-border">
                  {formatStatusLabel(opt)}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Jira-style assignee cell
function AssigneeCell({ assignee, onAssigneeChange }: { 
  assignee: { name: string; avatar?: string } | null; 
  onAssigneeChange: (assignee: { name: string } | null) => void 
}) {
  const [search, setSearch] = useState('');
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-500', 'bg-teal-600', 'bg-pink-500', 'bg-indigo-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const filteredAssignees = assigneeOptions.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="inline-flex items-center gap-2 hover:bg-slate-50 rounded px-1 py-0.5 -mx-1 transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 min-w-0">
          {assignee ? (
            <>
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback className={cn("text-[10px] text-white", getAvatarColor(assignee.name))}>
                  {getInitials(assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[14px] leading-5 text-slate-900 truncate">{assignee.name}</span>
            </>
          ) : (
            <span className="text-[14px] leading-5 text-slate-500">Unassigned</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 bg-white border border-slate-200 shadow-lg" align="start">
        <div className="p-2 border-b border-slate-200">
          <Input
            placeholder="Search assignees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-[14px] bg-slate-50 border-transparent rounded focus:border-blue-400 focus:bg-white"
          />
        </div>
        <div className="flex flex-col max-h-60 overflow-auto p-1">
          <button
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-50 transition-colors text-left text-blue-600"
            onClick={() => onAssigneeChange(null)}
          >
            Unassigned
          </button>
          <button
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-blue-100 bg-blue-50 transition-colors text-left text-blue-600 font-medium"
            onClick={() => onAssigneeChange({ name: 'Vikram India' })}
          >
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarFallback className="text-[10px] text-white bg-green-600">VI</AvatarFallback>
            </Avatar>
            Vikram India (Assign to me)
          </button>
          <div className="h-px bg-slate-200 my-1" />
          {filteredAssignees.map((opt) => (
            <button
              key={opt.name}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-50 transition-colors text-left",
                assignee?.name === opt.name && "bg-blue-50"
              )}
              onClick={() => onAssigneeChange(opt)}
            >
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback className={cn("text-[10px] text-white", getAvatarColor(opt.name))}>
                  {getInitials(opt.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-slate-900">{opt.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Priority cell
function PriorityCell({ priority, onPriorityChange }: { 
  priority: string; 
  onPriorityChange: (priority: string) => void 
}) {
  const priorityOptions = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
  const info = priorityIcons[priority] || priorityIcons['Medium'];

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="inline-flex items-center gap-1.5 hover:bg-slate-50 rounded px-1 py-0.5 -mx-1 transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1">
          <span className={info.color}>{info.icon}</span>
          <span className="text-[14px] leading-5 text-slate-900">{priority}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1 bg-white border border-slate-200 shadow-lg" align="start">
        {priorityOptions.map((opt) => {
          const optInfo = priorityIcons[opt] || priorityIcons['Medium'];
          return (
            <button
              key={opt}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-50 transition-colors text-left",
                priority === opt && "bg-blue-50"
              )}
              onClick={() => onPriorityChange(opt)}
            >
              <span className={optInfo.color}>{optInfo.icon}</span>
              <span className="text-slate-900">{opt}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function ListView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [items, setItems] = useState<WorkItem[]>(mockItems);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());
  const [visibleFields, setVisibleFields] = useState<string[]>(['type', 'key', 'summary', 'status', 'comments', 'assignee', 'dueDate', 'priority', 'labels', 'created']);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);

  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const handleClearSort = () => {
    setSortField(null);
  };

  const handleHideField = (field: string) => {
    setHiddenFields(prev => new Set([...prev, field]));
  };

  const handleToggleField = (fieldId: string) => {
    if (visibleFields.includes(fieldId)) {
      setVisibleFields(prev => prev.filter(f => f !== fieldId));
    } else {
      setVisibleFields(prev => [...prev, fieldId]);
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

  const handleToggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleInlineEdit = (id: string, field: keyof WorkItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    if (selectedItem?.id === id) {
      setSelectedItem(prev => prev ? { ...prev, [field]: value } : null);
    }
    toast.success('Changes saved');
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;

    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(sourceIndex, 1);
    reorderedItems.splice(destIndex, 0, movedItem);
    
    setItems(reorderedItems);
    toast.success(`Moved "${movedItem.key}" to position ${destIndex + 1}`);
  };

  const handleRowClick = (item: WorkItem) => {
    setSelectedItem(item);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const filteredItems = items.filter(item =>
    item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedItems = sortField 
    ? [...filteredItems].sort((a, b) => {
        const aValue = (a as any)[sortField];
        const bValue = (b as any)[sortField];
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        if (typeof aValue === 'object' || typeof bValue === 'object') return 0;
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      })
    : filteredItems;

  const groupedItems = groupBy !== 'none' 
    ? sortedItems.reduce((acc, item) => {
        let groupKey: string;
        switch (groupBy) {
          case 'status':
            groupKey = item.status;
            break;
          case 'assignee':
            groupKey = item.assignee?.name || 'Unassigned';
            break;
          case 'priority':
            groupKey = item.priority;
            break;
          default:
            groupKey = 'All';
        }
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(item);
        return acc;
      }, {} as Record<string, WorkItem[]>)
    : { 'All': sortedItems };

  const isFieldVisible = (field: string) => !hiddenFields.has(field);

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-500', 'bg-teal-600', 'bg-pink-500', 'bg-indigo-500'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

  // Table header cell component for consistency
  const TableHeader = ({ children, className, scope = "col" }: { children?: React.ReactNode; className?: string; scope?: "col" | "row" }) => (
    <th 
      scope={scope}
      className={cn(
        "px-3 py-2 text-left text-[12px] leading-4 font-medium text-slate-500 bg-slate-50 border-b border-r border-slate-200 last:border-r-0 whitespace-nowrap",
        className
      )}
    >
      {children}
    </th>
  );

  // Table cell component for consistency
  const TableCell = ({ children, className, onClick }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <td 
      className={cn(
        "px-3 py-2.5 text-[14px] leading-5 text-slate-900 border-b border-r border-slate-200 last:border-r-0",
        className
      )}
      onClick={onClick}
    >
      {children}
    </td>
  );

  return (
    <div className="h-full flex bg-white" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif" }}>
      {/* Main content area */}
      <div className={cn("flex-1 flex flex-col min-w-0", selectedItem && "border-r border-slate-200")}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search list"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 w-44 text-[14px] bg-slate-50 border-transparent rounded focus:border-blue-400 focus:bg-white placeholder:text-slate-400"
              />
            </div>
            {/* Avatar group */}
            <div className="flex -space-x-1">
              {assigneeOptions.slice(0, 3).map((a) => (
                <Avatar key={a.name} className="h-7 w-7 border-2 border-white">
                  <AvatarFallback className={cn("text-[10px] text-white", getAvatarColor(a.name))}>
                    {getInitials(a.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-[11px] text-slate-600 border-2 border-white font-medium">
                +{assigneeOptions.length - 3}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-[14px] text-slate-600 hover:bg-slate-50 font-normal">
              Filter
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <GroupByMenu value={groupBy} onChange={setGroupBy} />
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-50">
              <Settings2 className="h-4 w-4 text-slate-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-50">
              <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* Card container wrapping the table */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden">
            {/* Table container with horizontal scroll */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse" style={{ minWidth: '1100px' }}>
                <thead className="sticky top-0 z-10">
                  <tr>
                    {/* Checkbox column - center aligned */}
                    <th scope="col" className="w-10 px-2 py-2 bg-slate-50 border-b border-r border-slate-200 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={selectedItems.size === items.length && items.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="rounded border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                    </th>
                    {isFieldVisible('type') && (
                      <TableHeader className="w-20">Type</TableHeader>
                    )}
                    {isFieldVisible('key') && (
                      <ColumnHeaderMenu
                        field="key"
                        label="Key"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        onClearSort={handleClearSort}
                        onHideField={handleHideField}
                        className="w-24"
                      />
                    )}
                    {isFieldVisible('summary') && (
                      <ColumnHeaderMenu
                        field="summary"
                        label="Summary"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        onClearSort={handleClearSort}
                        onHideField={handleHideField}
                        className="min-w-[280px]"
                      />
                    )}
                    {isFieldVisible('status') && (
                      <ColumnHeaderMenu
                        field="status"
                        label="Status"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        onClearSort={handleClearSort}
                        onHideField={handleHideField}
                        className="w-36"
                      />
                    )}
                    {isFieldVisible('comments') && (
                      <TableHeader className="w-28">Comments</TableHeader>
                    )}
                    {isFieldVisible('assignee') && (
                      <ColumnHeaderMenu
                        field="assignee"
                        label="Assignee"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        onClearSort={handleClearSort}
                        onHideField={handleHideField}
                        className="w-44"
                      />
                    )}
                    {isFieldVisible('dueDate') && (
                      <ColumnHeaderMenu
                        field="dueDate"
                        label="Due date"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        onClearSort={handleClearSort}
                        onHideField={handleHideField}
                        className="w-28"
                      />
                    )}
                    {isFieldVisible('priority') && (
                      <ColumnHeaderMenu
                        field="priority"
                        label="Priority"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        onClearSort={handleClearSort}
                        onHideField={handleHideField}
                        className="w-28"
                      />
                    )}
                    {isFieldVisible('labels') && (
                      <TableHeader className="w-24">Labels</TableHeader>
                    )}
                    {isFieldVisible('created') && (
                      <ColumnHeaderMenu
                        field="created"
                        label="Created"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        onClearSort={handleClearSort}
                        onHideField={handleHideField}
                        className="w-28"
                      />
                    )}
                    <th scope="col" className="w-10 px-2 py-2 bg-slate-50 border-b border-slate-200">
                      <FieldPicker visibleFields={visibleFields} onToggleField={handleToggleField} />
                    </th>
                  </tr>
                </thead>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="work-items-list">
                    {(provided) => (
                      <tbody ref={provided.innerRef} {...provided.droppableProps}>
                        {Object.entries(groupedItems).map(([groupKey, groupItems]) => (
                          <React.Fragment key={groupKey}>
                            {groupBy !== 'none' && (
                              <tr className="bg-slate-50">
                                <td colSpan={12} className="px-4 py-2 border-b border-slate-200">
                                  <div className="flex items-center gap-2">
                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                    <span className="text-[14px] font-semibold text-slate-900">{groupKey}</span>
                                    <span className="text-[12px] text-slate-500">{groupItems.length}</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {groupItems.map((item, index) => {
                              const typeInfo = typeIcons[item.type] || typeIcons['Task'];
                              const isHovered = hoveredRow === item.id;
                              const isSelected = selectedItems.has(item.id);
                              const isDetailOpen = selectedItem?.id === item.id;
                              
                              // Calculate actual index across all items for drag
                              const actualIndex = items.findIndex(i => i.id === item.id);
                              
                              return (
                                <Draggable key={item.id} draggableId={item.id} index={actualIndex}>
                                  {(provided, snapshot) => (
                                    <tr
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={cn(
                                        "transition-colors cursor-pointer",
                                        isHovered && !isSelected && !isDetailOpen && "bg-slate-50",
                                        isSelected && "bg-blue-50",
                                        isDetailOpen && "bg-blue-50",
                                        snapshot.isDragging && "bg-blue-100 shadow-lg"
                                      )}
                                      onClick={() => handleRowClick(item)}
                                      onMouseEnter={() => setHoveredRow(item.id)}
                                      onMouseLeave={() => setHoveredRow(null)}
                                    >
                                      {/* Checkbox + drag handle - center aligned */}
                                      <TableCell className="w-10 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-0.5">
                                          <div
                                            {...provided.dragHandleProps}
                                            className={cn(
                                              "cursor-grab active:cursor-grabbing",
                                              !isHovered && !snapshot.isDragging && "opacity-0"
                                            )}
                                          >
                                            <GripVertical className="h-4 w-4 text-slate-400" />
                                          </div>
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                                            className="rounded border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                          />
                                        </div>
                                      </TableCell>
                                      
                                      {/* Type with expand chevron */}
                                      {isFieldVisible('type') && (
                                        <TableCell className="w-20">
                                          <div className="flex items-center gap-0.5">
                                            {item.hasChildren ? (
                                              <button 
                                                onClick={(e) => handleToggleExpand(item.id, e)}
                                                className="p-0.5 hover:bg-slate-100 rounded transition-colors"
                                              >
                                                <ChevronRight className={cn(
                                                  "h-4 w-4 text-slate-500 transition-transform",
                                                  expandedItems.has(item.id) && "rotate-90"
                                                )} />
                                              </button>
                                            ) : (
                                              <span className="w-5" />
                                            )}
                                            <span className={typeInfo.color} title={item.type}>
                                              {typeInfo.icon}
                                            </span>
                                            {isHovered && item.hasChildren && (
                                              <button 
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-0.5 hover:bg-slate-100 rounded transition-colors ml-0.5"
                                              >
                                                <Plus className="h-3.5 w-3.5 text-slate-500" />
                                              </button>
                                            )}
                                          </div>
                                        </TableCell>
                                      )}
                                      
                                      {/* Key */}
                                      {isFieldVisible('key') && (
                                        <TableCell className="w-24">
                                          <span className="text-[14px] font-normal text-blue-600 hover:underline cursor-pointer whitespace-nowrap">
                                            {item.key}
                                          </span>
                                        </TableCell>
                                      )}
                                      
                                      {/* Summary */}
                                      {isFieldVisible('summary') && (
                                        <TableCell className="min-w-[280px] max-w-[300px]">
                                          <InlineSummaryEdit 
                                            value={item.summary}
                                            onChange={(value) => handleInlineEdit(item.id, 'summary', value)}
                                            isSelected={isSelected}
                                          />
                                        </TableCell>
                                      )}
                                      
                                      {/* Status */}
                                      {isFieldVisible('status') && (
                                        <TableCell className="w-36">
                                          <StatusLozenge 
                                            status={item.status} 
                                            onStatusChange={(status) => handleInlineEdit(item.id, 'status', status)}
                                          />
                                        </TableCell>
                                      )}
                                      
                                      {/* Comments */}
                                      {isFieldVisible('comments') && (
                                        <TableCell className="w-28" onClick={(e) => e.stopPropagation()}>
                                          <button className="inline-flex items-center gap-1 text-[14px] text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded px-1 py-0.5 -mx-1 transition-colors">
                                            <MessageSquare className="h-3.5 w-3.5" />
                                            {item.comments > 0 ? (
                                              <span>{item.comments} comment{item.comments > 1 ? 's' : ''}</span>
                                            ) : (
                                              <span>Add comment</span>
                                            )}
                                          </button>
                                        </TableCell>
                                      )}
                                      
                                      {/* Assignee */}
                                      {isFieldVisible('assignee') && (
                                        <TableCell className="w-44">
                                          <AssigneeCell 
                                            assignee={item.assignee} 
                                            onAssigneeChange={(assignee) => handleInlineEdit(item.id, 'assignee', assignee)}
                                          />
                                        </TableCell>
                                      )}
                                      
                                      {/* Due date */}
                                      {isFieldVisible('dueDate') && (
                                        <TableCell className="w-28">
                                          <InlineDatePicker
                                            value={item.dueDate}
                                            onChange={(date) => handleInlineEdit(item.id, 'dueDate', date)}
                                          />
                                        </TableCell>
                                      )}
                                      
                                      {/* Priority */}
                                      {isFieldVisible('priority') && (
                                        <TableCell className="w-28">
                                          <PriorityCell 
                                            priority={item.priority}
                                            onPriorityChange={(priority) => handleInlineEdit(item.id, 'priority', priority)}
                                          />
                                        </TableCell>
                                      )}
                                      
                                      {/* Labels */}
                                      {isFieldVisible('labels') && (
                                        <TableCell className="w-24">
                                          {item.labels.length > 0 ? (
                                            <div className="flex gap-1 flex-wrap">
                                              {item.labels.map((label) => (
                                                <span key={label} className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                                  {label}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <button className="text-[14px] text-slate-500 hover:text-blue-600" onClick={(e) => e.stopPropagation()}>
                                              + Add label
                                            </button>
                                          )}
                                        </TableCell>
                                      )}
                                      
                                      {/* Created */}
                                      {isFieldVisible('created') && (
                                        <TableCell className="w-28">
                                          <div className="inline-flex items-center gap-1 text-[14px] text-slate-500">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>{formatDate(item.created)}</span>
                                          </div>
                                        </TableCell>
                                      )}

                                      {/* Spacer for field picker */}
                                      <TableCell className="w-10" />
                                    </tr>
                                  )}
                                </Draggable>
                              );
                            })}
                          </React.Fragment>
                        ))}
                        {provided.placeholder}
                      </tbody>
                    )}
                  </Droppable>
                </DragDropContext>
              </table>
            </div>

            {/* Footer inside card */}
            <div className="border-t border-slate-200 flex items-center justify-between px-4 py-2 bg-white flex-shrink-0">
              <span className="text-[14px] text-slate-600">
                {selectedItems.size > 0 
                  ? `${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} selected`
                  : `Showing ${sortedItems.length} of ${items.length} items`
                }
              </span>
              <button className="inline-flex items-center gap-1 text-[14px] text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="h-4 w-4" />
                Create
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <IssueDetailPanel 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
}

export default ListView;
