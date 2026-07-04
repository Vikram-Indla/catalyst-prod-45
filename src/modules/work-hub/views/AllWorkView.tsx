import React, { useState, lazy, Suspense } from 'react';
import { Search, ChevronDown, ChevronRight, MoreHorizontal, Download, LayoutGrid, List, Zap, AlertCircle, CheckSquare, FileText, Columns, RefreshCw, PanelRightOpen, PanelRightClose, Plus } from '@/lib/atlaskit-icons';
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
import { CreateVersionDialog } from '../components/CreateVersionDialog';
const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));
import { useNavigate } from 'react-router-dom';
import { catalystToast } from '@/lib/catalystToast';
import { JiraTable, makeAssigneeCell, makeDateCell } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

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

// Empty array - data should come from database queries
const mockItems: WorkItem[] = [];

// Available columns for configuration
const availableColumns = [
  { id: 'work-type', name: 'Work type', enabled: true },
  { id: 'work-item-key', name: 'Work item key', enabled: true },
  { id: 'summary', name: 'Summary', enabled: true },
  { id: 'status', name: 'Status', enabled: true },
  { id: 'sprint-releases', name: 'Sprint/Iteration', enabled: true },
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
  { id: 'epic', name: 'Epic', icon: Zap, color: 'text-[var(--sem-warning)]' },
  { id: 'business-gap', name: 'Business Gap', icon: AlertCircle, color: 'text-[var(--ds-text-discovery)]' },
  { id: 'change-request', name: 'Change Request', icon: CheckSquare, color: 'text-[var(--sem-info)]' },
  { id: 'production-incident', name: 'Production Incident', icon: AlertCircle, color: 'text-[var(--sem-danger)]' },
  { id: 'backend', name: 'Backend', icon: FileText, color: 'text-muted-foreground' },
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
    todo: 'bg-muted text-muted-foreground border-border',
    in_progress: 'bg-[var(--sem-info-bg)] text-[var(--sem-info)] border-[var(--sem-info-border)]',
    done: 'bg-[var(--sem-success-bg)] text-[var(--sem-success)] border-[var(--sem-success-border)]',
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
    todo: 'bg-muted text-muted-foreground',
    in_progress: 'bg-[var(--sem-warning-bg)] text-[var(--sem-warning)]',
    done: 'bg-[var(--sem-success-bg)] text-[var(--sem-success)]',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-[10px] leading-[14px] font-semibold uppercase',
      categoryStyles[category] || 'bg-muted text-muted-foreground'
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
          ? 'bg-brand-primary border-brand-primary text-[var(--text-inverse)]' 
          : 'bg-card border-border text-foreground hover:bg-muted'
      )}
    >
      {label}
      <ChevronDown className="h-3.5 w-3.5" />
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
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
  
  // Create version dialog state
  const [createVersionOpen, setCreateVersionOpen] = useState(false);
  
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
    catalystToast.info(`Navigating to ${parentType}: ${parentKey}`);
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

  // Flatten the tree into a flat list of visible rows, respecting
  // showHierarchy / expandedItems — JiraTable renders a flat `data` array
  // and uses getRowDepth/getRowHasChildren/expandedRowIds for hierarchy.
  const flattenItems = (items: WorkItem[], level: number = 0): Array<{ item: WorkItem; level: number }> => {
    const rows: Array<{ item: WorkItem; level: number }> = [];
    for (const item of items) {
      rows.push({ item, level });
      const hasChildren = !!(item.children && item.children.length > 0);
      const isExpanded = expandedItems.has(item.id);
      if (showHierarchy && hasChildren && isExpanded) {
        rows.push(...flattenItems(item.children!, level + 1));
      }
    }
    return rows;
  };

  const visibleRows = flattenItems(mockItems);
  const rowDepthById = new Map(visibleRows.map(({ item, level }) => [item.id, level]));

  const allWorkColumns: Column<WorkItem>[] = [
    {
      id: 'work',
      label: 'Work',
      flex: true,
      alwaysVisible: true,
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <JiraIssueTypeIcon type={row.type} size={16} />
          <span
            style={{
              fontWeight: 500,
              color: 'var(--ds-link)',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {row.key}
          </span>
          <span
            style={{
              color: 'var(--ds-text-subtle)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={row.summary}
          >
            {row.summary}
          </span>
        </div>
      ),
    },
    {
      id: 'reporter',
      label: 'Reporter',
      width: 16,
      cell: makeAssigneeCell((row: WorkItem) => (row.reporter ? { name: row.reporter } : null)),
    },
    {
      id: 'assignee',
      label: 'Assignee',
      width: 16,
      cell: makeAssigneeCell((row: WorkItem) => (row.assignee ? { name: row.assignee } : null)),
    },
    {
      id: 'created',
      label: 'Created',
      width: 14,
      sortable: true,
      cell: makeDateCell((row: WorkItem) => row.created || null),
    },
    {
      id: 'parent',
      label: 'Parent',
      width: 16,
      cell: ({ row }) => {
        if (!row.parent) {
          return <span style={{ color: 'var(--ds-text-subtlest)' }}>None</span>;
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNavigateToParent(row.parent!, row.parentType || 'Feature');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              border: 'none',
              background: 'transparent',
              color: 'var(--ds-link)',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            {row.parent}
            <ChevronRight className="h-3 w-3" />
          </button>
        );
      },
    },
  ];

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Filter Toolbar */}
      <div className="px-4 py-3 bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))]">
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
              <PopoverContent className="w-72 p-0 bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))] shadow-lg" align="start">
                <div className="p-3 border-b border-slate-100 dark:border-[var(--ds-border,var(--cp-ink-1))]">
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
                      <label key={assignee.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay)] cursor-pointer">
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
                        <span className="text-[14px] text-slate-900 dark:text-[var(--ds-text,var(--cp-bg-neutral))]">{assignee.name}</span>
                      </label>
                    ))}
                </div>
                <div className="p-3 border-t border-slate-100 dark:border-[var(--ds-border,var(--cp-ink-1))]">
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
              <PopoverContent className="w-72 p-0 bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))] shadow-lg" align="start">
                <div className="p-3 border-b border-slate-100 dark:border-[var(--ds-border,var(--cp-ink-1))]">
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
                        <label key={type.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay)] cursor-pointer">
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
                          <span className="text-[14px] text-slate-900 dark:text-[var(--ds-text,var(--cp-bg-neutral))]">{type.name}</span>
                        </label>
                      );
                    })}
                </div>
                <div className="p-3 border-t border-slate-100 dark:border-[var(--ds-border,var(--cp-ink-1))]">
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
              <PopoverContent className="w-72 p-0 bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))] shadow-lg" align="start">
                <div className="p-3 border-b border-slate-100 dark:border-[var(--ds-border,var(--cp-ink-1))]">
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
                      <label key={status.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay)] cursor-pointer">
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
                <div className="p-3 border-t border-slate-100 dark:border-[var(--ds-border,var(--cp-ink-1))] flex justify-between">
                  <button className="text-[13px] text-blue-600 hover:underline">Show full list</button>
                  <span className="text-[12px] text-slate-500">{mockStatuses.length} of 32</span>
                </div>
              </PopoverContent>
            </Popover>

            <button className="text-[13px] text-slate-600 dark:text-[var(--ds-text-subtlest)] hover:text-slate-900 dark:hover:text-[var(--ds-text,var(--cp-bg-neutral))] px-2 flex items-center gap-1">
              More filters
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Create Version Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-3 text-[13px] gap-1 border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))] text-slate-700 dark:text-[var(--ds-text-subtlest)] hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay)]"
              onClick={() => setCreateVersionOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Create version
            </Button>

            {/* Group */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3 text-[13px] gap-1 border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))] text-slate-700 dark:text-[var(--ds-text-subtlest)] hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay)]">
                  Group
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))]">
                <DropdownMenuItem className="text-[14px]">None</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">Status</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">Assignee</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">Priority</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 dark:text-[var(--ds-text-subtlest)] hover:bg-slate-100 dark:hover:bg-[var(--ds-surface-overlay)]">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))]">
                <DropdownMenuItem className="text-[14px]">Print list</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">Print details</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-[14px]">Export CSV (all fields)</DropdownMenuItem>
                <DropdownMenuItem className="text-[14px]">Export Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Toggle Icons */}
            <div className="flex items-center border border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))] rounded-md overflow-hidden">
              <button className="h-8 w-8 flex items-center justify-center text-slate-400 dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary))] hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay)]">
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
                  : "border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))] text-slate-600 dark:text-[var(--ds-text-subtlest)] hover:bg-slate-100 dark:hover:bg-[var(--ds-surface-overlay)]"
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 dark:text-[var(--ds-text-subtlest)] hover:bg-slate-100 dark:hover:bg-[var(--ds-surface-overlay)]">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))]">
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
      <div className="flex-1 flex overflow-hidden border-t border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))]">
        {/* Split View - Ticket List (when detail mode enabled) */}
        {detailModeEnabled && (
          <div className="w-[320px] flex-shrink-0 border-r border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))] overflow-hidden">
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
          /* Detail Modal — unified StoryDetailModal */
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={null}>
              <CatalystDetailRouter
                isOpen={true}
                onClose={handleCloseDetail}
                itemId={selectedWorkItem.id}
                projectId=""
                panelMode={true}
              />
            </Suspense>
          </div>
        ) : (
          /* Regular Table View */
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))]">
            {/* Column Configuration Popover — sits above the table (JiraTable owns its own header row) */}
            <div className="flex items-center justify-end px-2 py-1 border-b border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))]">
              <Popover open={columnsOpen} onOpenChange={setColumnsOpen}>
                <PopoverTrigger asChild>
                  <button className="p-1 hover:bg-slate-100 dark:hover:bg-[var(--ds-surface-overlay)] rounded">
                    <Columns className="h-4 w-4 text-slate-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0 bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))] shadow-lg" align="end">
                  <div className="p-3 border-b border-slate-100 dark:border-[var(--ds-border,var(--cp-ink-1))]">
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
                  <div className="p-3 border-b border-slate-100 dark:border-[var(--ds-border,var(--cp-ink-1))]">
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
                        <label key={column.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay)] cursor-pointer rounded">
                          <Checkbox
                            checked={enabledColumns.has(column.id)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(enabledColumns);
                              if (checked) newSet.add(column.id);
                              else newSet.delete(column.id);
                              setEnabledColumns(newSet);
                            }}
                          />
                          <span className="text-[13px] text-slate-700 dark:text-[var(--ds-text-subtlest)]">{column.name}</span>
                        </label>
                      ))}
                  </div>
                  <div className="p-3 border-t border-slate-100 dark:border-[var(--ds-border,var(--cp-ink-1))] flex justify-between items-center">
                    <button className="text-[12px] text-blue-600 hover:underline">Create a field</button>
                    <span className="text-[11px] text-slate-500">{enabledColumns.size} of {availableColumns.length}</span>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 overflow-auto">
              <JiraTable<WorkItem>
                columns={allWorkColumns}
                data={visibleRows.map(({ item }) => item)}
                getRowId={(row) => row.id}
                getRowDepth={(row) => rowDepthById.get(row.id) ?? 0}
                getRowHasChildren={(row) => !!(row.children && row.children.length > 0)}
                expandedRowIds={expandedItems}
                onToggleRowExpanded={(rowId) => toggleExpand(rowId)}
                onRowClick={(row) => handleRowClick(row)}
                selectable
                selection={selectedItems}
                onSelectionChange={setSelectedItems}
                showRowCount={false}
                density="compact"
                ariaLabel="All work"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 text-[13px] text-slate-600 dark:text-[var(--ds-text-subtlest)] bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))]">
        Showing {countItems(mockItems)} items
      </div>

      {/* Create Version Dialog */}
      <CreateVersionDialog
        open={createVersionOpen}
        onOpenChange={setCreateVersionOpen}
        onSave={(data) => {
          console.log('Version created:', data);
        }}
      />
    </div>
  );
}

export default AllWorkView;
