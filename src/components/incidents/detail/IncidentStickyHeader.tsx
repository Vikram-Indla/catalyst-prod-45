import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Check, X, Pencil, Eye, EyeOff, Plus, Users, ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG } from '@/components/incidents/badges/IncidentBadges';
import { getAllowedTransitions } from '@/utils/incidentLifecycle';
import type { 
  IncidentStatus, 
  SeverityLevel, 
  PriorityLevel, 
  SupportLevel,
  IncidentUserProfile,
  ReleaseVersion
} from '@/types/incident';

interface Project {
  id: string;
  name: string;
  key: string;
}

interface IncidentStickyHeaderProps {
  incidentKey: string;
  title: string;
  status: IncidentStatus;
  severity: SeverityLevel;
  priority: PriorityLevel | null;
  supportLevel: SupportLevel | null;
  assignee: IncidentUserProfile | null;
  reporter: IncidentUserProfile | null;
  projectId: string | null;
  projectName: string | null;
  releaseVersionId: string | null;
  releaseVersionName: string | null;
  createdAt: string;
  updatedAt: string;
  lastUpdatedBy: string | null;
  committeeApproverCount: number;
  isConverted: boolean;
  isWatching: boolean;
  watcherCount: number;
  canConvert: boolean;
  conversionReason?: string;
  // Available data for dropdowns
  availableProjects: Project[];
  availableUsers: IncidentUserProfile[];
  availableReleaseVersions: ReleaseVersion[];
  // Handlers
  onTitleChange: (title: string) => void;
  onStatusChange: (status: IncidentStatus) => void;
  onSeverityChange: (severity: SeverityLevel) => void;
  onAssigneeChange: (userId: string) => void;
  onReporterChange: (userId: string) => void;
  onProjectChange: (projectId: string) => void;
  onReleaseVersionChange: (versionId: string) => void;
  onToggleWatch: () => void;
  onOpenCommittee: () => void;
  onOpenConvertDialog: () => void;
  isSubmitting: boolean;
  isWatchPending: boolean;
}

export function IncidentStickyHeader(props: IncidentStickyHeaderProps) {
  const {
    incidentKey,
    title,
    status,
    supportLevel,
    assignee,
    reporter,
    projectId,
    projectName,
    releaseVersionId,
    releaseVersionName,
    createdAt,
    updatedAt,
    lastUpdatedBy,
    committeeApproverCount,
    isConverted,
    isWatching,
    watcherCount,
    canConvert,
    conversionReason,
    availableProjects,
    availableUsers,
    availableReleaseVersions,
    onTitleChange,
    onStatusChange,
    onAssigneeChange,
    onReporterChange,
    onProjectChange,
    onReleaseVersionChange,
    onToggleWatch,
    onOpenCommittee,
    onOpenConvertDialog,
    isSubmitting,
    isWatchPending,
  } = props;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

  const allowedTransitions = getAllowedTransitions(status, supportLevel, undefined);

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== title) {
      onTitleChange(editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          {/* Row 1: Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Link 
              to="/release" 
              className="hover:text-foreground transition-colors"
            >
              Release
            </Link>
            <span className="text-muted-foreground/60">/</span>
            <Link 
              to="/release/incidents" 
              className="hover:text-foreground transition-colors"
            >
              Incidents
            </Link>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-foreground font-medium">{incidentKey}</span>
          </nav>

          {/* Row 2: Title (inline editable) */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="h-9 text-lg font-semibold flex-1 max-w-2xl"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') {
                        setIsEditingTitle(false);
                        setEditedTitle(title);
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleSaveTitle}
                  >
                    <Check className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setIsEditingTitle(false);
                      setEditedTitle(title);
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div 
                  className={cn(
                    "flex items-center gap-2 group",
                    !isConverted && "cursor-pointer"
                  )}
                  onClick={() => {
                    if (!isConverted) {
                      setEditedTitle(title);
                      setIsEditingTitle(true);
                    }
                  }}
                >
                  <h1 className="text-xl font-bold text-foreground truncate max-w-2xl">
                    {title}
                  </h1>
                  {!isConverted && (
                    <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  )}
                </div>
              )}
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onToggleWatch}
                disabled={isWatchPending}
                className="h-8"
              >
                {isWatching ? (
                  <EyeOff className="h-4 w-4 mr-1.5" />
                ) : (
                  <Eye className="h-4 w-4 mr-1.5" />
                )}
                {isWatching ? 'Unwatch' : 'Watch'}
                {watcherCount > 0 && (
                  <span className="ml-1 text-muted-foreground">({watcherCount})</span>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={onOpenCommittee}
              >
                <Users className="h-4 w-4 mr-1.5" />
                Committee
                {committeeApproverCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-1.5 h-5 px-1.5 text-xs bg-primary/10 text-primary"
                  >
                    {committeeApproverCount}
                  </Badge>
                )}
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={onOpenConvertDialog}
                      disabled={!canConvert || isSubmitting}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Convert
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canConvert && conversionReason && (
                  <TooltipContent side="bottom" className="text-xs max-w-xs">
                    {conversionReason}
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>

          {/* Row 3: Metadata line */}
          <p className="text-xs text-muted-foreground mb-3">
            Project:{' '}
            <span className="font-medium text-foreground">
              {projectName || 'Unassigned'}
            </span>
            {' • '}
            Created: {formatDate(createdAt)}
            {' • '}
            Updated: {formatDate(updatedAt)}
            {lastUpdatedBy && (
              <>
                {' • '}
                Last updated by{' '}
                <span className="font-medium text-foreground">{lastUpdatedBy}</span>
              </>
            )}
          </p>

          {/* Row 4: Editable fields row - compact triage bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Dropdown - FIXED visibility */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</span>
              <Select 
                value={status} 
                onValueChange={(v) => onStatusChange(v as IncidentStatus)}
                disabled={isConverted || status === 'closed'}
              >
                <SelectTrigger 
                  className={cn(
                    'h-7 w-auto min-w-[110px] text-xs font-medium border',
                    // Ensure text is always visible with proper foreground color
                    'bg-background text-foreground',
                    // Apply status-specific background colors while keeping text visible
                    status === 'open' && 'bg-slate-100 dark:bg-slate-900',
                    status === 'triage' && 'bg-amber-50 dark:bg-amber-950/50',
                    status === 'to_committee' && 'bg-amber-50 dark:bg-amber-950/50',
                    status === 'in_progress' && 'bg-sky-50 dark:bg-sky-950/50',
                    status === 'resolved' && 'bg-emerald-50 dark:bg-emerald-950/50',
                    (status === 'converted' || status === 'closed') && 'bg-muted'
                  )}
                >
                  <SelectValue placeholder="Select status">
                    <span className="text-foreground font-medium">
                      {STATUS_CONFIG[status]?.label || status}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {allowedTransitions.map(t => (
                    <SelectItem key={t.targetStatus} value={t.targetStatus} className="text-xs">
                      {STATUS_CONFIG[t.targetStatus].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Assignee</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2" disabled={isConverted}>
                    {assignee ? (
                      <>
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                            {assignee.avatar_initials || assignee.full_name?.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[80px] truncate">{assignee.full_name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 max-h-64 overflow-auto bg-popover">
                  {availableUsers.map((user) => (
                    <DropdownMenuItem
                      key={user.id}
                      onClick={() => onAssigneeChange(user.id)}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                          {user.avatar_initials || user.full_name?.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {user.full_name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Reporter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Reporter</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2" disabled={isConverted}>
                    {reporter ? (
                      <>
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[8px] bg-muted-foreground/20 text-foreground">
                            {reporter.avatar_initials || reporter.full_name?.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[80px] truncate">{reporter.full_name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 max-h-64 overflow-auto bg-popover">
                  {availableUsers.map((user) => (
                    <DropdownMenuItem
                      key={user.id}
                      onClick={() => onReporterChange(user.id)}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-muted-foreground/20 text-foreground">
                          {user.avatar_initials || user.full_name?.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {user.full_name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>


          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
