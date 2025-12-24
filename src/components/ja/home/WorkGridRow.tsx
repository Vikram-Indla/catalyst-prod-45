// src/components/ja/home/WorkGridRow.tsx
// Mode-specific data grid row components with correct CTAs per domain

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, MoreHorizontal, ExternalLink, CheckCircle, 
  UserPlus, Clock, MessageSquare, History, Eye, 
  FileText, HelpCircle, Calendar
} from 'lucide-react';
import { WorkItemTypeIcon, WorkItemType } from '../icons/WorkItemTypeIcon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getValidatedWorkItemRoute } from '@/lib/workItemRoutes';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { HomeRoleMode } from './HomeRoleModeSelector';
import type { WorkItemNavigation, WorkItemContext } from '@/hooks/home/useUnifiedHomeData';

// ============================================
// SHARED TYPES
// ============================================
// Level hierarchy type
export type HomeLevel = 'Enterprise' | 'Product' | 'Program' | 'Project' | 'Release' | 'Planner';

export interface BaseWorkItem {
  id: string;
  key: string;
  summary: string;
  project: string;
  projectKey: string;
  level?: HomeLevel; // Nav menu level: Enterprise, Product, Program, Project, Release, Planner
  status: string;
  type: WorkItemType;
  assignee: string | null;
  activityDate: Date;
  activityType: 'Updated' | 'Created';
  priority?: string;
  severity?: string;
  blocked?: boolean;
  // Navigation metadata
  nav?: WorkItemNavigation;
  context?: WorkItemContext;
}

export const GRID_COLS = '100px 1fr 120px 110px 140px 80px';
export const GRID_COLS_MOBILE = '80px 1fr 80px';

// ============================================
// OPERATIONS MODE ROW
// Intent: Operational triage and issue resolution
// Primary content: Incidents, Releases
// ============================================
export function OperationsGridRow({ 
  item, 
  density = 'comfortable',
  onAssignToMe,
  onAcknowledge,
  onResolve,
}: { 
  item: BaseWorkItem; 
  density?: 'compact' | 'comfortable';
  onAssignToMe?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const timeAgo = formatDistanceToNow(item.activityDate, { addSuffix: false });
  
  const rowHeight = density === 'compact' ? 'py-1' : 'py-2';
  
  // Determine if this is an incident or release for special handling
  const isIncident = item.key?.startsWith('INC') || item.type === 'defect';
  const isRelease = item.key?.startsWith('REL');
  
  // Use nav.path if provided, otherwise fall back to deterministic routing
  const getItemRoute = (): string | null => {
    // Prefer nav.path from backend
    if (item.nav?.path) {
      return item.nav.path;
    }
    // Fallback to deterministic rules
    if (isIncident) {
      return item.id ? `/release/incidents/${item.id}` : null;
    }
    if (isRelease) {
      return item.id ? `/release/releases/${item.id}` : null;
    }
    // For other types, use the centralized route helper
    return getValidatedWorkItemRoute({ id: item.id, key: item.key, type: item.type });
  };
  
  const handleRowClick = () => {
    const route = getItemRoute();
    if (route) {
      navigate(route);
    }
  };

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    const route = getItemRoute();
    if (route) {
      window.open(route, '_blank');
    }
  };

  // Check if user can take actions (placeholder - would check permissions)
  const canAssign = true;
  const canAcknowledge = isIncident && item.status === 'triage';
  const canResolve = isIncident && !['resolved', 'closed'].includes(item.status);

  return (
    <>
      {/* Desktop Row */}
      <div 
        className={cn(
          "hidden md:grid items-center px-4 transition-colors cursor-pointer group",
          rowHeight,
          isHovered && "bg-[var(--row-hover)]"
        )}
        style={{ 
          gridTemplateColumns: GRID_COLS,
          borderBottom: '1px solid var(--divider)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleRowClick}
      >
        {/* Key - bronze/gold color */}
        <div className="flex items-center gap-2.5">
          <WorkItemTypeIcon type={item.type} size={14} />
          <span className="text-[13px] font-mono font-medium text-[#8b7355] dark:text-[#d4a855]">{item.key}</span>
        </div>

        {/* Summary - hover changes to olive */}
        <div className="min-w-0 pr-4">
          <div className="text-sm font-medium leading-5 text-[var(--text-1)] truncate group-hover:text-[#5c7c5c] dark:group-hover:text-[#7a9a7a] transition-colors">
            {item.summary}
          </div>
        </div>

        {/* Level - brighter in dark mode */}
        <div className="text-sm truncate text-gray-600 dark:text-gray-300">
          {item.level || 'Release'}
        </div>

        {/* Updated */}
        <div className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
          {timeAgo} ago
        </div>

        {/* Assignee - show full name with avatar */}
        <div className="flex items-center gap-2 min-w-0">
          {item.assignee ? (
            <>
              <Avatar className="w-6 h-6 shrink-0">
                <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-[#5c7c5c] to-[#4a6a4a] text-white">
                  {item.assignee.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{item.assignee}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
          )}
        </div>

      {/* Quick actions - Operations specific: View, Assign, Acknowledge/Resolve */}
      <div className={cn("flex items-center justify-end gap-0.5 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                onClick={(e) => { e.stopPropagation(); handleRowClick(); }}
                title="View details"
              >
                <Eye className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>View details</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {canAssign && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  onClick={(e) => { e.stopPropagation(); onAssignToMe?.(item.id); }}
                  title="Assign to me"
                >
                  <UserPlus className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Assign to me</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {canAcknowledge && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--brand-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  onClick={(e) => { e.stopPropagation(); onAcknowledge?.(item.id); }}
                  title="Acknowledge"
                >
                  <CheckCircle className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Acknowledge incident</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              onClick={(e) => e.stopPropagation()}
              title="More actions"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="bg-[var(--surface-1)] border-[var(--border-color)] z-[300]"
          >
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); handleRowClick(); }}
              className="text-[var(--text-1)] cursor-pointer"
            >
              <Eye className="w-4 h-4 mr-2" />
              View details
            </DropdownMenuItem>
            {canAssign && (
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onAssignToMe?.(item.id); }}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Assign to me
              </DropdownMenuItem>
            )}
            {isIncident && canResolve && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onAcknowledge?.(item.id); }}
                  className="text-[var(--text-1)] cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Acknowledge
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onResolve?.(item.id); }}
                  className="text-[var(--text-1)] cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); /* TODO: View history */ }}
              className="text-[var(--text-1)] cursor-pointer"
            >
              <History className="w-4 h-4 mr-2" />
              View history
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleOpenNewTab}
              className="text-[var(--text-1)] cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in new tab
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>
      
      {/* Mobile Row */}
      <div 
        className={cn(
          "grid md:hidden items-center px-3 py-2 transition-colors cursor-pointer",
          isHovered && "bg-[var(--row-hover)]"
        )}
        style={{ 
          gridTemplateColumns: GRID_COLS_MOBILE,
          borderBottom: '1px solid var(--divider)',
        }}
        onClick={handleRowClick}
      >
        <div className="flex items-center gap-1.5">
          <WorkItemTypeIcon type={item.type} size={12} />
          <span className="text-xs font-mono font-medium text-[#8b7355] dark:text-[#d4a855]">{item.key}</span>
        </div>
        <div className="min-w-0 px-2">
          <div className="text-sm font-medium leading-5 text-[var(--text-1)] truncate">
            {item.summary}
          </div>
        </div>
        <div className="text-xs tabular-nums text-gray-500 dark:text-gray-400 text-right">
          {timeAgo}
        </div>
      </div>
    </>
  );
}

// ============================================
// DELIVERY MODE ROW
// Intent: Execution tracking and day-to-day delivery work
// Primary content: Epics, Features, Stories, Tasks
// ============================================
export function DeliveryGridRow({ 
  item, 
  density = 'comfortable',
  isStarred = false,
  onToggleStar,
  onAssignToMe,
  onChangeStatus,
  onAddComment,
}: { 
  item: BaseWorkItem; 
  density?: 'compact' | 'comfortable';
  isStarred?: boolean;
  onToggleStar?: (id: string) => void;
  onAssignToMe?: (id: string) => void;
  onChangeStatus?: (id: string) => void;
  onAddComment?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const timeAgo = formatDistanceToNow(item.activityDate, { addSuffix: false });
  
  const rowHeight = density === 'compact' ? 'py-1' : 'py-2';
  
  // Use nav.path if provided, otherwise fall back to centralized utility
  const getItemRoute = (): string | null => {
    if (item.nav?.path) {
      return item.nav.path;
    }
    return getValidatedWorkItemRoute({ id: item.id, key: item.key, type: item.type });
  };

  const handleRowClick = () => {
    const route = getItemRoute();
    if (route) {
      navigate(route);
    }
  };

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    const route = getItemRoute();
    if (route) {
      window.open(route, '_blank');
    }
  };

  return (
    <>
      {/* Desktop Row */}
      <div 
        className={cn(
          "hidden md:grid items-center px-4 transition-colors cursor-pointer group",
          rowHeight,
          isHovered && "bg-[var(--row-hover)]"
        )}
        style={{ 
          gridTemplateColumns: GRID_COLS,
          borderBottom: '1px solid var(--divider)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleRowClick}
      >
        {/* Key - bronze/gold color */}
        <div className="flex items-center gap-2.5">
          <WorkItemTypeIcon type={item.type} size={14} />
          <span className="text-[13px] font-mono font-medium text-[#8b7355] dark:text-[#d4a855]">{item.key}</span>
        </div>

        {/* Summary - hover changes to olive */}
        <div className="min-w-0 pr-4">
          <div className="text-sm font-medium leading-5 text-[var(--text-1)] truncate group-hover:text-[#5c7c5c] dark:group-hover:text-[#7a9a7a] transition-colors">
            {item.summary}
          </div>
        </div>

        {/* Level - brighter in dark mode */}
        <div className="text-sm truncate text-gray-600 dark:text-gray-300">
          {item.level || 'Project'}
        </div>

        {/* Updated */}
        <div className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
          {timeAgo} ago
        </div>

        {/* Assignee - show full name with avatar */}
        <div className="flex items-center gap-2 min-w-0">
          {item.assignee ? (
            <>
              <Avatar className="w-6 h-6 shrink-0">
                <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-[#5c7c5c] to-[#4a6a4a] text-white">
                  {item.assignee.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{item.assignee}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
          )}
        </div>

        {/* Quick actions - Delivery specific: View, Open in new tab, Star */}
        <div className={cn("flex items-center justify-end gap-0.5 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  onClick={(e) => { e.stopPropagation(); handleRowClick(); }}
                  title="View details"
                >
                  <Eye className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>View details</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  onClick={handleOpenNewTab}
                  title="Open in new tab"
                >
                  <FileText className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Open in new tab</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                onClick={(e) => e.stopPropagation()}
                title="More actions"
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="bg-[var(--surface-1)] border-[var(--border-color)] z-[300]"
            >
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onAssignToMe?.(item.id); }}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Assign to me
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onChangeStatus?.(item.id); }}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Change status
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onAddComment?.(item.id); }}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Add comment
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); /* TODO: View history */ }}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <History className="w-4 h-4 mr-2" />
                View history
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Mobile Row */}
      <div 
        className={cn(
          "grid md:hidden items-center px-3 py-2 transition-colors cursor-pointer",
          isHovered && "bg-[var(--row-hover)]"
        )}
        style={{ 
          gridTemplateColumns: GRID_COLS_MOBILE,
          borderBottom: '1px solid var(--divider)',
        }}
        onClick={handleRowClick}
      >
        <div className="flex items-center gap-1.5">
          <WorkItemTypeIcon type={item.type} size={12} />
          <span className="text-xs font-mono font-medium text-[#8b7355] dark:text-[#d4a855]">{item.key}</span>
        </div>
        <div className="min-w-0 px-2">
          <div className="text-sm font-medium leading-5 text-[var(--text-1)] truncate">
            {item.summary}
          </div>
        </div>
        <div className="text-xs tabular-nums text-gray-500 dark:text-gray-400 text-right">
          {timeAgo}
        </div>
      </div>
    </>
  );
}

// ============================================
// PLANNER MODE ROW
// Intent: Planning, preparation, and decision support
// Primary content: Planned items, Upcoming work, Pending review
// ============================================
export function PlannerGridRow({ 
  item, 
  density = 'comfortable',
  onReviewItem,
  onAddNote,
  onPrepareForPlanning,
  onRequestClarification,
}: { 
  item: BaseWorkItem; 
  density?: 'compact' | 'comfortable';
  onReviewItem?: (id: string) => void;
  onAddNote?: (id: string) => void;
  onPrepareForPlanning?: (id: string) => void;
  onRequestClarification?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const timeAgo = formatDistanceToNow(item.activityDate, { addSuffix: false });
  
  const rowHeight = density === 'compact' ? 'py-1' : 'py-2';
  
  // Use nav.path if provided, otherwise fall back to centralized utility
  const getItemRoute = (): string | null => {
    if (item.nav?.path) {
      return item.nav.path;
    }
    return getValidatedWorkItemRoute({ id: item.id, key: item.key, type: item.type });
  };
  
  const handleRowClick = () => {
    const route = getItemRoute();
    if (route) {
      navigate(route);
    }
  };

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    const route = getItemRoute();
    if (route) {
      window.open(route, '_blank');
    }
  };

  return (
    <>
      {/* Desktop Row */}
      <div 
        className={cn(
          "hidden md:grid items-center px-4 transition-colors cursor-pointer group",
          rowHeight,
          isHovered && "bg-[var(--row-hover)]"
        )}
        style={{ 
          gridTemplateColumns: GRID_COLS,
          borderBottom: '1px solid var(--divider)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleRowClick}
      >
        {/* Key - bronze/gold color */}
        <div className="flex items-center gap-2.5">
          <WorkItemTypeIcon type={item.type} size={14} />
          <span className="text-[13px] font-mono font-medium text-[#8b7355] dark:text-[#d4a855]">{item.key}</span>
        </div>

        {/* Summary - hover changes to olive */}
        <div className="min-w-0 pr-4">
          <div className="text-sm font-medium leading-5 text-[var(--text-1)] truncate group-hover:text-[#5c7c5c] dark:group-hover:text-[#7a9a7a] transition-colors">
            {item.summary}
          </div>
        </div>

        {/* Level - brighter in dark mode */}
        <div className="text-sm truncate text-gray-600 dark:text-gray-300">
          {item.level || 'Planner'}
        </div>

        {/* Updated */}
        <div className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
          {timeAgo} ago
        </div>

        {/* Assignee - show full name with avatar */}
        <div className="flex items-center gap-2 min-w-0">
          {item.assignee ? (
            <>
              <Avatar className="w-6 h-6 shrink-0">
                <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-[#5c7c5c] to-[#4a6a4a] text-white">
                  {item.assignee.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{item.assignee}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
          )}
        </div>

        {/* Quick actions - Planner specific: Review, Add note */}
        <div className={cn("flex items-center justify-end gap-0.5 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  onClick={(e) => { e.stopPropagation(); onReviewItem?.(item.id); }}
                  title="Review item"
                >
                  <Eye className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Review item</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  onClick={(e) => { e.stopPropagation(); onAddNote?.(item.id); }}
                  title="Add note"
                >
                  <FileText className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Add note</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                onClick={(e) => e.stopPropagation()}
                title="More actions"
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="bg-[var(--surface-1)] border-[var(--border-color)] z-[300]"
            >
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onPrepareForPlanning?.(item.id); }}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Prepare for planning
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onRequestClarification?.(item.id); }}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Request clarification
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleOpenNewTab}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in new tab
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Mobile Row */}
      <div 
        className={cn(
          "grid md:hidden items-center px-3 py-2 transition-colors cursor-pointer",
          isHovered && "bg-[var(--row-hover)]"
        )}
        style={{ 
          gridTemplateColumns: GRID_COLS_MOBILE,
          borderBottom: '1px solid var(--divider)',
        }}
        onClick={handleRowClick}
      >
        <div className="flex items-center gap-1.5">
          <WorkItemTypeIcon type={item.type} size={12} />
          <span className="text-xs font-mono font-medium text-[#8b7355] dark:text-[#d4a855]">{item.key}</span>
        </div>
        <div className="min-w-0 px-2">
          <div className="text-sm font-medium leading-5 text-[var(--text-1)] truncate">
            {item.summary}
          </div>
        </div>
        <div className="text-xs tabular-nums text-gray-500 dark:text-gray-400 text-right">
          {timeAgo}
        </div>
      </div>
    </>
  );
}

// ============================================
// MODE-AWARE ROW SELECTOR
// ============================================
export function ModeAwareGridRow({
  item,
  mode,
  density = 'comfortable',
  isStarred = false,
  onToggleStar,
  onAssignToMe,
  onAcknowledge,
  onResolve,
  onChangeStatus,
  onAddComment,
  onReviewItem,
  onAddNote,
  onPrepareForPlanning,
  onRequestClarification,
}: {
  item: BaseWorkItem;
  mode: HomeRoleMode;
  density?: 'compact' | 'comfortable';
  isStarred?: boolean;
  onToggleStar?: (id: string) => void;
  onAssignToMe?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  onChangeStatus?: (id: string) => void;
  onAddComment?: (id: string) => void;
  onReviewItem?: (id: string) => void;
  onAddNote?: (id: string) => void;
  onPrepareForPlanning?: (id: string) => void;
  onRequestClarification?: (id: string) => void;
}) {
  switch (mode) {
    case 'operations':
      return (
        <OperationsGridRow 
          item={item} 
          density={density}
          onAssignToMe={onAssignToMe}
          onAcknowledge={onAcknowledge}
          onResolve={onResolve}
        />
      );
    case 'planner':
      return (
        <PlannerGridRow 
          item={item} 
          density={density}
          onReviewItem={onReviewItem}
          onAddNote={onAddNote}
          onPrepareForPlanning={onPrepareForPlanning}
          onRequestClarification={onRequestClarification}
        />
      );
    case 'delivery':
    default:
      return (
        <DeliveryGridRow 
          item={item} 
          density={density}
          isStarred={isStarred}
          onToggleStar={onToggleStar}
          onAssignToMe={onAssignToMe}
          onChangeStatus={onChangeStatus}
          onAddComment={onAddComment}
        />
      );
  }
}
