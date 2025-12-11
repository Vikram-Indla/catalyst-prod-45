import React, { useState } from 'react';
import { Search, ChevronRight, ChevronDown, ChevronUp, MessageSquare, Calendar, Minus, ArrowUp, ArrowDown, Zap, Bug, Bookmark, CircleDot, LayoutGrid, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  reporter: string;
  hasChildren?: boolean;
}

// Mock data with richer assignee info
const mockItems: WorkItem[] = [
  { id: '1', type: 'Feature', key: 'ICP-1', summary: 'Invoices Management', status: 'Backlog', comments: 0, assignee: null, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-02', updated: '2025-07-29', reporter: 'Sarah M.', hasChildren: true },
  { id: '2', type: 'Story', key: 'ICP-2', summary: 'Dashboard', status: 'Backlog', comments: 0, assignee: null, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-02', updated: '2025-09-24', reporter: 'John D.', hasChildren: true },
  { id: '3', type: 'Feature', key: 'ICP-3', summary: 'Application Request', status: 'Backlog', comments: 0, assignee: null, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-02', updated: '2025-11-25', reporter: 'Mike R.', hasChildren: true },
  { id: '4', type: 'Feature', key: 'ICP-4', summary: 'Solution Management', status: 'Backlog', comments: 0, assignee: null, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-02', updated: '2025-07-29', reporter: 'QA Team', hasChildren: true },
  { id: '5', type: 'Task', key: 'ICP-210', summary: 'Exception Path - مسار الاستثناء', status: 'In Requirement', comments: 1, assignee: { name: 'Mohammed Hassan', avatar: '' }, dueDate: '2025-09-30', priority: 'Medium', labels: [], created: '2025-09-30', updated: '2025-11-30', reporter: 'Sarah M.', hasChildren: false },
  { id: '6', type: 'Story', key: 'ICP-28', summary: '[UX Design] Enable Selection of Instant Mitigation Tool ...', status: 'Done', comments: 0, assignee: { name: 'Amal Alghofaily', avatar: '' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-14', updated: '2025-08-17', reporter: 'John D.', hasChildren: false },
  { id: '7', type: 'Feature', key: 'ICP-34', summary: 'Invoice Management [Rebate Calculation]', status: 'Backlog', comments: 0, assignee: null, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-15', updated: '2025-08-05', reporter: 'Mike R.', hasChildren: true },
  { id: '8', type: 'Feature', key: 'ICP-246', summary: 'Enhance Application Form and Requests Page - تحسين صفحة الطلبات', status: 'Done', comments: 3, assignee: { name: 'Abdulrahman Saad', avatar: '' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-10-19', updated: '2025-12-01', reporter: 'Sarah M.', hasChildren: true },
  { id: '9', type: 'Story', key: 'ICP-35', summary: 'Soultion Notification', status: 'Backlog', comments: 0, assignee: { name: 'Faisal Javed Parachcha', avatar: '' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-15', updated: '2025-10-30', reporter: 'John D.', hasChildren: true },
  { id: '10', type: 'Story', key: 'ICP-36', summary: '[UX Design] Manage Instant Mitigation Tool Calculation ...', status: 'Done', comments: 0, assignee: { name: 'Amal Alghofaily', avatar: '' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-07-17', updated: '2025-08-17', reporter: 'Mike R.', hasChildren: false },
  { id: '11', type: 'Defect', key: 'ICP-129', summary: 'Back office actions blocked due to error screen', status: 'Closed', comments: 0, assignee: { name: 'Waad Alasim', avatar: '' }, dueDate: null, priority: 'Medium', labels: [], created: '2025-08-21', updated: '2025-08-21', reporter: 'QA Team', hasChildren: false },
];

const typeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  Feature: { icon: <Zap className="h-4 w-4" />, color: 'text-purple-500' },
  Story: { icon: <Bookmark className="h-4 w-4" />, color: 'text-green-500' },
  Task: { icon: <CircleDot className="h-4 w-4" />, color: 'text-blue-500' },
  Defect: { icon: <Bug className="h-4 w-4" />, color: 'text-red-500' },
  Subtask: { icon: <LayoutGrid className="h-4 w-4" />, color: 'text-cyan-500' },
  Incident: { icon: <Settings2 className="h-4 w-4" />, color: 'text-orange-500' },
};

const statusStyles: Record<string, { bg: string; text: string }> = {
  'Backlog': { bg: 'bg-slate-200', text: 'text-slate-700' },
  'To Do': { bg: 'bg-slate-200', text: 'text-slate-700' },
  'In Progress': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'In Requirement': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'In Production': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Done': { bg: 'bg-green-100', text: 'text-green-700' },
  'Closed': { bg: 'bg-slate-300', text: 'text-slate-600' },
  'Blocked': { bg: 'bg-red-100', text: 'text-red-700' },
};

const priorityIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  Highest: { icon: <ArrowUp className="h-4 w-4" />, color: 'text-red-500' },
  High: { icon: <ArrowUp className="h-4 w-4" />, color: 'text-orange-500' },
  Medium: { icon: <Minus className="h-4 w-4" />, color: 'text-amber-500' },
  Low: { icon: <ArrowDown className="h-4 w-4" />, color: 'text-green-500' },
  Lowest: { icon: <ArrowDown className="h-4 w-4" />, color: 'text-blue-500' },
};

const statusOptions = ['Backlog', 'To Do', 'In Progress', 'In Requirement', 'In Production', 'Done', 'Closed', 'Blocked'];
const priorityOptions = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
const assigneeOptions = [
  { name: 'Amal Alghofaily', avatar: '' },
  { name: 'Abdulrahman Saad', avatar: '' },
  { name: 'Mohammed Hassan', avatar: '' },
  { name: 'Waad Alasim', avatar: '' },
  { name: 'Faisal Javed Parachcha', avatar: '' },
];

type SortField = keyof WorkItem;
type SortDirection = 'asc' | 'desc';

// Inline editable cell for text
function InlineEditableText({ 
  value, 
  onSave,
  className 
}: { 
  value: string; 
  onSave: (value: string) => void;
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className="h-7 text-sm px-2 py-1"
      />
    );
  }

  return (
    <div 
      className={cn(
        "text-sm truncate cursor-text hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      {value}
    </div>
  );
}

// Inline status badge with popover for editing
function InlineStatusBadge({ 
  status, 
  onStatusChange 
}: { 
  status: string; 
  onStatusChange: (status: string) => void;
}) {
  const style = statusStyles[status] || statusStyles['Backlog'];
  
  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded">
          <Badge 
            variant="secondary" 
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 cursor-pointer hover:opacity-80 transition-opacity",
              style.bg, 
              style.text
            )}
          >
            {status}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        <div className="flex flex-col">
          {statusOptions.map((opt) => {
            const optStyle = statusStyles[opt] || statusStyles['Backlog'];
            return (
              <button
                key={opt}
                className={cn(
                  "text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors",
                  status === opt && "bg-muted"
                )}
                onClick={() => onStatusChange(opt)}
              >
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5",
                    optStyle.bg, 
                    optStyle.text
                  )}
                >
                  {opt}
                </Badge>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Inline assignee selector
function InlineAssignee({ 
  assignee, 
  onAssigneeChange 
}: { 
  assignee: { name: string; avatar?: string } | null; 
  onAssigneeChange: (assignee: { name: string; avatar?: string } | null) => void;
}) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="flex items-center gap-2 hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1">
          {assignee ? (
            <>
              <Avatar className="h-6 w-6">
                {assignee.avatar && <AvatarImage src={assignee.avatar} />}
                <AvatarFallback className="text-[10px] bg-brand-gold/20 text-brand-gold-foreground">
                  {getInitials(assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground truncate max-w-[120px]">{assignee.name}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Unassigned</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <div className="flex flex-col">
          <button
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors text-left"
            onClick={() => onAssigneeChange(null)}
          >
            <span className="text-muted-foreground">Unassigned</span>
          </button>
          {assigneeOptions.map((opt) => (
            <button
              key={opt.name}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors text-left",
                assignee?.name === opt.name && "bg-muted"
              )}
              onClick={() => onAssigneeChange(opt)}
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-brand-gold/20 text-brand-gold-foreground">
                  {getInitials(opt.name)}
                </AvatarFallback>
              </Avatar>
              <span>{opt.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Inline priority selector
function InlinePriority({ 
  priority, 
  onPriorityChange 
}: { 
  priority: string; 
  onPriorityChange: (priority: string) => void;
}) {
  const p = priorityIcons[priority] || priorityIcons['Medium'];
  
  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className={cn(
          "flex items-center gap-1 hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          p.color
        )}>
          {p.icon}
          <span className="text-sm">{priority}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        <div className="flex flex-col">
          {priorityOptions.map((opt) => {
            const optP = priorityIcons[opt];
            return (
              <button
                key={opt}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors text-left",
                  priority === opt && "bg-muted",
                  optP.color
                )}
                onClick={() => onPriorityChange(opt)}
              >
                {optP.icon}
                <span>{opt}</span>
              </button>
            );
          })}
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
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
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
        "px-3 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 select-none whitespace-nowrap",
        className
      )}
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
      {/* Top Bar - Atlaskit style */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search list"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-48 text-sm bg-muted/30 border-transparent focus:border-border focus:bg-background"
            />
          </div>
          {/* Avatar group */}
          <div className="flex -space-x-1.5">
            {assigneeOptions.slice(0, 3).map((a, i) => (
              <Avatar key={a.name} className="h-7 w-7 border-2 border-background ring-0">
                <AvatarFallback className="text-[10px] bg-brand-gold text-white">
                  {a.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            ))}
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground border-2 border-background">
              +{assigneeOptions.length - 3}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
            Filter
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
            Group
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Table - Atlaskit style */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1400px]">
          <thead className="bg-muted/30 sticky top-0 z-10">
            <tr className="border-b border-border">
              <th className="w-10 px-3 py-2">
                <Checkbox
                  checked={selectedItems.size === items.length && items.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </th>
              <th className="w-16 px-2 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
              <SortHeader field="key" className="w-24">Key</SortHeader>
              <SortHeader field="summary" className="min-w-[300px]">Summary</SortHeader>
              <SortHeader field="status" className="w-32">Status</SortHeader>
              <th className="w-28 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Comments</th>
              <SortHeader field="assignee" className="w-40">Assignee</SortHeader>
              <SortHeader field="dueDate" className="w-32">Due date</SortHeader>
              <SortHeader field="priority" className="w-28">Priority</SortHeader>
              <th className="w-24 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Labels</th>
              <SortHeader field="created" className="w-32">Created</SortHeader>
              <SortHeader field="updated" className="w-32">Updated</SortHeader>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => {
              const typeInfo = typeIcons[item.type] || typeIcons['Task'];
              return (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-border/50 hover:bg-muted/30 transition-colors",
                    selectedItems.has(item.id) && "bg-primary/5"
                  )}
                  onClick={() => console.log('Open item:', item.key)}
                >
                  <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      {item.hasChildren && (
                        <button 
                          onClick={(e) => handleToggleExpand(item.id, e)}
                          className="p-0.5 hover:bg-muted rounded transition-colors"
                        >
                          <ChevronRight className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            expandedItems.has(item.id) && "rotate-90"
                          )} />
                        </button>
                      )}
                      <span className={typeInfo.color} title={item.type}>
                        {typeInfo.icon}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="text-sm font-medium text-primary hover:underline cursor-pointer">
                      {item.key}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 max-w-md">
                    <InlineEditableText
                      value={item.summary}
                      onSave={(value) => handleInlineEdit(item.id, 'summary', value)}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <InlineStatusBadge 
                      status={item.status} 
                      onStatusChange={(status) => handleInlineEdit(item.id, 'status', status)}
                    />
                  </td>
                  <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {item.comments > 0 ? (
                        <span>{item.comments} comment{item.comments > 1 ? 's' : ''}</span>
                      ) : (
                        <span>Add comment</span>
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-1.5">
                    <InlineAssignee 
                      assignee={item.assignee} 
                      onAssigneeChange={(assignee) => handleInlineEdit(item.id, 'assignee', assignee)}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    {item.dueDate ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(item.dueDate)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <InlinePriority 
                      priority={item.priority} 
                      onPriorityChange={(priority) => handleInlineEdit(item.id, 'priority', priority)}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    {item.labels.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {item.labels.slice(0, 2).map((label) => (
                          <Badge key={label} variant="outline" className="text-xs px-1.5 py-0 font-normal">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(item.created)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
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

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border text-sm text-muted-foreground bg-background">
        {selectedItems.size > 0 ? (
          <span>{selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected</span>
        ) : (
          <span>{sortedItems.length} item{sortedItems.length !== 1 ? 's' : ''}</span>
        )}
      </div>
    </div>
  );
}

export default ListView;
