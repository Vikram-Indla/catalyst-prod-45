import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, MoreHorizontal, Download, LayoutGrid, List, Zap, AlertCircle, CheckSquare, FileText, Columns, RefreshCw, PanelRightOpen, PanelRightClose } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AllWorkTicketList } from '../components/AllWorkTicketList';
import { AllWorkDetailPanel } from '../components/AllWorkDetailPanel';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface WorkItem {
  id: string;
  type: 'Feature' | 'Story' | 'Task' | 'Defect' | 'Subtask';
  key: string;
  summary: string;
  status: string;
  statusCategory: 'todo' | 'in_progress' | 'done';
  reporter: string;
  assignee: string | null;
  created: string;
  parent: string | null;
  parentType?: 'Feature' | 'Epic';
  children?: WorkItem[];
  description?: string;
}

const mockItems: WorkItem[] = [
  {
    id: '1',
    type: 'Feature',
    key: 'ICP-371',
    summary: 'Alignment issue - The system display alignment issue in Competitiveness P...',
    status: 'In Progress',
    statusCategory: 'in_progress',
    reporter: 'Mohammed Hassan',
    assignee: 'Yazeed Daraz',
    created: 'Dec 07, 2025, 3:11 PM',
    parent: 'EPIC-45',
    parentType: 'Epic',
    description: 'The system is displaying alignment issues in the Competitiveness Portal. This affects the user experience and needs to be fixed urgently.',
    children: [
      { id: '1-1', type: 'Story', key: 'ICP-363', summary: 'Operation L2, L3 update Solutions inside the assigned solutions packages...', status: 'In Progress', statusCategory: 'in_progress', reporter: 'Mohammed Hassan', assignee: 'Abdulrahman Saad', created: 'Nov 30, 2025, 12:42 PM', parent: 'ICP-371', parentType: 'Feature' },
      { id: '1-2', type: 'Task', key: 'ICP-362', summary: 'a testing account that has a factory before 2022', status: 'Backlog', statusCategory: 'todo', reporter: 'Mohammed Hassan', assignee: 'Faisal Javed Paracha', created: 'Nov 25, 2025, 12:44 PM', parent: 'ICP-371', parentType: 'Feature' },
    ],
  },
  {
    id: '2',
    type: 'Defect',
    key: 'ICP-354',
    summary: 'Remove the disclaimer message "Bank account Information" when it\'s a n...',
    status: 'Ready for QA',
    statusCategory: 'in_progress',
    reporter: 'Mohammed Hassan',
    assignee: 'menna nasser',
    created: 'Nov 19, 2025, 6:22 PM',
    parent: 'FTR-128',
    parentType: 'Feature',
    description: 'The disclaimer message for Bank account Information should be removed when it is not applicable to the current context.',
    children: [
      { id: '2-1', type: 'Subtask', key: 'ICP-352', summary: 'Change the rebate start date for one license', status: 'In Production', statusCategory: 'done', reporter: 'Mohammed Hassan', assignee: 'Abdulrahman Saad', created: 'Nov 17, 2025, 6:23 PM', parent: 'ICP-354', parentType: 'Feature' },
    ],
  },
  {
    id: '3',
    type: 'Defect',
    key: 'ICP-350',
    summary: 'UX UAT issues',
    status: 'Ready for QA',
    statusCategory: 'in_progress',
    reporter: 'Mohammed Hassan',
    assignee: 'Mazen',
    created: 'Nov 17, 2025, 4:09 PM',
    parent: 'EPIC-42',
    parentType: 'Epic',
  },
  {
    id: '4',
    type: 'Story',
    key: 'ICP-342',
    summary: 'Automating the Financial Evaluation Process - أتمتة عملية التقييم المالي',
    status: 'Backlog',
    statusCategory: 'todo',
    reporter: 'Mohammed Hassan Ali Mohamm...',
    assignee: 'eid mahmoud',
    created: 'Nov 15, 2025, 3:57 PM',
    parent: 'FTR-99',
    parentType: 'Feature',
    description: 'Automate the financial evaluation process to reduce manual work and improve accuracy.',
  },
];

const typeColors: Record<string, string> = {
  Feature: 'bg-purple-500',
  Story: 'bg-green-500',
  Task: 'bg-blue-500',
  Defect: 'bg-red-500',
  Subtask: 'bg-cyan-500',
};

// Available columns for configuration
const availableColumns = [
  { id: 'work-type', name: 'Work type', enabled: true },
  { id: 'work-item-key', name: 'Work item key', enabled: true },
  { id: 'summary', name: 'Summary', enabled: true },
  { id: 'status', name: 'Status', enabled: true },
  { id: 'fix-versions', name: 'Fix versions', enabled: true },
  { id: 'reporter', name: 'Reporter', enabled: true },
  { id: 'assignee', name: 'Assignee', enabled: true },
  { id: 'created', name: 'Created', enabled: true },
  { id: 'parent', name: 'Parent', enabled: true },
];

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
  const navigate = useNavigate();
  const [showHierarchy, setShowHierarchy] = useState(true);
  const [hideDone, setHideDone] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['1', '2']));
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Detail panel states
  const [detailModeEnabled, setDetailModeEnabled] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);
  
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
  
  // Column configuration states
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [enabledColumns, setEnabledColumns] = useState<Set<string>>(
    new Set(availableColumns.filter(c => c.enabled).map(c => c.id))
  );

  // Handle clicking a ticket row
  const handleRowClick = (item: WorkItem) => {
    if (detailModeEnabled) {
      setSelectedWorkItem(item);
    } else {
      // When not in detail mode, enable it and show the item
      setDetailModeEnabled(true);
      setSelectedWorkItem(item);
    }
  };

  // Handle navigating to parent (Feature/Epic)
  const handleNavigateToParent = (parentKey: string, parentType: 'Feature' | 'Epic') => {
    toast.info(`Navigating to ${parentType}: ${parentKey}`);
    // In production, navigate to the actual route
    // navigate(`/items/${parentType.toLowerCase()}s/${parentKey}`);
  };

  // Close detail panel
  const handleCloseDetail = () => {
    setSelectedWorkItem(null);
    setDetailModeEnabled(false);
  };

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
    const isSelected = selectedWorkItem?.id === item.id;

    return (
      <React.Fragment key={item.id}>
        <tr 
          className={cn(
            "hover:bg-slate-50 border-b border-slate-200 group cursor-pointer",
            isSelected && detailModeEnabled && "bg-blue-50"
          )}
          onClick={() => handleRowClick(item)}
        >
          {/* Checkbox */}
          <td className="px-2 py-2 w-8" onClick={(e) => e.stopPropagation()}>
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
          {/* Expand/collapse */}
          <td className="px-1 py-2 w-6" onClick={(e) => e.stopPropagation()}>
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
            ) : level > 0 ? null : null}
          </td>
          {/* Work column - icon + key + summary combined */}
          <td className="px-2 py-2" style={{ paddingLeft: level > 0 ? `${level * 20}px` : undefined }}>
            <div className="flex items-center gap-2">
              <div className={cn('w-4 h-4 rounded flex-shrink-0 flex items-center justify-center', typeColors[item.type])}>
                {item.type === 'Defect' && <span className="text-white text-[10px]">!</span>}
                {item.type === 'Story' && <span className="text-white text-[10px]">✓</span>}
                {item.type === 'Task' && <span className="text-white text-[10px]">□</span>}
                {item.type === 'Feature' && <span className="text-white text-[10px]">?</span>}
                {item.type === 'Subtask' && <span className="text-white text-[10px]">◇</span>}
              </div>
              <span className="text-[13px] font-medium text-blue-600 hover:underline cursor-pointer whitespace-nowrap">
                {item.key}
              </span>
              <span className="text-[13px] text-slate-700 truncate max-w-[400px]">
                {item.summary}
              </span>
            </div>
          </td>
          {/* Reporter */}
          <td className="px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-[10px] text-white font-medium">
                {item.reporter.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <span className="text-[13px] text-slate-700 truncate max-w-[140px]">
                {item.reporter}
              </span>
            </div>
          </td>
          {/* Assignee */}
          <td className="px-3 py-2">
            {item.assignee ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-medium">
                  {item.assignee.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <span className="text-[13px] text-slate-700">{item.assignee}</span>
              </div>
            ) : (
              <span className="text-[13px] text-slate-400">Unassigned</span>
            )}
          </td>
          {/* Created */}
          <td className="px-3 py-2">
            <span className="text-[13px] text-slate-700 whitespace-nowrap">{item.created}</span>
          </td>
          {/* Parent */}
          <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
            {item.parent ? (
              <button
                onClick={() => handleNavigateToParent(item.parent!, item.parentType || 'Feature')}
                className="text-[13px] text-blue-500 hover:underline flex items-center gap-1"
              >
                {item.parent}
                <ChevronRight className="h-3 w-3" />
              </button>
            ) : (
              <span className="text-[13px] text-slate-500">None</span>
            )}
          </td>
          {/* Actions */}
          <td className="px-2 py-2 w-8" onClick={(e) => e.stopPropagation()}>
            <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded">
              <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </button>
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

            {/* Detail Panel Toggle */}
            <Button 
              variant={detailModeEnabled ? "default" : "outline"} 
              size="icon" 
              className={cn(
                "h-8 w-8",
                detailModeEnabled 
                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                  : "border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
              onClick={() => {
                if (detailModeEnabled) {
                  setDetailModeEnabled(false);
                  setSelectedWorkItem(null);
                } else {
                  setDetailModeEnabled(true);
                  // Auto-select first item if none selected
                  if (!selectedWorkItem && mockItems.length > 0) {
                    setSelectedWorkItem(mockItems[0]);
                  }
                }
              }}
              title={detailModeEnabled ? "Close detail panel" : "Open detail panel"}
            >
              {detailModeEnabled ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>

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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden border-t border-slate-200">
        {/* Split View - Ticket List (when detail mode enabled) */}
        {detailModeEnabled && (
          <div className="w-[320px] flex-shrink-0 border-r border-slate-200 overflow-hidden">
            <AllWorkTicketList
              items={mockItems}
              selectedItemId={selectedWorkItem?.id || null}
              onSelectItem={(item) => setSelectedWorkItem(item)}
              onNavigateToParent={handleNavigateToParent}
            />
          </div>
        )}

        {/* Table or Detail Panel based on mode */}
        {detailModeEnabled && selectedWorkItem ? (
          /* Detail Panel */
          <div className="flex-1 overflow-hidden">
            <AllWorkDetailPanel
              item={selectedWorkItem}
              onClose={handleCloseDetail}
              onNavigateToParent={handleNavigateToParent}
            />
          </div>
        ) : (
          /* Regular Table View */
          <div className="flex-1 overflow-auto bg-white">
            <table className="min-w-full border-collapse">
              <thead className="bg-white sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="w-8 px-2 py-2">
                    <Checkbox />
                  </th>
                  <th className="w-6 px-1 py-2"></th>
                  <th className="px-2 py-2 text-left text-[11px] leading-[16px] font-medium text-slate-500">
                    Work
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] leading-[16px] font-medium text-slate-500">
                    Reporter
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] leading-[16px] font-medium text-slate-500">
                    Assignee
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] leading-[16px] font-medium text-slate-500">
                    <div className="flex items-center gap-1">
                      Created
                      <ChevronDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] leading-[16px] font-medium text-slate-500">
                    Parent
                  </th>
                  <th className="w-10 px-2 py-2">
                    {/* Column Configuration Popover */}
                    <Popover open={columnsOpen} onOpenChange={setColumnsOpen}>
                      <PopoverTrigger asChild>
                        <button className="p-1 hover:bg-slate-100 rounded">
                          <Columns className="h-4 w-4 text-slate-500" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0 bg-white border-slate-200 shadow-lg" align="end">
                        <div className="p-3 border-b border-slate-100">
                          <Tabs defaultValue="my-defaults" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 h-8">
                              <TabsTrigger value="my-defaults" className="text-[12px] data-[state=active]:text-blue-600">
                                My defaults
                                <RefreshCw className="h-3 w-3 ml-1" />
                              </TabsTrigger>
                              <TabsTrigger value="system" className="text-[12px]">System</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                        <div className="p-3 border-b border-slate-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="Search columns"
                              value={columnSearch}
                              onChange={(e) => setColumnSearch(e.target.value)}
                              className="pl-9 h-8 text-[13px] border-slate-200"
                            />
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-2">
                          {availableColumns
                            .filter(col => col.name.toLowerCase().includes(columnSearch.toLowerCase()))
                            .map((column) => (
                              <label key={column.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 cursor-pointer rounded">
                                <Checkbox
                                  checked={enabledColumns.has(column.id)}
                                  onCheckedChange={(checked) => {
                                    const newSet = new Set(enabledColumns);
                                    if (checked) newSet.add(column.id);
                                    else newSet.delete(column.id);
                                    setEnabledColumns(newSet);
                                  }}
                                />
                                <span className="text-[13px] text-slate-700">{column.name}</span>
                              </label>
                            ))}
                        </div>
                        <div className="p-3 border-t border-slate-100 flex justify-between items-center">
                          <button className="text-[12px] text-blue-600 hover:underline">Create a field</button>
                          <span className="text-[11px] text-slate-500">{enabledColumns.size} of {availableColumns.length}</span>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockItems.map((item) => renderRow(item))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 text-[13px] text-slate-600 bg-white">
        Showing {countItems(mockItems)} items
      </div>
    </div>
  );
}

export default AllWorkView;
