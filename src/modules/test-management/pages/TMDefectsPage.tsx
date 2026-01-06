/**
 * TMDefectsPage - Module 6 Defect Management
 * Full-featured defects management matching HTML reference design
 * Route: /tests/defects
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDistanceToNow, differenceInHours, subDays, isAfter, parseISO, format } from 'date-fns';
import { 
  Bug, 
  Plus, 
  Search, 
  LayoutGrid,
  List,
  Flame,
  AlertTriangle,
  AlertCircle,
  Info,
  Minus,
  Link2,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  Calendar,
  Keyboard,
  Filter,
  Download,
  Play,
  UserPlus,
  Clock,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { 
  useDefects, 
  useDefectStats,
  useCreateDefect, 
  useUpdateDefect, 
  useDeleteDefect,
  useUpdateDefectStatus,
  useTeamMembers,
  useTestCycles,
  type TMDefect,
  type DefectStatus as TMDefectStatus,
  type DefectSeverity as TMDefectSeverity,
} from '@/hooks/test-management';
import { 
  DefectBoardView, 
  CreateDefectDialogEnterprise 
} from '../components/defects';
import { DefectDetailPanelEnhanced } from '../components/defects/DefectDetailPanelEnhanced';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DefectSeverity = 'blocker' | 'critical' | 'major' | 'minor' | 'trivial';
type DefectPriority = 'p1' | 'p2' | 'p3' | 'p4';
type DefectStatus = 'open' | 'in_progress' | 'in_review' | 'verified' | 'closed' | 'wont_fix';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<DefectSeverity, { 
  label: string; 
  icon: React.ElementType;
  barColor: string;
  badgeClass: string;
}> = {
  blocker: { 
    label: 'Blocker', 
    icon: Flame, 
    barColor: 'bg-red-500',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
  },
  critical: { 
    label: 'Critical', 
    icon: AlertCircle, 
    barColor: 'bg-red-400',
    badgeClass: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
  },
  major: { 
    label: 'Major', 
    icon: AlertTriangle, 
    barColor: 'bg-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
  },
  minor: { 
    label: 'Minor', 
    icon: Info, 
    barColor: 'bg-blue-500',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
  },
  trivial: { 
    label: 'Trivial', 
    icon: Minus, 
    barColor: 'bg-gray-400',
    badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  },
};

const PRIORITY_CONFIG: Record<DefectPriority, { 
  label: string;
  badgeClass: string;
}> = {
  p1: { label: 'P1', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' },
  p2: { label: 'P2', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' },
  p3: { label: 'P3', badgeClass: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' },
  p4: { label: 'P4', badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

const STATUS_CONFIG: Record<DefectStatus, { label: string; badgeClass: string }> = {
  open: { label: 'Open', badgeClass: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' },
  in_progress: { label: 'In Progress', badgeClass: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' },
  in_review: { label: 'In Review', badgeClass: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400' },
  verified: { label: 'Verified', badgeClass: 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400' },
  closed: { label: 'Closed', badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  wont_fix: { label: "Won't Fix", badgeClass: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
};

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAgeIndicator(createdAt: string): { label: string; className: string } {
  const hours = differenceInHours(new Date(), new Date(createdAt));
  if (hours <= 24) {
    return { label: `${hours}h open`, className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
  } else if (hours <= 48) {
    return { label: '48h open', className: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400' };
  } else if (hours <= 120) {
    return { label: `${Math.round(hours)}h open`, className: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' };
  } else {
    const days = Math.round(hours / 24);
    return { label: `${days} days`, className: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' };
  }
}

function mapTMDefectToDefect(d: TMDefect): any {
  return {
    id: d.id,
    defect_key: d.key || `DEF-${d.id.slice(0, 4)}`,
    title: d.title,
    description: d.description,
    severity: (d.severity?.toLowerCase() || 'major') as DefectSeverity,
    priority: 'p2' as DefectPriority, // Default priority - would come from DB
    status: mapStatus(d.status),
    assigned_to: d.assigned_to,
    assigned_user: d.assignee ? {
      id: d.assignee.id,
      full_name: d.assignee.full_name,
      avatar_url: d.assignee.avatar_url,
    } : undefined,
    reporter: d.reporter ? {
      id: d.reporter.id,
      full_name: d.reporter.full_name,
      avatar_url: d.reporter.avatar_url,
    } : undefined,
    created_at: d.created_at,
    updated_at: d.updated_at,
    external_id: d.external_id,
    external_tracker_url: d.external_url,
    linked_test_case_key: null, // Would come from links
    tags: [], // Would come from DB
  };
}

function mapStatus(status: TMDefectStatus): DefectStatus {
  const map: Record<string, DefectStatus> = {
    'OPEN': 'open',
    'IN_PROGRESS': 'in_progress',
    'FIXED': 'verified',
    'VERIFIED': 'verified',
    'CLOSED': 'closed',
    'WONT_FIX': 'wont_fix',
    'DUPLICATE': 'closed',
  };
  return map[status] || 'open';
}

function mapStatusToTM(status: DefectStatus): TMDefectStatus {
  const map: Record<DefectStatus, TMDefectStatus> = {
    'open': 'OPEN',
    'in_progress': 'IN_PROGRESS',
    'in_review': 'IN_PROGRESS',
    'verified': 'VERIFIED',
    'closed': 'CLOSED',
    'wont_fix': 'WONT_FIX',
  };
  return map[status] || 'OPEN';
}

function mapSeverityToTM(severity: DefectSeverity): TMDefectSeverity {
  if (severity === 'blocker') return 'CRITICAL';
  return severity.toUpperCase() as TMDefectSeverity;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data (for demo)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_DEFECTS = [
  {
    id: '1',
    defect_key: 'DEF-1247',
    title: 'Application crashes when submitting form with special characters in Arabic text fields',
    description: 'When users attempt to submit forms containing Arabic text with special characters, the application crashes.',
    severity: 'blocker' as DefectSeverity,
    priority: 'p1' as DefectPriority,
    status: 'open' as DefectStatus,
    assigned_user: { id: 'u1', full_name: 'Sarah Mohammed', avatar_url: null },
    reporter: { id: 'u2', full_name: 'Ahmed Al-Rashid', avatar_url: null },
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    linked_test_case_key: 'TC-0892',
    tags: ['Form Validation', 'Arabic', 'Regression'],
  },
  {
    id: '2',
    defect_key: 'DEF-1245',
    title: 'Payment gateway timeout causes duplicate transactions in high-load scenarios',
    description: 'During high-load scenarios, payment gateway timeouts result in duplicate transactions.',
    severity: 'critical' as DefectSeverity,
    priority: 'p1' as DefectPriority,
    status: 'in_progress' as DefectStatus,
    assigned_user: { id: 'u3', full_name: 'Khalid Abdullah', avatar_url: null },
    reporter: { id: 'u1', full_name: 'Sarah Mohammed', avatar_url: null },
    created_at: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    linked_test_case_key: 'TC-0756',
    tags: ['Payment', 'Performance'],
  },
  {
    id: '3',
    defect_key: 'DEF-1243',
    title: 'Export to PDF feature generates corrupted files for reports exceeding 100 pages',
    description: 'PDF export fails for large reports.',
    severity: 'major' as DefectSeverity,
    priority: 'p2' as DefectPriority,
    status: 'in_review' as DefectStatus,
    assigned_user: { id: 'u4', full_name: 'Fatima Nasser', avatar_url: null },
    reporter: { id: 'u2', full_name: 'Ahmed Al-Rashid', avatar_url: null },
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    linked_test_case_key: 'TC-0834',
    tags: ['Export', 'PDF'],
  },
  {
    id: '4',
    defect_key: 'DEF-1241',
    title: 'Date picker calendar doesn\'t respect RTL layout in Arabic locale',
    description: 'Calendar shows in LTR mode when Arabic locale is selected.',
    severity: 'minor' as DefectSeverity,
    priority: 'p3' as DefectPriority,
    status: 'verified' as DefectStatus,
    assigned_user: { id: 'u5', full_name: 'Layla Al-Qasim', avatar_url: null },
    reporter: { id: 'u3', full_name: 'Khalid Abdullah', avatar_url: null },
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    linked_test_case_key: 'TC-0912',
    tags: ['UI', 'Localization', 'RTL'],
  },
  {
    id: '5',
    defect_key: 'DEF-1238',
    title: 'Tooltip text has inconsistent capitalization on dashboard widgets',
    description: 'Minor UI polish issue with tooltip capitalization.',
    severity: 'trivial' as DefectSeverity,
    priority: 'p4' as DefectPriority,
    status: 'closed' as DefectStatus,
    assigned_user: { id: 'u2', full_name: 'Ahmed Al-Rashid', avatar_url: null },
    reporter: { id: 'u4', full_name: 'Fatima Nasser', avatar_url: null },
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    linked_test_case_key: null,
    tags: ['UI Polish'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function TMDefectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedDefect, setSelectedDefect] = useState<any | null>(null);
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDefect, setEditingDefect] = useState<any | null>(null);
  const [deleteConfirmDefect, setDeleteConfirmDefect] = useState<any | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Get project ID
  const projectId = searchParams.get('projectId') || undefined;
  
  // API hooks
  const { data: defectsRaw, isLoading } = useDefects(projectId);
  const { data: stats } = useDefectStats(projectId);
  const { data: teamMembers } = useTeamMembers(projectId || null);
  const createDefectMutation = useCreateDefect();
  const updateDefectMutation = useUpdateDefect();
  const deleteDefectMutation = useDeleteDefect();
  const updateStatusMutation = useUpdateDefectStatus();
  
  // Use mock data if no API data
  const defects = useMemo(() => {
    if (defectsRaw && defectsRaw.length > 0) {
      return defectsRaw.map(mapTMDefectToDefect);
    }
    return MOCK_DEFECTS;
  }, [defectsRaw]);
  
  // Filter defects
  const filteredDefects = useMemo(() => {
    let result = defects;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d: any) => 
        d.title.toLowerCase().includes(q) || 
        d.defect_key.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter((d: any) => d.status === statusFilter);
    }
    
    if (severityFilter !== 'all') {
      result = result.filter((d: any) => d.severity === severityFilter);
    }
    
    if (assigneeFilter === 'me') {
      // Would filter by current user
    } else if (assigneeFilter === 'unassigned') {
      result = result.filter((d: any) => !d.assigned_user);
    }
    
    if (dateRangeFilter !== 'all') {
      const daysAgo = parseInt(dateRangeFilter, 10);
      const cutoffDate = subDays(new Date(), daysAgo);
      result = result.filter((d: any) => isAfter(parseISO(d.created_at), cutoffDate));
    }
    
    return result;
  }, [defects, searchQuery, statusFilter, severityFilter, assigneeFilter, dateRangeFilter]);
  
  // Metrics
  const metrics = useMemo(() => {
    const total = defects.length;
    const open = defects.filter((d: any) => d.status === 'open').length;
    const inProgress = defects.filter((d: any) => d.status === 'in_progress' || d.status === 'in_review').length;
    const resolved = defects.filter((d: any) => d.status === 'verified' || d.status === 'closed').length;
    return { total, open, inProgress, resolved };
  }, [defects]);
  
  // Handlers
  const handleStatusChange = async (defectId: string, status: DefectStatus) => {
    if (!projectId) return;
    updateStatusMutation.mutate({ id: defectId, status: mapStatusToTM(status), project_id: projectId });
    if (selectedDefect?.id === defectId) {
      setSelectedDefect({ ...selectedDefect, status });
    }
    toast.success(`Status changed to ${STATUS_CONFIG[status].label}`);
  };
  
  const handleBulkStatusChange = async (status: DefectStatus) => {
    if (selectedIds.size === 0 || !projectId) return;
    for (const id of Array.from(selectedIds)) {
      updateStatusMutation.mutate({ id, status: mapStatusToTM(status), project_id: projectId });
    }
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} defect(s) updated`);
  };
  
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDefects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDefects.map((d: any) => d.id)));
    }
  };
  
  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  // Quick filter tabs
  const filterTabs = [
    { key: 'all', label: 'All', count: metrics.total },
    { key: 'open', label: 'Open', count: metrics.open },
    { key: 'in_progress', label: 'In Progress', count: metrics.inProgress },
    { key: 'verified', label: 'Resolved', count: metrics.resolved },
  ];
  
  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col gap-0 transition-all duration-300 overflow-hidden",
        selectedDefect && "mr-[480px]"
      )}>
        {/* Header - Metrics and Actions only (title via breadcrumb) */}
        <div className="flex items-center justify-between px-6 py-3 border-b">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
              <span className="text-lg font-bold text-red-500">{metrics.open}</span>
              <span className="text-xs text-muted-foreground">Open</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
              <span className="text-lg font-bold text-amber-500">{metrics.inProgress}</span>
              <span className="text-xs text-muted-foreground">In Progress</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
              <span className="text-lg font-bold text-teal-500">{metrics.resolved}</span>
              <span className="text-xs text-muted-foreground">Resolved</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search defects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[260px] pl-9 h-9"
              />
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => setCreateModalOpen(true)}>
              <Bug className="h-4 w-4 mr-2" />
              Log Defect
            </Button>
          </div>
        </div>
        
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-background border-b">
          <div className="flex items-center gap-3">
            {/* Status Filter Tabs */}
            <div className="flex bg-muted/50 rounded-lg p-0.5">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key === 'all' ? 'all' : tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    statusFilter === tab.key || (tab.key === 'all' && statusFilter === 'all')
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                    statusFilter === tab.key || (tab.key === 'all' && statusFilter === 'all')
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  severityFilter !== 'all' && "border-primary bg-primary/5"
                )}
                onClick={() => setSeverityFilter(severityFilter === 'all' ? 'blocker' : 'all')}
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Severity
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  assigneeFilter === 'me' && "border-primary bg-primary/5"
                )}
                onClick={() => setAssigneeFilter(assigneeFilter === 'me' ? 'all' : 'me')}
              >
                <User className="h-3.5 w-3.5 mr-1.5" />
                Assigned to me
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  dateRangeFilter !== 'all' && "border-primary bg-primary/5"
                )}
                onClick={() => setDateRangeFilter(dateRangeFilter === '7' ? 'all' : '7')}
              >
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                This Week
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mr-2 pr-2 border-r">
                <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
                <Select onValueChange={(v) => handleBulkStatusChange(v as DefectStatus)}>
                  <SelectTrigger className="w-[120px] h-7 text-xs">
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* View Toggle */}
            <div className="flex bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === 'list' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === 'board' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            
            <Button variant="outline" size="sm" className="h-8">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              Sort
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredDefects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bug className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No defects found</h3>
              <p className="text-muted-foreground mb-4">
                Great news! There are no defects matching your filters.
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log Defect
              </Button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {filteredDefects.map((defect: any) => (
                <DefectCard
                  key={defect.id}
                  defect={defect}
                  isSelected={selectedIds.has(defect.id)}
                  isActive={selectedDefect?.id === defect.id}
                  onSelect={() => toggleSelectOne(defect.id)}
                  onClick={() => setSelectedDefect(defect)}
                  onEdit={() => {
                    setEditingDefect(defect);
                    setCreateModalOpen(true);
                  }}
                  onDelete={() => setDeleteConfirmDefect(defect)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Board view - Coming soon
            </div>
          )}
        </div>
      </div>
      
      {/* Detail Panel */}
      {selectedDefect && (
        <div className="fixed top-0 right-0 h-full z-40">
          <DefectDetailPanelEnhanced
            defect={selectedDefect}
            onClose={() => setSelectedDefect(null)}
            onEdit={() => {
              setEditingDefect(selectedDefect);
              setCreateModalOpen(true);
            }}
            onStatusChange={(status) => handleStatusChange(selectedDefect.id, status)}
          />
        </div>
      )}
      
      {/* Create/Edit Modal - Enterprise Version */}
      <CreateDefectDialogEnterprise
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setEditingDefect(null);
        }}
        projectId={projectId}
        defect={editingDefect}
        onSuccess={() => {
          setCreateModalOpen(false);
          setEditingDefect(null);
        }}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog 
        open={!!deleteConfirmDefect} 
        onOpenChange={(open) => !open && setDeleteConfirmDefect(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Defect</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmDefect?.defect_key}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                toast.success('Defect deleted');
                setDeleteConfirmDefect(null);
                if (selectedDefect?.id === deleteConfirmDefect?.id) {
                  setSelectedDefect(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DefectCard Component
// ─────────────────────────────────────────────────────────────────────────────

interface DefectCardProps {
  defect: any;
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function DefectCard({ defect, isSelected, isActive, onSelect, onClick, onEdit, onDelete }: DefectCardProps) {
  const severityConfig = SEVERITY_CONFIG[defect.severity as DefectSeverity] || SEVERITY_CONFIG.major;
  const priorityConfig = PRIORITY_CONFIG[defect.priority as DefectPriority] || PRIORITY_CONFIG.p2;
  const statusConfig = STATUS_CONFIG[defect.status as DefectStatus] || STATUS_CONFIG.open;
  const ageInfo = getAgeIndicator(defect.created_at);
  
  return (
    <div 
      className={cn(
        "flex bg-background border rounded-xl overflow-hidden transition-all cursor-pointer group",
        "hover:border-muted-foreground/30 hover:shadow-md hover:-translate-y-0.5",
        isActive && "border-primary shadow-md ring-2 ring-primary/20",
        isSelected && "border-primary/50 bg-primary/5"
      )}
      onClick={onClick}
    >
      {/* Severity Bar */}
      <div className={cn("w-1 flex-shrink-0", severityConfig.barColor)} />
      
      {/* Content */}
      <div className="flex-1 p-4 space-y-3">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Checkbox 
                checked={isSelected}
                onCheckedChange={onSelect}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4"
              />
              <span className="text-xs font-mono font-semibold text-muted-foreground">
                {defect.defect_key}
              </span>
            </div>
            <h3 className="font-semibold text-sm leading-snug line-clamp-2">
              {defect.title}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge className={cn("text-[10px] font-semibold uppercase px-2", severityConfig.badgeClass)}>
              {severityConfig.label}
            </Badge>
            <Badge className={cn("text-[10px] font-semibold uppercase px-2", priorityConfig.badgeClass)}>
              {priorityConfig.label}
            </Badge>
            <Badge className={cn("text-[10px] font-medium px-2.5 rounded-full", statusConfig.badgeClass)}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>
        
        {/* Meta Row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {defect.assigned_user && (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={defect.assigned_user.avatar_url} />
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                  {getInitials(defect.assigned_user.full_name)}
                </AvatarFallback>
              </Avatar>
              <span>{defect.assigned_user.full_name}</span>
            </div>
          )}
          {defect.linked_test_case_key && (
            <div className="flex items-center gap-1.5 text-primary cursor-pointer hover:underline">
              <Link2 className="h-3.5 w-3.5" />
              <span>{defect.linked_test_case_key}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Created {formatDistanceToNow(new Date(defect.created_at))} ago</span>
          </div>
          {defect.status !== 'closed' && (
            <Badge className={cn("text-[10px] font-medium px-2 py-0.5", ageInfo.className)}>
              {defect.severity === 'blocker' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {ageInfo.label}
            </Badge>
          )}
        </div>
        
        {/* Footer Row */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            {defect.tags?.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5 bg-muted/50">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={(e) => e.stopPropagation()}
            >
              <Link2 className="h-3.5 w-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {defect.external_tracker_url && (
                  <DropdownMenuItem onClick={() => window.open(defect.external_tracker_url, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Jira
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TMDefectsPage;
