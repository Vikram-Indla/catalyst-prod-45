/**
 * DefectsTableView - Enterprise-grade defects table with column preferences
 * Uses Supabase hooks for data and persisted column preferences
 */

import React, { useState, useCallback, useMemo } from 'react';
import { formatDistanceToNow, format, differenceInHours } from 'date-fns';
import {
  Bug,
  Flame,
  AlertCircle,
  AlertTriangle,
  Info,
  Minus,
  Link2,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  Clock,
  User,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Eye,
  Copy,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { 
  DefectWithRelations, 
  DefectSeverity, 
  DefectPriority, 
  DefectWorkflowStatus 
} from '../../types/defects';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
  sortable: boolean;
  fixed?: boolean;
}

export interface DefectsTableViewProps {
  defects: DefectWithRelations[];
  isLoading?: boolean;
  selectedIds: Set<string>;
  activeDefectId?: string;
  columns: ColumnConfig[];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onRowClick: (defect: DefectWithRelations) => void;
  onEdit: (defect: DefectWithRelations) => void;
  onDelete: (defect: DefectWithRelations) => void;
  onSort: (column: string) => void;
  onColumnResize?: (columnId: string, width: number) => void;
  onColumnReorder?: (columns: ColumnConfig[]) => void;
}

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
    barColor: 'bg-destructive',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/20'
  },
  critical: { 
    label: 'Critical', 
    icon: AlertCircle, 
    barColor: 'bg-orange-500',
    badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20'
  },
  major: { 
    label: 'Major', 
    icon: AlertTriangle, 
    barColor: 'bg-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  },
  minor: { 
    label: 'Minor', 
    icon: Info, 
    barColor: 'bg-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  },
  trivial: { 
    label: 'Trivial', 
    icon: Minus, 
    barColor: 'bg-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground border-muted-foreground/20'
  },
};

const PRIORITY_CONFIG: Record<DefectPriority, { 
  label: string;
  badgeClass: string;
}> = {
  P1: { label: 'P1', badgeClass: 'bg-destructive/10 text-destructive border-destructive/20' },
  P2: { label: 'P2', badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  P3: { label: 'P3', badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  P4: { label: 'P4', badgeClass: 'bg-muted text-muted-foreground border-muted-foreground/20' },
  P5: { label: 'P5', badgeClass: 'bg-muted text-muted-foreground border-muted-foreground/20' },
};

const STATUS_CONFIG: Record<DefectWorkflowStatus, { label: string; badgeClass: string }> = {
  new: { label: 'New', badgeClass: 'bg-muted text-muted-foreground border-muted-foreground/20' },
  open: { label: 'Open', badgeClass: 'bg-destructive/10 text-destructive border-destructive/20' },
  in_progress: { label: 'In Progress', badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  in_review: { label: 'In Review', badgeClass: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  resolved: { label: 'Resolved', badgeClass: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
  closed: { label: 'Closed', badgeClass: 'bg-muted text-muted-foreground border-muted-foreground/20' },
  reopened: { label: 'Reopened', badgeClass: 'bg-destructive/10 text-destructive border-destructive/20' },
  deferred: { label: 'Deferred', badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  wont_fix: { label: "Won't Fix", badgeClass: 'bg-muted text-muted-foreground border-muted-foreground/20' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAgeIndicator(createdAt: string, status: DefectWorkflowStatus): { label: string; className: string } | null {
  if (['closed', 'verified', 'wont_fix', 'duplicate'].includes(status)) return null;
  
  const hours = differenceInHours(new Date(), new Date(createdAt));
  if (hours <= 24) {
    return { label: `${hours}h`, className: 'bg-muted text-muted-foreground' };
  } else if (hours <= 48) {
    return { label: '48h', className: 'bg-amber-500/10 text-amber-600' };
  } else if (hours <= 120) {
    return { label: `${Math.round(hours)}h`, className: 'bg-destructive/10 text-destructive' };
  } else {
    const days = Math.round(hours / 24);
    return { label: `${days}d`, className: 'bg-destructive/10 text-destructive' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DefectsTableView({
  defects,
  isLoading,
  selectedIds,
  activeDefectId,
  columns,
  sortColumn,
  sortDirection,
  onSelect,
  onSelectAll,
  onRowClick,
  onEdit,
  onDelete,
  onSort,
  onColumnResize,
  onColumnReorder,
}: DefectsTableViewProps) {
  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);
  const allSelected = defects.length > 0 && selectedIds.size === defects.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < defects.length;

  const renderSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3.5 w-3.5" /> 
      : <ChevronDown className="h-3.5 w-3.5" />;
  };

  const renderCell = (defect: DefectWithRelations, columnId: string) => {
    const severityConfig = SEVERITY_CONFIG[defect.severity] || SEVERITY_CONFIG.major;
    const priorityConfig = PRIORITY_CONFIG[defect.priority] || PRIORITY_CONFIG.P2;
    const statusConfig = STATUS_CONFIG[defect.workflow_status] || STATUS_CONFIG.open;
    const SeverityIcon = severityConfig.icon;

    switch (columnId) {
      case 'defect_key':
        return (
          <div className="flex items-center gap-2">
            <div className={cn("w-1 h-6 rounded-full flex-shrink-0", severityConfig.barColor)} />
            <span className="font-mono text-xs font-semibold text-primary">
              {defect.defect_key}
            </span>
          </div>
        );
      
      case 'title':
        return (
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{defect.title}</p>
            {defect.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {defect.description.slice(0, 80)}...
              </p>
            )}
          </div>
        );
      
      case 'severity':
        return (
          <Badge className={cn("text-[10px] font-semibold uppercase gap-1 border", severityConfig.badgeClass)}>
            <SeverityIcon className="h-3 w-3" />
            {severityConfig.label}
          </Badge>
        );
      
      case 'priority':
        return (
          <Badge className={cn("text-[10px] font-semibold uppercase border", priorityConfig.badgeClass)}>
            {priorityConfig.label}
          </Badge>
        );
      
      case 'status':
        return (
          <Badge className={cn("text-[10px] font-medium border", statusConfig.badgeClass)}>
            {statusConfig.label}
          </Badge>
        );
      
      case 'assignee':
        return defect.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={defect.assignee.avatar_url} />
              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                {getInitials(defect.assignee.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{defect.assignee.full_name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">Unassigned</span>
        );
      
      case 'reporter':
        return defect.reporter ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={defect.reporter.avatar_url} />
              <AvatarFallback className="text-[9px]">
                {getInitials(defect.reporter.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{defect.reporter.full_name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      
      case 'created_at':
        const ageInfo = getAgeIndicator(defect.created_at, defect.workflow_status);
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(defect.created_at), { addSuffix: true })}
            </span>
            {ageInfo && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", ageInfo.className)}>
                {ageInfo.label}
              </Badge>
            )}
          </div>
        );
      
      case 'updated_at':
        return (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(defect.updated_at), { addSuffix: true })}
          </span>
        );
      
      case 'due_date':
        return defect.due_date ? (
          <span className="text-sm">{format(new Date(defect.due_date), 'MMM d, yyyy')}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      
      case 'environment':
        return defect.environment ? (
          <Badge variant="secondary" className="text-[10px]">{defect.environment}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      
      case 'component':
        return defect.component ? (
          <Badge variant="outline" className="text-[10px]">{defect.component}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      
      default:
        return <span className="text-xs text-muted-foreground">—</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (defects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bug className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">No defects found</h3>
        <p className="text-muted-foreground">
          No defects match your current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                aria-label="Select all"
                className={cn(someSelected && "data-[state=checked]:bg-primary/50")}
              />
            </TableHead>
            {visibleColumns.map((column) => (
              <TableHead 
                key={column.id}
                style={{ width: column.width }}
                className={cn(
                  "text-xs font-medium",
                  column.sortable && "cursor-pointer select-none hover:bg-muted/80"
                )}
                onClick={() => column.sortable && onSort(column.id)}
              >
                <div className="flex items-center gap-1.5">
                  {column.label}
                  {column.sortable && renderSortIcon(column.id)}
                </div>
              </TableHead>
            ))}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {defects.map((defect) => (
            <TableRow
              key={defect.id}
              className={cn(
                "cursor-pointer transition-colors",
                selectedIds.has(defect.id) && "bg-primary/5",
                activeDefectId === defect.id && "bg-primary/10 border-l-2 border-l-primary"
              )}
              onClick={() => onRowClick(defect)}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(defect.id)}
                  onCheckedChange={() => onSelect(defect.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${defect.defect_key}`}
                />
              </TableCell>
              {visibleColumns.map((column) => (
                <TableCell key={column.id}>
                  {renderCell(defect, column.id)}
                </TableCell>
              ))}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onRowClick(defect)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(defect)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(defect.defect_key)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Key
                    </DropdownMenuItem>
                    {defect.external_url && (
                      <DropdownMenuItem asChild>
                        <a href={defect.external_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open External
                        </a>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(defect)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Default column configuration
export const DEFAULT_DEFECT_COLUMNS: ColumnConfig[] = [
  { id: 'defect_key', label: 'Key', width: 120, visible: true, sortable: true, fixed: true },
  { id: 'title', label: 'Title', width: 300, visible: true, sortable: true },
  { id: 'severity', label: 'Severity', width: 100, visible: true, sortable: true },
  { id: 'priority', label: 'Priority', width: 80, visible: true, sortable: true },
  { id: 'status', label: 'Status', width: 120, visible: true, sortable: true },
  { id: 'assignee', label: 'Assignee', width: 150, visible: true, sortable: true },
  { id: 'reporter', label: 'Reporter', width: 150, visible: false, sortable: true },
  { id: 'created_at', label: 'Created', width: 140, visible: true, sortable: true },
  { id: 'updated_at', label: 'Updated', width: 120, visible: false, sortable: true },
  { id: 'due_date', label: 'Due Date', width: 120, visible: false, sortable: true },
  { id: 'environment', label: 'Environment', width: 120, visible: false, sortable: true },
  { id: 'component', label: 'Component', width: 120, visible: false, sortable: true },
];
