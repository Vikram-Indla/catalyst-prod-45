import React, { useState } from 'react';
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
import { 
  ColumnHeaderMenu, 
  FieldPicker, 
  GroupByMenu, 
  type GroupByOption,
  InlineDatePicker,
  InlineSummaryEdit,
  WorkItemDetailPanel 
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

// Type icons matching Jira
const typeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  Feature: { icon: <Zap className="h-4 w-4" />, color: 'text-purple-500' },
  Story: { icon: <Bookmark className="h-4 w-4" />, color: 'text-green-600' },
  Task: { icon: <CircleDot className="h-4 w-4" />, color: 'text-blue-500' },
  Defect: { icon: <Bug className="h-4 w-4" />, color: 'text-red-500' },
  Subtask: { icon: <CircleDot className="h-4 w-4" />, color: 'text-cyan-500' },
  Incident: { icon: <Settings2 className="h-4 w-4" />, color: 'text-orange-500' },
};

// Jira-exact status lozenge styles
const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  'Backlog': { bg: 'bg-[#DFE1E6]', text: 'text-[#42526E]', label: 'BACKLOG' },
  'To Do': { bg: 'bg-[#DFE1E6]', text: 'text-[#42526E]', label: 'TO DO' },
  'In Progress': { bg: 'bg-[#DEEBFF]', text: 'text-[#0747A6]', label: 'IN PROGRESS' },
  'In Requirement': { bg: 'bg-[#DEEBFF]', text: 'text-[#0747A6]', label: 'IN REQUIREMENTS' },
  'In Production': { bg: 'bg-[#EAE6FF]', text: 'text-[#403294]', label: 'IN PRODUCTION' },
  'Done': { bg: 'bg-[#E3FCEF]', text: 'text-[#006644]', label: 'DONE' },
  'Closed': { bg: 'bg-[#DFE1E6]', text: 'text-[#42526E]', label: 'CLOSED' },
  'Blocked': { bg: 'bg-[#FFEBE6]', text: 'text-[#BF2600]', label: 'BLOCKED' },
};

const statusOptions = ['Backlog', 'To Do', 'In Progress', 'In Requirement', 'In Production', 'Done', 'Closed', 'Blocked'];

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
  'Highest': { icon: <ChevronsUp className="h-4 w-4" />, color: 'text-[#FF5630]' },
  'High': { icon: <ArrowUp className="h-4 w-4" />, color: 'text-[#FF7452]' },
  'Medium': { icon: <Minus className="h-4 w-4" />, color: 'text-[#FFAB00]' },
  'Low': { icon: <ArrowDown className="h-4 w-4" />, color: 'text-[#36B37E]' },
  'Lowest': { icon: <ChevronsDown className="h-4 w-4" />, color: 'text-[#6B778C]' },
};

type SortField = string;
type SortDirection = 'asc' | 'desc';

// Jira-style status lozenge
function StatusLozenge({ status, onStatusChange }: { status: string; onStatusChange: (status: string) => void }) {
  const style = statusStyles[status] || statusStyles['Backlog'];
  
  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="focus:outline-none focus:ring-2 focus:ring-[#4C9AFF] focus:ring-offset-1 rounded-sm">
          <span className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wide cursor-pointer",
            style.bg, style.text
          )}>
            {style.label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1 bg-white border border-[#DFE1E6] shadow-lg" align="start">
        <div className="flex flex-col">
          {statusOptions.map((opt) => {
            const optStyle = statusStyles[opt] || statusStyles['Backlog'];
            return (
              <button
                key={opt}
                className={cn(
                  "text-left px-2 py-1.5 text-sm rounded-[3px] hover:bg-[#F4F5F7] transition-colors",
                  status === opt && "bg-[#E9F2FF]"
                )}
                onClick={() => onStatusChange(opt)}
              >
                <span className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wide",
                  optStyle.bg, optStyle.text
                )}>
                  {optStyle.label}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Jira-style assignee cell with "Assign to me" option
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
        <button className="flex items-center gap-2 hover:bg-[#F4F5F7] rounded px-1 py-0.5 -mx-1 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4C9AFF] focus:ring-offset-1 min-w-0">
          {assignee ? (
            <>
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback className={cn("text-[10px] text-white", getAvatarColor(assignee.name))}>
                  {getInitials(assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[13px] text-[#172B4D] truncate">{assignee.name}</span>
            </>
          ) : (
            <span className="text-[13px] text-[#6B778C]">Unassigned</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 bg-white border border-[#DFE1E6] shadow-lg" align="start">
        <div className="p-2 border-b border-[#DFE1E6]">
          <Input
            placeholder="Search assignees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-[13px] bg-[#F4F5F7] border-transparent rounded-[3px] focus:border-[#4C9AFF] focus:bg-white"
          />
        </div>
        <div className="flex flex-col max-h-60 overflow-auto p-1">
          <button
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-[3px] hover:bg-[#F4F5F7] transition-colors text-left text-[#0052CC]"
            onClick={() => onAssigneeChange(null)}
          >
            Unassigned
          </button>
          <button
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-[3px] hover:bg-[#DEEBFF] bg-[#E9F2FF] transition-colors text-left text-[#0052CC] font-medium"
            onClick={() => onAssigneeChange({ name: 'Vikram India' })}
          >
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarFallback className="text-[10px] text-white bg-green-600">VI</AvatarFallback>
            </Avatar>
            Vikram India (Assign to me)
          </button>
          <div className="h-px bg-[#DFE1E6] my-1" />
          {filteredAssignees.map((opt) => (
            <button
              key={opt.name}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-sm rounded-[3px] hover:bg-[#F4F5F7] transition-colors text-left",
                assignee?.name === opt.name && "bg-[#E9F2FF]"
              )}
              onClick={() => onAssigneeChange(opt)}
            >
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback className={cn("text-[10px] text-white", getAvatarColor(opt.name))}>
                  {getInitials(opt.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[#172B4D]">{opt.name}</span>
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
        <button className="flex items-center gap-1 hover:bg-[#F4F5F7] rounded px-1 py-0.5 -mx-1 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4C9AFF] focus:ring-offset-1">
          <span className={info.color}>{info.icon}</span>
          <span className="text-[13px] text-[#172B4D]">{priority}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1 bg-white border border-[#DFE1E6] shadow-lg" align="start">
        {priorityOptions.map((opt) => {
          const optInfo = priorityIcons[opt] || priorityIcons['Medium'];
          return (
            <button
              key={opt}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-[3px] hover:bg-[#F4F5F7] transition-colors text-left",
                priority === opt && "bg-[#E9F2FF]"
              )}
              onClick={() => onPriorityChange(opt)}
            >
              <span className={optInfo.color}>{optInfo.icon}</span>
              <span className="text-[#172B4D]">{opt}</span>
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
    // Update selected item if it's open
    if (selectedItem?.id === id) {
      setSelectedItem(prev => prev ? { ...prev, [field]: value } : null);
    }
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

  // Group items if grouping is enabled
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

  return (
    <div className="h-full flex bg-white" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Main content area */}
      <div className={cn("flex-1 flex flex-col min-w-0", selectedItem && "border-r border-[#DFE1E6]")}>
        {/* Jira-style toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#DFE1E6] bg-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B778C]" />
              <Input
                placeholder="Search list"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-40 text-[13px] bg-[#F4F5F7] border-transparent rounded-[3px] focus:border-[#4C9AFF] focus:bg-white placeholder:text-[#6B778C]"
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
              <div className="h-7 w-7 rounded-full bg-[#DFE1E6] flex items-center justify-center text-[11px] text-[#6B778C] border-2 border-white font-medium">
                +{assigneeOptions.length - 3}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-[13px] text-[#42526E] hover:bg-[#F4F5F7] font-normal">
              Filter
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <GroupByMenu value={groupBy} onChange={setGroupBy} />
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#F4F5F7]">
              <Settings2 className="h-4 w-4 text-[#6B778C]" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#F4F5F7]">
              <MoreHorizontal className="h-4 w-4 text-[#6B778C]" />
            </Button>
          </div>
        </div>

        {/* Jira-style table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: '1100px' }}>
            <thead className="bg-white sticky top-0 z-10">
              <tr>
                <th className="w-10 px-2 py-2 border-b border-[#DFE1E6]">
                  <Checkbox
                    checked={selectedItems.size === items.length && items.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="rounded-[2px] border-[#DFE1E6] data-[state=checked]:bg-[#0052CC] data-[state=checked]:border-[#0052CC]"
                  />
                </th>
                {isFieldVisible('type') && (
                  <th className="w-20 px-2 py-2 text-left text-[11px] font-semibold text-[#6B778C] border-b border-[#DFE1E6] uppercase tracking-wider">Type</th>
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
                    className="w-20"
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
                    className="w-32"
                  />
                )}
                {isFieldVisible('comments') && (
                  <th className="w-28 px-2 py-2 text-left text-[11px] font-semibold text-[#6B778C] border-b border-[#DFE1E6] uppercase tracking-wider">Comments</th>
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
                    className="w-40"
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
                    className="w-24"
                  />
                )}
                {isFieldVisible('labels') && (
                  <th className="w-20 px-2 py-2 text-left text-[11px] font-semibold text-[#6B778C] border-b border-[#DFE1E6] uppercase tracking-wider">Labels</th>
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
                <FieldPicker visibleFields={visibleFields} onToggleField={handleToggleField} />
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedItems).map(([groupKey, groupItems]) => (
                <React.Fragment key={groupKey}>
                  {groupBy !== 'none' && (
                    <tr className="bg-[#F4F5F7]">
                      <td colSpan={12} className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <ChevronDown className="h-4 w-4 text-[#6B778C]" />
                          <span className="text-[13px] font-semibold text-[#172B4D]">{groupKey}</span>
                          <span className="text-[12px] text-[#6B778C]">{groupItems.length}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {groupItems.map((item) => {
                    const typeInfo = typeIcons[item.type] || typeIcons['Task'];
                    const isHovered = hoveredRow === item.id;
                    const isSelected = selectedItems.has(item.id);
                    const isDetailOpen = selectedItem?.id === item.id;
                    
                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "border-b border-[#EBECF0] transition-colors cursor-pointer",
                          isHovered && "bg-[#F4F5F7]",
                          isSelected && "bg-[#E9F2FF]",
                          isDetailOpen && "bg-[#DEEBFF]"
                        )}
                        onClick={() => handleRowClick(item)}
                        onMouseEnter={() => setHoveredRow(item.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {/* Checkbox + drag handle */}
                        <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-0.5">
                            {isHovered && (
                              <GripVertical className="h-4 w-4 text-[#B3BAC5] cursor-grab" />
                            )}
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                              className="rounded-[2px] border-[#DFE1E6] data-[state=checked]:bg-[#0052CC] data-[state=checked]:border-[#0052CC]"
                            />
                          </div>
                        </td>
                        
                        {/* Type with expand chevron */}
                        {isFieldVisible('type') && (
                          <td className="px-2 py-1">
                            <div className="flex items-center gap-0.5">
                              {item.hasChildren ? (
                                <button 
                                  onClick={(e) => handleToggleExpand(item.id, e)}
                                  className="p-0.5 hover:bg-[#DFE1E6] rounded transition-colors"
                                >
                                  <ChevronRight className={cn(
                                    "h-4 w-4 text-[#6B778C] transition-transform",
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
                                  className="p-0.5 hover:bg-[#DFE1E6] rounded transition-colors ml-0.5"
                                >
                                  <Plus className="h-3.5 w-3.5 text-[#6B778C]" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                        
                        {/* Key */}
                        {isFieldVisible('key') && (
                          <td className="px-2 py-1">
                            <span className="text-[13px] font-normal text-[#0052CC] hover:underline cursor-pointer">
                              {item.key}
                            </span>
                          </td>
                        )}
                        
                        {/* Summary */}
                        {isFieldVisible('summary') && (
                          <td className="px-2 py-1 max-w-[300px]">
                            <InlineSummaryEdit 
                              value={item.summary}
                              onChange={(value) => handleInlineEdit(item.id, 'summary', value)}
                              isSelected={isSelected}
                            />
                          </td>
                        )}
                        
                        {/* Status */}
                        {isFieldVisible('status') && (
                          <td className="px-2 py-1">
                            <StatusLozenge 
                              status={item.status} 
                              onStatusChange={(status) => handleInlineEdit(item.id, 'status', status)}
                            />
                          </td>
                        )}
                        
                        {/* Comments */}
                        {isFieldVisible('comments') && (
                          <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                            <button className="flex items-center gap-1 text-[13px] text-[#6B778C] hover:text-[#172B4D] hover:bg-[#F4F5F7] rounded px-1 py-0.5 -mx-1 transition-colors">
                              <MessageSquare className="h-3.5 w-3.5" />
                              {item.comments > 0 ? (
                                <span>{item.comments} comment{item.comments > 1 ? 's' : ''}</span>
                              ) : (
                                <span>Add comment</span>
                              )}
                            </button>
                          </td>
                        )}
                        
                        {/* Assignee */}
                        {isFieldVisible('assignee') && (
                          <td className="px-2 py-1">
                            <AssigneeCell 
                              assignee={item.assignee} 
                              onAssigneeChange={(assignee) => handleInlineEdit(item.id, 'assignee', assignee)}
                            />
                          </td>
                        )}
                        
                        {/* Due date */}
                        {isFieldVisible('dueDate') && (
                          <td className="px-2 py-1">
                            <InlineDatePicker
                              value={item.dueDate}
                              onChange={(date) => handleInlineEdit(item.id, 'dueDate', date)}
                            />
                          </td>
                        )}
                        
                        {/* Priority */}
                        {isFieldVisible('priority') && (
                          <td className="px-2 py-1">
                            <PriorityCell 
                              priority={item.priority}
                              onPriorityChange={(priority) => handleInlineEdit(item.id, 'priority', priority)}
                            />
                          </td>
                        )}
                        
                        {/* Labels */}
                        {isFieldVisible('labels') && (
                          <td className="px-2 py-1">
                            {item.labels.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {item.labels.map((label) => (
                                  <span key={label} className="text-[11px] text-[#6B778C] bg-[#DFE1E6] px-1.5 py-0.5 rounded-[3px]">
                                    {label}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <button className="text-[13px] text-[#6B778C] hover:text-[#0052CC]" onClick={(e) => e.stopPropagation()}>
                                + Add label
                              </button>
                            )}
                          </td>
                        )}
                        
                        {/* Created */}
                        {isFieldVisible('created') && (
                          <td className="px-2 py-1">
                            <div className="flex items-center gap-1 text-[13px] text-[#6B778C]">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{formatDate(item.created)}</span>
                            </div>
                          </td>
                        )}

                        {/* Spacer for field picker */}
                        <td className="w-10"></td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
              
              {/* + Create row */}
              <tr className="border-b border-[#EBECF0] hover:bg-[#F4F5F7] cursor-pointer">
                <td colSpan={12} className="px-4 py-2">
                  <button className="flex items-center gap-2 text-[13px] text-[#6B778C] hover:text-[#172B4D]">
                    <Plus className="h-4 w-4" />
                    Create
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Jira-style footer */}
        <div className="px-4 py-2 border-t border-[#DFE1E6] text-[13px] text-[#6B778C] bg-white flex-shrink-0">
          {selectedItems.size > 0 ? (
            <span>{selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected</span>
          ) : (
            <span>Showing {sortedItems.length} of {items.length} items</span>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <WorkItemDetailPanel 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
}

export default ListView;
