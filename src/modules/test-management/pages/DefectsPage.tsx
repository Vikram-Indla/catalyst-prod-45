/**
 * Defects Page
 * Full-featured defects management with table/board view, filters, and detail panel
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDistanceToNow, subDays, isAfter, parseISO } from 'date-fns';
import { 
  Bug, 
  Plus, 
  Search, 
  LayoutGrid,
  List,
  Flame,
  AlertTriangle,
  Info,
  Minus,
  Link2,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  Square,
  Calendar,
  Keyboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  useCreateDefect, 
  useUpdateDefect, 
  useDeleteDefect,
  useChangeDefectStatus,
  useBulkUpdateDefectStatus 
} from '../hooks/useDefects';
import { 
  DefectsMetricsBar, 
  DefectBoardView, 
  DefectDetailPanel, 
  CreateDefectModal 
} from '../components/defects';
import type { Defect, DefectSeverity, DefectStatus } from '../api/types';
import { toast } from 'sonner';

// Default project ID - in production this would come from context/route
const DEFAULT_PROJECT_ID = 'test-project-1';

// Mock team members
const MOCK_TEAM_MEMBERS = [
  { id: '1', full_name: 'Ahmed Al-Rashid' },
  { id: '2', full_name: 'Fatima Hassan' },
  { id: '3', full_name: 'Mohammed Khan' },
];

// Mock cycles
const MOCK_CYCLES = [
  { id: 'cy-1', name: 'Sprint 24 Regression' },
  { id: 'cy-2', name: 'Sprint 23 Regression' },
  { id: 'cy-3', name: 'Release 2.3 Smoke' },
];

// Date range options
const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
];

const SEVERITY_CONFIG: Record<DefectSeverity, { 
  label: string; 
  icon: React.ElementType;
  className: string;
}> = {
  critical: { label: 'Critical', icon: Flame, className: 'bg-danger text-white' },
  major: { label: 'Major', icon: AlertTriangle, className: 'bg-warning text-white' },
  minor: { label: 'Minor', icon: Info, className: 'bg-yellow-500 text-white' },
  trivial: { label: 'Trivial', icon: Minus, className: 'bg-muted text-muted-foreground' },
};

const STATUS_CONFIG: Record<DefectStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'border-danger text-danger' },
  in_progress: { label: 'In Progress', className: 'bg-info text-white border-info' },
  resolved: { label: 'Fixed', className: 'bg-purple-500 text-white border-purple-500' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
  wont_fix: { label: "Won't Fix", className: 'bg-muted text-muted-foreground' },
};

export function DefectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<DefectSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DefectStatus | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedDefectIndex, setFocusedDefectIndex] = useState<number>(-1);

  // Panels & Modals
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDefect, setEditingDefect] = useState<Defect | null>(null);
  const [deleteConfirmDefect, setDeleteConfirmDefect] = useState<Defect | null>(null);

  // Get project ID from search params
  const projectId = searchParams.get('projectId') || DEFAULT_PROJECT_ID;
  const highlightId = searchParams.get('highlight');

  // Fetch defects
  const { data: defectsData, isLoading, refetch } = useDefects({
    project_id: projectId,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    assigned_to: assigneeFilter !== 'all' && assigneeFilter !== 'unassigned' ? assigneeFilter : undefined,
    search: searchQuery || undefined,
  });

  // Mutations
  const createDefect = useCreateDefect();
  const updateDefect = useUpdateDefect();
  const deleteDefect = useDeleteDefect();
  const changeStatus = useChangeDefectStatus();
  const bulkUpdateStatus = useBulkUpdateDefectStatus();

  const defects = defectsData?.data || [];

  // Filter defects by date range (client-side)
  const filteredDefects = useMemo(() => {
    if (dateRangeFilter === 'all') return defects;
    
    const daysAgo = parseInt(dateRangeFilter, 10);
    const cutoffDate = subDays(new Date(), daysAgo);
    
    return defects.filter(d => {
      const createdAt = parseISO(d.created_at);
      return isAfter(createdAt, cutoffDate);
    });
  }, [defects, dateRangeFilter]);

  // Handle highlight from URL
  useEffect(() => {
    if (highlightId && filteredDefects.length > 0) {
      const defectToHighlight = filteredDefects.find(d => d.id === highlightId);
      if (defectToHighlight) {
        setSelectedDefect(defectToHighlight);
        // Clear highlight from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('highlight');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [highlightId, filteredDefects, searchParams, setSearchParams]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = filteredDefects.length;
    const open = filteredDefects.filter(d => d.status === 'open').length;
    const inProgress = filteredDefects.filter(d => d.status === 'in_progress').length;
    const fixed = filteredDefects.filter(d => d.status === 'resolved').length;
    const closed = filteredDefects.filter(d => d.status === 'closed').length;
    
    const severityCounts = {
      critical: filteredDefects.filter(d => d.severity === 'critical').length,
      major: filteredDefects.filter(d => d.severity === 'major').length,
      minor: filteredDefects.filter(d => d.severity === 'minor').length,
      trivial: filteredDefects.filter(d => d.severity === 'trivial').length,
    };

    return { total, open, inProgress, fixed, closed, severityCounts };
  }, [filteredDefects]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // N - New defect
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setCreateModalOpen(true);
        return;
      }
      
      // E - Edit selected
      if (e.key === 'e' && selectedDefect) {
        e.preventDefault();
        setEditingDefect(selectedDefect);
        setCreateModalOpen(true);
        return;
      }
      
      // Escape - Close panel/modal
      if (e.key === 'Escape') {
        if (createModalOpen) {
          setCreateModalOpen(false);
        } else if (selectedDefect) {
          setSelectedDefect(null);
        }
        return;
      }
      
      // Delete - Delete selected with confirm
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDefect && !deleteConfirmDefect) {
        e.preventDefault();
        setDeleteConfirmDefect(selectedDefect);
        return;
      }
      
      // 1-4 - Change severity of selected
      if (['1', '2', '3', '4'].includes(e.key) && selectedDefect) {
        const severities: DefectSeverity[] = ['critical', 'major', 'minor', 'trivial'];
        const newSeverity = severities[parseInt(e.key) - 1];
        toast.info(`Severity changed to ${newSeverity}`);
        // Would call update mutation here
        return;
      }
      
      // Arrow navigation in table
      if (viewMode === 'table' && filteredDefects.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedDefectIndex(prev => {
            const next = Math.min(prev + 1, filteredDefects.length - 1);
            setSelectedDefect(filteredDefects[next]);
            return next;
          });
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedDefectIndex(prev => {
            const next = Math.max(prev - 1, 0);
            setSelectedDefect(filteredDefects[next]);
            return next;
          });
        }
        if (e.key === 'Enter' && focusedDefectIndex >= 0) {
          setSelectedDefect(filteredDefects[focusedDefectIndex]);
        }
      }
      
      // ? - Show shortcuts help
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedDefect, createModalOpen, deleteConfirmDefect, viewMode, filteredDefects, focusedDefectIndex]);

  // Handlers
  const handleCreate = async (data: any) => {
    try {
      await createDefect.mutateAsync({
        ...data,
        project_id: projectId,
      });
      setCreateModalOpen(false);
      setEditingDefect(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingDefect) return;
    try {
      await updateDefect.mutateAsync({
        id: editingDefect.id,
        ...data,
      });
      setCreateModalOpen(false);
      setEditingDefect(null);
      // Update detail panel if viewing this defect
      if (selectedDefect?.id === editingDefect.id) {
        const updated = { ...selectedDefect, ...data };
        setSelectedDefect(updated);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmDefect) return;
    try {
      await deleteDefect.mutateAsync(deleteConfirmDefect.id);
      setDeleteConfirmDefect(null);
      if (selectedDefect?.id === deleteConfirmDefect.id) {
        setSelectedDefect(null);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleStatusChange = async (defectId: string, status: DefectStatus) => {
    changeStatus.mutate(defectId, status);
    // Update local state for immediate UI feedback
    if (selectedDefect?.id === defectId) {
      setSelectedDefect({ ...selectedDefect, status });
    }
  };

  const handleBulkStatusChange = async (status: DefectStatus) => {
    if (selectedIds.size === 0) return;
    try {
      await bulkUpdateStatus.mutateAsync({
        ids: Array.from(selectedIds),
        status,
      });
      setSelectedIds(new Set());
    } catch (error) {
      // Error handled by mutation
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDefects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDefects.map(d => d.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCloseModal = () => {
    setCreateModalOpen(false);
    setEditingDefect(null);
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };


  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col gap-4 transition-all duration-300",
        selectedDefect ? "mr-[450px]" : ""
      )}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Defects</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage defects found during testing
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Defect
          </Button>
        </div>

        {/* Metrics Bar */}
        <DefectsMetricsBar
          total={metrics.total}
          open={metrics.open}
          inProgress={metrics.inProgress}
          fixed={metrics.fixed}
          closed={metrics.closed}
          severityCounts={metrics.severityCounts}
        />

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search defects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select 
            value={severityFilter} 
            onValueChange={(v) => setSeverityFilter(v as DefectSeverity | 'all')}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="trivial">Trivial</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={statusFilter} 
            onValueChange={(v) => setStatusFilter(v as DefectStatus | 'all')}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Fixed</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="wont_fix">Won't Fix</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {MOCK_TEAM_MEMBERS.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cycleFilter} onValueChange={setCycleFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cycles</SelectItem>
              <SelectItem value="none">No Cycle</SelectItem>
              {MOCK_CYCLES.map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
            <SelectTrigger className="w-[130px]">
              <Calendar className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          
          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Select onValueChange={(v) => handleBulkStatusChange(v as DefectStatus)}>
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue placeholder="Change Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Fixed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && setViewMode(v as 'table' | 'board')}
          >
            <ToggleGroupItem value="table" aria-label="Table view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="board" aria-label="Board view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          
          {/* Keyboard shortcuts hint */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowShortcuts(true)}
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Keyboard shortcuts (?)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
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
              Create Defect
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === filteredDefects.length && filteredDefects.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-24">Key</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-24">Severity</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-32">Assignee</TableHead>
                  <TableHead className="w-24">Linked Case</TableHead>
                  <TableHead className="w-24">Created</TableHead>
                  <TableHead className="w-14"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDefects.map((defect, index) => {
                  const severityConfig = SEVERITY_CONFIG[defect.severity];
                  const statusConfig = STATUS_CONFIG[defect.status];
                  const SeverityIcon = severityConfig?.icon || Info;
                  const isSelected = selectedIds.has(defect.id);
                  const isFocused = focusedDefectIndex === index;

                  return (
                    <TableRow 
                      key={defect.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 group",
                        selectedDefect?.id === defect.id && "bg-primary/5",
                        isFocused && "ring-1 ring-inset ring-primary/50"
                      )}
                      onClick={() => {
                        setSelectedDefect(defect);
                        setFocusedDefectIndex(index);
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(defect.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm text-primary">
                        {defect.defect_key}
                      </TableCell>
                      <TableCell>
                        <span className="line-clamp-1">{defect.title}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('gap-1 text-xs', severityConfig?.className)}>
                          <SeverityIcon className="h-3 w-3" />
                          {severityConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', statusConfig?.className)}
                        >
                          {statusConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {defect.assigned_user ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={defect.assigned_user.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {getInitials(defect.assigned_user.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate max-w-[80px]">
                              {defect.assigned_user.full_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {defect.linked_run_id ? (
                          <Badge variant="outline" className="text-xs font-mono">
                            <Link2 className="h-3 w-3 mr-1" />
                            TC-xxx
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(defect.created_at), { addSuffix: false })}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingDefect(defect);
                              setCreateModalOpen(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {defect.external_tracker_url && (
                              <DropdownMenuItem onClick={() => window.open(defect.external_tracker_url!, '_blank')}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open in External Tracker
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteConfirmDefect(defect)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <DefectBoardView
            defects={filteredDefects}
            onDefectClick={setSelectedDefect}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* Keyboard Shortcuts Modal */}
      <AlertDialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">New defect</span>
              <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">N</kbd>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Edit selected</span>
              <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">E</kbd>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delete selected</span>
              <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">Delete</kbd>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Close panel/modal</span>
              <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">Esc</kbd>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Navigate up/down</span>
              <div className="flex gap-1">
                <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">↑</kbd>
                <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">↓</kbd>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Set severity 1-4</span>
              <div className="flex gap-1">
                <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">1</kbd>
                <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">2</kbd>
                <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">3</kbd>
                <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">4</kbd>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Panel */}
      {selectedDefect && (
        <div className="fixed top-0 right-0 h-full z-40">
          <DefectDetailPanel
            defect={selectedDefect}
            onClose={() => setSelectedDefect(null)}
            onEdit={() => {
              setEditingDefect(selectedDefect);
              setCreateModalOpen(true);
            }}
            onStatusChange={(status) => handleStatusChange(selectedDefect.id, status)}
            onAddComment={(comment) => {
              toast.info('Comments feature coming soon');
            }}
          />
        </div>
      )}

      {/* Create/Edit Modal */}
      <CreateDefectModal
        open={createModalOpen}
        onOpenChange={handleCloseModal}
        defect={editingDefect}
        teamMembers={MOCK_TEAM_MEMBERS}
        onSubmit={editingDefect ? handleUpdate : handleCreate}
        isLoading={createDefect.isPending || updateDefect.isPending}
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
              onClick={handleDelete}
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

export default DefectsPage;
