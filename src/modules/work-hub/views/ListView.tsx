import React, { useState } from 'react';
import { 
  Search, ChevronRight, ChevronDown, ChevronUp, 
  MessageSquare, Calendar, Minus, ArrowUp, ArrowDown, 
  Zap, Bug, Bookmark, CircleDot, Settings2, GripVertical, Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
}

// Mock data matching Jira screenshot
const mockItems: WorkItem[] = [
  { id: '1', type: 'Feature', key: 'ICP-1', summary: 'Invoices Management', status: 'Backlog', comments: 0, assignee: null, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-02', updated: '2025-07-29', hasChildren: true },
  { id: '2', type: 'Feature', key: 'ICP-2', summary: 'Dashboard', status: 'Backlog', comments: 0, assignee: null, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-02', updated: '2025-09-24', hasChildren: true },
  { id: '3', type: 'Feature', key: 'ICP-3', summary: 'Application Request', status: 'Backlog', comments: 0, assignee: null, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-02', updated: '2025-11-25', hasChildren: true },
  { id: '4', type: 'Feature', key: 'ICP-4', summary: 'Solution Management', status: 'Backlog', comments: 0, assignee: null, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-02', updated: '2025-07-29', hasChildren: true },
  { id: '5', type: 'Task', key: 'ICP-210', summary: 'Exception Path - مسار الاستثناء', status: 'In Requirement', comments: 1, assignee: { name: 'Mohammed Hassan' }, dueDate: '2025-09-30', priority: 'Medium', labels: [], created: '2025-09-30', updated: '2025-11-30', hasChildren: false },
  { id: '6', type: 'Story', key: 'ICP-28', summary: '[UX Design] Enable Selection of Instant Mitigation Tool ...', status: 'Done', comments: 0, assignee: { name: 'Amal Alghofaily' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-14', updated: '2025-08-17', hasChildren: false },
  { id: '7', type: 'Feature', key: 'ICP-34', summary: 'Invoice Management [Rebate Calculation]', status: 'Backlog', comments: 0, assignee: null, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-15', updated: '2025-08-05', hasChildren: true },
  { id: '8', type: 'Feature', key: 'ICP-246', summary: 'Enhance Application Form and Requests Page - تحسين صفحة الطلبات', status: 'Done', comments: 3, assignee: { name: 'Abdulrahman Saad' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-10-19', updated: '2025-12-01', hasChildren: true },
  { id: '9', type: 'Feature', key: 'ICP-35', summary: 'Soultion Notification', status: 'Backlog', comments: 0, assignee: { name: 'Faisal Javed Parachcha' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-15', updated: '2025-10-30', hasChildren: true },
  { id: '10', type: 'Story', key: 'ICP-36', summary: '[UX Design] Manage Instant Mitigation Tool Calculation ...', status: 'Done', comments: 0, assignee: { name: 'Amal Alghofaily' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-17', updated: '2025-08-17', hasChildren: false },
  { id: '11', type: 'Story', key: 'ICP-37', summary: '[UX Design] First-Level Review and Approval for Instant ...', status: 'Done', comments: 0, assignee: { name: 'Amal Alghofaily' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-17', updated: '2025-08-17', hasChildren: false },
  { id: '12', type: 'Story', key: 'ICP-38', summary: '[UX Design] Second-Level Review and Approval for Inst...', status: 'Done', comments: 0, assignee: { name: 'Amal Alghofaily' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-17', updated: '2025-08-17', hasChildren: false },
  { id: '13', type: 'Task', key: 'ICP-39', summary: 'Activate Mitigation Tool with Retroactive Start Date - تفعيل', status: 'In Production', comments: 4, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-23', updated: '2025-11-30', hasChildren: true },
  { id: '14', type: 'Task', key: 'ICP-40', summary: 'Update Financial Years in Application Form - تحديث القوائم المالية', status: 'In Production', comments: 4, assignee: { name: 'Abdulrahman Saad' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-23', updated: '2025-11-30', hasChildren: true },
  { id: '15', type: 'Defect', key: 'ICP-129', summary: 'Back office actions blocked due to error screen', status: 'Closed', comments: 0, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-08-21', updated: '2025-08-21', hasChildren: false },
  { id: '16', type: 'Story', key: 'ICP-132', summary: 'Send Invoices to SIDF System - إرسال الفواتير إلى صندوق التنمية الصناعي السعودي', status: 'Done', comments: 1, assignee: { name: 'Abdulrhman Alghizzi' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-08-21', updated: '2025-08-24', hasChildren: false },
  { id: '17', type: 'Defect', key: 'ICP-134', summary: 'Error when opening Immediate Mitigation request', status: 'Closed', comments: 0, assignee: { name: 'Waad Alasim' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-08-21', updated: '2025-08-24', hasChildren: false },
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
  'In Requirement': { bg: 'bg-[#DEEBFF]', text: 'text-[#0747A6]', label: 'IN REQUIREME...' },
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
];

type SortField = keyof WorkItem;
type SortDirection = 'asc' | 'desc';

// Jira-style status lozenge
function StatusLozenge({ status, onStatusChange }: { status: string; onStatusChange: (status: string) => void }) {
  const style = statusStyles[status] || statusStyles['Backlog'];
  
  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-sm">
          <span className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wide cursor-pointer",
            style.bg, style.text
          )}>
            {style.label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        <div className="flex flex-col">
          {statusOptions.map((opt) => {
            const optStyle = statusStyles[opt] || statusStyles['Backlog'];
            return (
              <button
                key={opt}
                className={cn(
                  "text-left px-2 py-1.5 text-sm rounded hover:bg-[#F4F5F7] transition-colors",
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

// Jira-style assignee cell
function AssigneeCell({ assignee, onAssigneeChange }: { 
  assignee: { name: string; avatar?: string } | null; 
  onAssigneeChange: (assignee: { name: string } | null) => void 
}) {
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-500', 'bg-teal-600'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="flex items-center gap-2 hover:bg-[#F4F5F7] rounded px-1 py-0.5 -mx-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 min-w-0">
          {assignee ? (
            <>
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback className={cn("text-[10px] text-white", getAvatarColor(assignee.name))}>
                  {getInitials(assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[13px] text-[#172B4D] truncate">{assignee.name}</span>
            </>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <div className="flex flex-col">
          <button
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-[#F4F5F7] transition-colors text-left"
            onClick={() => onAssigneeChange(null)}
          >
            <span className="text-[#6B778C]">Unassigned</span>
          </button>
          {assigneeOptions.map((opt) => (
            <button
              key={opt.name}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-[#F4F5F7] transition-colors text-left",
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

export function ListView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('key');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [items, setItems] = useState<WorkItem[]>(mockItems);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

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

  const sortedItems = [...filteredItems].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    if (aValue === null) return 1;
    if (bValue === null) return -1;
    if (typeof aValue === 'object' || typeof bValue === 'object') return 0;
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th
      className={cn(
        "px-2 py-2 text-left text-[11px] font-semibold text-[#6B778C] cursor-pointer hover:bg-[#F4F5F7] select-none whitespace-nowrap border-b border-[#DFE1E6]",
        className
      )}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-0.5">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        )}
      </div>
    </th>
  );

  return (
    <div className="h-full flex flex-col bg-white" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
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
            {assigneeOptions.slice(0, 3).map((a) => {
              const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);
              const getColor = (name: string) => {
                const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600'];
                return colors[name.charCodeAt(0) % colors.length];
              };
              return (
                <Avatar key={a.name} className="h-7 w-7 border-2 border-white">
                  <AvatarFallback className={cn("text-[10px] text-white", getColor(a.name))}>
                    {getInitials(a.name)}
                  </AvatarFallback>
                </Avatar>
              );
            })}
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
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-[13px] text-[#42526E] hover:bg-[#F4F5F7] font-normal">
            Group
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#F4F5F7]">
            <Settings2 className="h-4 w-4 text-[#6B778C]" />
          </Button>
        </div>
      </div>

      {/* Jira-style table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: '1200px' }}>
          <thead className="bg-white sticky top-0 z-10">
            <tr>
              <th className="w-10 px-2 py-2 border-b border-[#DFE1E6]">
                <Checkbox
                  checked={selectedItems.size === items.length && items.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="rounded-[2px] border-[#DFE1E6] data-[state=checked]:bg-[#0052CC] data-[state=checked]:border-[#0052CC]"
                />
              </th>
              <th className="w-20 px-2 py-2 text-left text-[11px] font-semibold text-[#6B778C] border-b border-[#DFE1E6]">Type</th>
              <SortHeader field="key" className="w-20">Key</SortHeader>
              <SortHeader field="summary" className="min-w-[280px]">Summary</SortHeader>
              <SortHeader field="status" className="w-28">Status</SortHeader>
              <th className="w-28 px-2 py-2 text-left text-[11px] font-semibold text-[#6B778C] border-b border-[#DFE1E6]">Comments</th>
              <SortHeader field="assignee" className="w-40">Assignee</SortHeader>
              <SortHeader field="dueDate" className="w-28">Due date</SortHeader>
              <SortHeader field="priority" className="w-24">Priority</SortHeader>
              <th className="w-20 px-2 py-2 text-left text-[11px] font-semibold text-[#6B778C] border-b border-[#DFE1E6]">Labels</th>
              <SortHeader field="created" className="w-28">Created</SortHeader>
              <SortHeader field="updated" className="w-28">Updated</SortHeader>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => {
              const typeInfo = typeIcons[item.type] || typeIcons['Task'];
              const isHovered = hoveredRow === item.id;
              const isSelected = selectedItems.has(item.id);
              
              return (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-[#EBECF0] transition-colors cursor-pointer",
                    isHovered && "bg-[#F4F5F7]",
                    isSelected && "bg-[#E9F2FF]"
                  )}
                  onClick={() => console.log('Open item:', item.key)}
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
                  
                  {/* Key */}
                  <td className="px-2 py-1">
                    <span className="text-[13px] font-normal text-[#0052CC] hover:underline cursor-pointer">
                      {item.key}
                    </span>
                  </td>
                  
                  {/* Summary */}
                  <td className="px-2 py-1 max-w-[300px]">
                    <span className="text-[13px] text-[#172B4D] truncate block">
                      {item.summary}
                    </span>
                  </td>
                  
                  {/* Status */}
                  <td className="px-2 py-1">
                    <StatusLozenge 
                      status={item.status} 
                      onStatusChange={(status) => handleInlineEdit(item.id, 'status', status)}
                    />
                  </td>
                  
                  {/* Comments */}
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
                  
                  {/* Assignee */}
                  <td className="px-2 py-1">
                    <AssigneeCell 
                      assignee={item.assignee} 
                      onAssigneeChange={(assignee) => handleInlineEdit(item.id, 'assignee', assignee)}
                    />
                  </td>
                  
                  {/* Due date */}
                  <td className="px-2 py-1">
                    {item.dueDate ? (
                      <div className="flex items-center gap-1 text-[13px] text-[#6B778C]">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(item.dueDate)}</span>
                      </div>
                    ) : null}
                  </td>
                  
                  {/* Priority */}
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1 text-[13px] text-[#6B778C]">
                      <Minus className="h-4 w-4 text-[#FFAB00]" />
                      <span>{item.priority}</span>
                    </div>
                  </td>
                  
                  {/* Labels */}
                  <td className="px-2 py-1">
                    {item.labels.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {item.labels.map((label) => (
                          <span key={label} className="text-[11px] text-[#6B778C] bg-[#DFE1E6] px-1.5 py-0.5 rounded-[3px]">
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  
                  {/* Created */}
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1 text-[13px] text-[#6B778C]">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(item.created)}</span>
                    </div>
                  </td>
                  
                  {/* Updated */}
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1 text-[13px] text-[#6B778C]">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(item.updated)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Jira-style footer */}
      <div className="px-4 py-2 border-t border-[#DFE1E6] text-[13px] text-[#6B778C] bg-white">
        {selectedItems.size > 0 ? (
          <span>{selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected</span>
        ) : (
          <span>Showing {sortedItems.length} of {items.length} items</span>
        )}
      </div>
    </div>
  );
}

export default ListView;
