/**
 * CycleCardEnhanced - Cycle card matching the screenshot design
 * Shows: key, environment badge, menu, title, release link, progress, stats, assignee, date
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MoreHorizontal, Eye, Play, Pencil, Copy, Trash2, Archive,
  Package, FileText, CheckCircle, XCircle, Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
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
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { CycleWithDetails } from '@/hooks/test-management/useTestCyclesEnhanced';

interface CycleCardEnhancedProps {
  cycle: CycleWithDetails;
  onEdit?: (cycle: CycleWithDetails) => void;
  onDuplicate?: (cycle: CycleWithDetails) => void;
  onDelete?: (cycleId: string) => void;
  onArchive?: (cycleId: string) => void;
}

const envAppearance = (env: string | null | undefined): LozengeAppearance => {
  switch (env) {
    case 'production':
    case 'prod':
      return 'removed';
    case 'staging':
      return 'moved';
    case 'dev':
    case 'qa':
    case 'uat':
      return 'inprogress';
    default:
      return 'default';
  }
};

const avatarColors = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-blue-100 text-blue-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
];

function getInitials(name: string | null | undefined): string {
  if (!name) return 'UA';
  return name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string | null | undefined): string {
  if (!name) return 'bg-gray-100 text-gray-500';
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '-';
  }
}

export function CycleCardEnhanced({ 
  cycle, 
  onEdit, 
  onDuplicate, 
  onDelete,
  onArchive 
}: CycleCardEnhancedProps) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const handleCardClick = () => {
    navigate(`/testhub/cycles/${cycle.id}`);
  };

  const handleAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    switch (action) {
      case 'view':
        navigate(`/testhub/cycles/${cycle.id}`);
        break;
      case 'execute':
        navigate(`/testhub/cycles/${cycle.id}/execute`);
        break;
      case 'edit':
        onEdit?.(cycle);
        break;
      case 'duplicate':
        onDuplicate?.(cycle);
        break;
      case 'archive':
        onArchive?.(cycle.id);
        break;
      case 'delete':
        setShowDeleteConfirm(true);
        break;
    }
  };

  const handleConfirmDelete = () => {
    onDelete?.(cycle.id);
    setShowDeleteConfirm(false);
  };

  // Calculate progress
  const executed = cycle.passed_count + cycle.failed_count + cycle.blocked_count;
  const progress = cycle.total_cases > 0 ? Math.round((executed / cycle.total_cases) * 100) : 0;

  // Duration display
  const duration = cycle.actual_start && cycle.actual_end
    ? calculateDuration(cycle.actual_start, cycle.actual_end)
    : '-';

  const assigneeName = cycle.assignee?.full_name || null;
  const initials = getInitials(assigneeName);
  const avatarColor = getAvatarColor(assigneeName);

  return (
    <>
      <div 
        className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Header Row: Key + Environment Badge + Menu */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-primary hover:underline">
              {cycle.key}
            </span>
            <Lozenge appearance={envAppearance(cycle.environment)}>
              {cycle.environment}
            </Lozenge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white">
              <DropdownMenuItem onClick={(e) => handleAction(e, 'view')}>
                <Eye className="w-4 h-4 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleAction(e, 'execute')}>
                <Play className="w-4 h-4 mr-2" /> Start Execution
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleAction(e, 'edit')}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleAction(e, 'duplicate')}>
                <Copy className="w-4 h-4 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => handleAction(e, 'archive')}>
                <Archive className="w-4 h-4 mr-2" /> Archive
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={(e) => handleAction(e, 'delete')}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-base mb-2 line-clamp-2">
          {cycle.name}
        </h3>
        
        {/* Release Link */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Package className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            {cycle.release?.name || 'No release linked'}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium text-gray-900">{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${progress}%`,
                backgroundColor: progress === 100 ? '#10b981' : '#3b82f6'
              }}
            />
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm mb-4">
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{cycle.total_cases} tests</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-gray-600">{cycle.passed_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-gray-600">{cycle.failed_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{duration}</span>
          </div>
        </div>
        
        {/* Footer: Assignee + Date */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
              avatarColor
            )}>
              {initials}
            </div>
            <span className="text-sm text-gray-600">
              {assigneeName || 'Unassigned'}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {formatDate(cycle.planned_start || cycle.created_at)}
          </span>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{cycle.name}" and all associated data. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function calculateDuration(start: string, end: string): string {
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  } catch {
    return '-';
  }
}
