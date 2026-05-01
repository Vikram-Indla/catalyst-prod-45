// src/components/ja/home/WorkGridRow.tsx
// Mode-specific data grid row components with correct CTAs per domain

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, ExternalLink, CheckCircle, 
  UserPlus, Clock, MessageSquare, History, Eye, 
  FileText, HelpCircle, Calendar
} from 'lucide-react';
import { WorkItemIcon } from '../icons/WorkItemIcon';
import type { WorkItemType } from '../icons/WorkItemTypeIcon';
import { Avatar } from '@/components/ads';
import { cn } from '@/lib/utils';
import { getValidatedWorkItemRoute } from '@/lib/workItemRoutes';
import { WorkItemStarButton } from '@/components/shared/WorkItemStarButton';
import type { StarredItemType } from '@/hooks/home/useStarredItems';
import { formatTimeAbbreviated } from '@/lib/formatTimeAgo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { HomeRoleMode } from './HomeRoleModeSelector';
import type { WorkItemNavigation, WorkItemContext } from '@/hooks/home/useUnifiedHomeData';
import { LevelTag } from './LevelTag';
import { ModeTag } from './ModeTag';

// ============================================
// SHARED TYPES
// ============================================
// Level hierarchy type
export type HomeLevel = 'Enterprise' | 'Product' | 'Program' | 'Project' | 'Release' | 'Planner';

// Work item mode type
export type WorkItemMode = 'Operations' | 'Delivery' | 'Planner';

// Utility: Determine mode from work item type
export function getWorkItemMode(type: string): WorkItemMode {
  const typeStr = type.toLowerCase();
  
  // Operations: Incidents, Defects, Release-related
  if (['incident', 'defect', 'release', 'change'].includes(typeStr)) {
    return 'Operations';
  }
  
  // Planner: Planning artifacts
  if (['theme', 'objective', 'dependency', 'risk', 'business-request', 'business_request'].includes(typeStr)) {
    return 'Planner';
  }
  
  // Delivery: Everything else (epics, features, stories, tasks)
  return 'Delivery';
}

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

export const GRID_COLS = '100px 1fr 70px 100px 100px 140px 80px';
export const GRID_COLS_MOBILE = '80px 1fr 80px';

// ============================================
// OPERATIONS MODE ROW
// Intent: Operational triage and issue resolution
// Primary content: Incidents, Releases
// ============================================
export function OperationsGridRow({ 
  item, 
  density = 'comfortable',
  currentUserId,
  currentUserName,
  onAssignToMe,
  onAcknowledge,
  onResolve,
}: { 
  item: BaseWorkItem; 
  density?: 'compact' | 'comfortable';
  currentUserId?: string;
  currentUserName?: string;
  onAssignToMe?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const timeAgo = formatTimeAbbreviated(item.activityDate);
  
  const rowHeight = density === 'compact' ? 'py-1' : 'py-2';
  
  // Determine if this is an incident or release for special handling
  const isIncident = item.key?.startsWith('INC') || item.type === 'defect';
  const isRelease = item.key?.startsWith('REL');
  
  // Use nav.path/navPath if provided, otherwise fall back to deterministic routing
  const getItemRoute = (): string | null => {
    // Prefer explicit nav metadata
    if (item.nav?.path) return item.nav.path;

    // Support HomeContentV2/useHomeWorkItems which provides navPath
    const navPath = (item as any).navPath as string | undefined;
    if (typeof navPath === 'string' && navPath) return navPath;

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

  // Check if user can take actions
  const isAlreadyAssignedToMe =
    (!!currentUserName && item.assignee === currentUserName) ||
    (!!currentUserId && item.assignee === currentUserId);
  const canAssign = !isAlreadyAssignedToMe;
  const canAcknowledge = isIncident && item.status === 'triage';
  const canResolve = isIncident && !['resolved', 'closed'].includes(item.status);

  return (
    <>
      {/* Desktop Row - Blue tinted hover for Catalyst brand */}
      <div 
        className={cn(
          "hidden md:grid items-center px-4 transition-all duration-150 cursor-pointer group",
          rowHeight,
          // Blue-tinted hover states
          "hover:bg-[rgba(37,99,235,0.04)] dark:hover:bg-[rgba(37,99,235,0.08)]"
        )}
        style={{ 
          gridTemplateColumns: GRID_COLS,
          borderBottom: '1px solid var(--divider)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleRowClick}
      >
        {/* Key - blue color */}
        <div className="flex items-center gap-2.5">
          <WorkItemIcon type={item.type} size={14} />
          <span className="text-[13px] font-mono font-medium text-[var(--ds-text-brand, #2563eb)] dark:text-[var(--ds-text-brand, #60a5fa)]">{item.key}</span>
        </div>

        {/* Summary - hover changes to olive */}
        <div className="min-w-0 pr-4">
          <div className="text-sm font-medium leading-5 text-[var(--text-1)] truncate group-hover:text-[var(--ds-text-brand, #2563eb)] dark:group-hover:text-[var(--ds-text-brand, #60a5fa)] transition-colors">
            {item.summary}
          </div>
        </div>

        {/* Mode - Operations/Delivery/Planner */}
        <div className="min-w-0">
          <ModeTag mode={getWorkItemMode(item.type)} />
        </div>

        {/* Level - styled tag */}
        <div className="min-w-0">
          <LevelTag level={item.level || 'Release'} />
        </div>

        {/* Updated - abbreviated format */}
        <div className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
          {timeAgo}
        </div>

        {/* Assignee - show full name with avatar */}
        <div className="flex items-center gap-2 min-w-0">
          {item.assignee ? (
            <>
              <Avatar name={item.assignee} size="xsmall" />
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{item.assignee}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
          )}
        </div>

      {/* Quick actions - Operations specific: Kebab menu with Assign to me */}
      {canAssign && (
        <div className={cn("flex items-center justify-end gap-0.5 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
          <DropdownMenu open={actionsOpen} onOpenChange={setActionsOpen}>
            <DropdownMenuTrigger asChild>
              <button 
                type="button"
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                onClick={(e) => e.stopPropagation()}
                title="More actions"
              >
                <UserPlus className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 border-[var(--border-color)] z-[300] shadow-lg"
            >
              <DropdownMenuItem 
                onClick={(e) => e.stopPropagation()}
                onSelect={(e) => {
                  e.stopPropagation();
                  setActionsOpen(false);
                  try {
                    onAssignToMe?.(item.id);
                  } finally {
                    setActionsOpen(false);
                  }
                }}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Assign to me
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
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
          <WorkItemIcon type={item.type} size={12} />
          <span className="text-xs font-mono font-medium text-[var(--ds-text-brand, #2563eb)] dark:text-[var(--ds-text-brand, #60a5fa)]">{item.key}</span>
        </div>
        <div className="min-w-0 px-2">
          <div className="text-sm font-medium leading-5 text-[var(--text-1)] truncate">
            {item.summary}
          </div>
        </div>
        <div className="text-xs tabular-nums text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">
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
  currentUserId,
  currentUserName,
  isStarred = false,
  onToggleStar,
  onAssignToMe,
  onChangeStatus,
  onAddComment,
}: { 
  item: BaseWorkItem; 
  density?: 'compact' | 'comfortable';
  currentUserId?: string;
  currentUserName?: string;
  isStarred?: boolean;
  onToggleStar?: (id: string) => void;
  onAssignToMe?: (id: string) => void;
  onChangeStatus?: (id: string) => void;
  onAddComment?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const timeAgo = formatTimeAbbreviated(item.activityDate);
  
  const rowHeight = density === 'compact' ? 'py-1' : 'py-2';
  
  // Check if user can take actions
  const isAlreadyAssignedToMe =
    (!!currentUserName && item.assignee === currentUserName) ||
    (!!currentUserId && item.assignee === currentUserId);
  const canAssign = !isAlreadyAssignedToMe;
  
  // Use nav.path/navPath if provided, otherwise fall back to centralized utility
  const getItemRoute = (): string | null => {
    if (item.nav?.path) return item.nav.path;

    const navPath = (item as any).navPath as string | undefined;
    if (typeof navPath === 'string' && navPath) return navPath;

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
      {/* Desktop Row - Blue tinted hover for Catalyst brand */}
      <div 
        className={cn(
          "hidden md:grid items-center px-4 transition-all duration-150 cursor-pointer group",
          rowHeight,
          // Blue-tinted hover states
          "hover:bg-[rgba(37,99,235,0.04)] dark:hover:bg-[rgba(37,99,235,0.08)]"
        )}
        style={{ 
          gridTemplateColumns: GRID_COLS,
          borderBottom: '1px solid var(--divider)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleRowClick}
      >
        {/* Key - blue color */}
        <div className="flex items-center gap-2.5">
          <WorkItemIcon type={item.type} size={14} />
          <span className="text-[13px] font-mono font-medium text-[var(--ds-text-brand, #2563eb)] dark:text-[var(--ds-text-brand, #60a5fa)]">{item.key}</span>
        </div>

        {/* Summary - hover changes to olive */}
        <div className="min-w-0 pr-4">
          <div className="text-sm font-medium leading-5 text-[var(--text-1)] truncate group-hover:text-[var(--ds-text-brand, #2563eb)] dark:group-hover:text-[var(--ds-text-brand, #60a5fa)] transition-colors">
            {item.summary}
          </div>
        </div>

        {/* Mode - Operations/Delivery/Planner */}
        <div className="min-w-0">
          <ModeTag mode={getWorkItemMode(item.type)} />
        </div>

        {/* Level - styled tag */}
        <div className="min-w-0">
          <LevelTag level={item.level || 'Project'} />
        </div>

        {/* Updated - abbreviated format */}
        <div className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
          {timeAgo}
        </div>

        {/* Assignee - show full name with avatar */}
        <div className="flex items-center gap-2 min-w-0">
          {item.assignee ? (
            <>
              <Avatar name={item.assignee} size="xsmall" />
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{item.assignee}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
          )}
        </div>

        {/* Quick actions - Delivery specific: Star + Kebab menu */}
        <div className="flex items-center justify-end gap-0.5">
          {/* Star Button - always visible when starred, otherwise on hover */}
          <WorkItemStarButton
            itemId={item.id}
            itemType={item.type as StarredItemType}
            size="sm"
            showTooltip={false}
            alwaysVisibleWhenStarred
            isHovered={isHovered}
          />
          
          {/* Kebab menu with Assign to me */}
          {canAssign && (
            <div className={cn("transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    type="button"
                    className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    onClick={(e) => e.stopPropagation()}
                    title="More actions"
                  >
                    <UserPlus className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="bg-white dark:bg-gray-800 border-[var(--border-color)] z-[300] shadow-lg"
                >
                  <DropdownMenuItem 
                    onClick={(e) => e.stopPropagation()}
                    onSelect={(e) => {
                      e.stopPropagation();
                      onAssignToMe?.(item.id);
                    }}
                    className="text-[var(--text-1)] cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign to me
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
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
          <WorkItemIcon type={item.type} size={12} />
          <span className="text-xs font-mono font-medium text-[var(--ds-text-brand, #2563eb)] dark:text-[var(--ds-text-brand, #60a5fa)]">{item.key}</span>
        </div>
        <div className="min-w-0 px-2">
          <div className="text-sm font-medium leading-5 text-[var(--text-1)] truncate">
            {item.summary}
          </div>
        </div>
        <div className="text-xs tabular-nums text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">
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
  currentUserId,
  currentUserName,
  onAssignToMe,
  onReviewItem,
  onAddNote,
  onPrepareForPlanning,
  onRequestClarification,
}: { 
  item: BaseWorkItem; 
  density?: 'compact' | 'comfortable';
  currentUserId?: string;
  currentUserName?: string;
  onAssignToMe?: (id: string) => void;
  onReviewItem?: (id: string) => void;
  onAddNote?: (id: string) => void;
  onPrepareForPlanning?: (id: string) => void;
  onRequestClarification?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const timeAgo = formatTimeAbbreviated(item.activityDate);
  
  const rowHeight = density === 'compact' ? 'py-1' : 'py-2';
  
  // Check if user can take actions
  const isAlreadyAssignedToMe =
    (!!currentUserName && item.assignee === currentUserName) ||
    (!!currentUserId && item.assignee === currentUserId);
  const canAssign = !isAlreadyAssignedToMe;
  
  // Use nav.path/navPath if provided, otherwise fall back to centralized utility
  const getItemRoute = (): string | null => {
    if (item.nav?.path) return item.nav.path;

    const navPath = (item as any).navPath as string | undefined;
    if (typeof navPath === 'string' && navPath) return navPath;

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
      {/* Desktop Row - Blue tinted hover for Catalyst brand */}
      <div 
        className={cn(
          "hidden md:grid items-center px-4 transition-all duration-150 cursor-pointer group",
          rowHeight,
          // Blue-tinted hover states
          "hover:bg-[rgba(37,99,235,0.04)] dark:hover:bg-[rgba(37,99,235,0.08)]"
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
          <WorkItemIcon type={item.type} size={14} />
          <span className="text-[13px] font-mono font-medium text-[var(--ds-text-brand, #2563eb)] dark:text-[var(--ds-text-brand, #60a5fa)]">{item.key}</span>
        </div>

        {/* Summary - hover changes to olive */}
        <div className="min-w-0 pr-4">
          <div className="text-sm font-medium leading-5 text-[var(--text-1)] truncate group-hover:text-[var(--ds-text-brand, #2563eb)] dark:group-hover:text-[var(--ds-text-brand, #60a5fa)] transition-colors">
            {item.summary}
          </div>
        </div>

        {/* Mode - Operations/Delivery/Planner */}
        <div className="min-w-0">
          <ModeTag mode={getWorkItemMode(item.type)} />
        </div>

        {/* Level - styled tag */}
        <div className="min-w-0">
          <LevelTag level={item.level || 'Planner'} />
        </div>

        {/* Updated - abbreviated format */}
        <div className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
          {timeAgo}
        </div>

        {/* Assignee - show full name with avatar */}
        <div className="flex items-center gap-2 min-w-0">
          {item.assignee ? (
            <>
              <Avatar name={item.assignee} size="xsmall" />
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{item.assignee}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
          )}
        </div>

        {/* Quick actions - Planner specific: Kebab menu with Assign to me */}
        {canAssign && (
          <div className={cn("flex items-center justify-end gap-0.5 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  type="button"
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  onClick={(e) => e.stopPropagation()}
                  title="More actions"
                >
                  <UserPlus className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 border-[var(--border-color)] z-[300] shadow-lg"
              >
                <DropdownMenuItem 
                  onClick={(e) => e.stopPropagation()}
                  onSelect={(e) => {
                    e.stopPropagation();
                    onAssignToMe?.(item.id);
                  }}
                  className="text-[var(--text-1)] cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign to me
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
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
          <WorkItemIcon type={item.type} size={12} />
          <span className="text-xs font-mono font-medium text-[var(--ds-text-brand, #2563eb)] dark:text-[var(--ds-text-brand, #60a5fa)]">{item.key}</span>
        </div>
        <div className="min-w-0 px-2">
          <div className="text-sm font-medium leading-5 text-[var(--text-1)] truncate">
            {item.summary}
          </div>
        </div>
        <div className="text-xs tabular-nums text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">
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
  currentUserId,
  currentUserName,
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
  currentUserId?: string;
  currentUserName?: string;
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
          currentUserId={currentUserId}
          currentUserName={currentUserName}
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
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onAssignToMe={onAssignToMe}
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
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          isStarred={isStarred}
          onToggleStar={onToggleStar}
          onAssignToMe={onAssignToMe}
          onChangeStatus={onChangeStatus}
          onAddComment={onAddComment}
        />
      );
  }
}
