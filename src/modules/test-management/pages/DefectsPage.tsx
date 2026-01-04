/**
 * Defects Page
 * Full-featured defects management with table/board view, filters, and detail panel
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
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
  Square
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

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Handle highlight from URL
  useEffect(() => {
    if (highlightId && defects.length > 0) {
      const defectToHighlight = defects.find(d => d.id === highlightId);
      if (defectToHighlight) {
        setSelectedDefect(defectToHighlight);
        // Clear highlight from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('highlight');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [highlightId, defects, searchParams, setSearchParams]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = defects.length;
    const open = defects.filter(d => d.status === 'open').length;
    const inProgress = defects.filter(d => d.status === 'in_progress').length;
    const fixed = defects.filter(d => d.status === 'resolved').length;
    const closed = defects.filter(d => d.status === 'closed').length;
    
    const severityCounts = {
      critical: defects.filter(d => d.severity === 'critical').length,
      major: defects.filter(d => d.severity === 'major').length,
      minor: defects.filter(d => d.severity === 'minor').length,
      trivial: defects.filter(d => d.severity === 'trivial').length,
    };

    return { total, open, inProgress, fixed, closed, severityCounts };
  }, [defects]);

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
    if (selectedIds.size === defects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(defects.map(d => d.id)));
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

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleCloseModal = () => {
    setCreateModalOpen(false);
    setEditingDefect(null);
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
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : defects.length === 0 ? (
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
                      checked={selectedIds.size === defects.length && defects.length > 0}
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
                {defects.map((defect) => {
                  const severityConfig = SEVERITY_CONFIG[defect.severity];
                  const statusConfig = STATUS_CONFIG[defect.status];
                  const SeverityIcon = severityConfig?.icon || Info;
                  const isSelected = selectedIds.has(defect.id);

                  return (
                    <TableRow 
                      key={defect.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 group",
                        selectedDefect?.id === defect.id && "bg-primary/5"
                      )}
                      onClick={() => setSelectedDefect(defect)}
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
            defects={defects}
            onDefectClick={setSelectedDefect}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

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
