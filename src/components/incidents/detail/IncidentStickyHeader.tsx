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
import { 
  STATUS_CONFIG, 
  SEVERITY_CONFIG 
} from '@/components/incidents/badges/IncidentBadges';
import { getAllowedTransitions } from '@/utils/incidentLifecycle';
import type { 
  IncidentStatus, 
  SeverityLevel, 
  PriorityLevel, 
  SupportLevel,
  IncidentUserProfile 
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
  projectId: string | null;
  projectName: string | null;
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
  // Handlers
  onTitleChange: (title: string) => void;
  onStatusChange: (status: IncidentStatus) => void;
  onSeverityChange: (severity: SeverityLevel) => void;
  onAssigneeChange: (userId: string) => void;
  onProjectChange: (projectId: string) => void;
  onToggleWatch: () => void;
  onOpenCommittee: () => void;
  onOpenConvertDialog: () => void;
  isSubmitting: boolean;
  isWatchPending: boolean;
}

export function IncidentStickyHeader({
  incidentKey,
  title,
  status,
  severity,
  priority,
  supportLevel,
  assignee,
  projectId,
  projectName,
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
  onTitleChange,
  onStatusChange,
  onSeverityChange,
  onAssigneeChange,
  onProjectChange,
  onToggleWatch,
  onOpenCommittee,
  onOpenConvertDialog,
  isSubmitting,
  isWatchPending,
}: IncidentStickyHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  
  const statusConfig = STATUS_CONFIG[status];
  const severityConfig = SEVERITY_CONFIG[severity];
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
                  <h1 className="text-lg font-semibold text-foreground truncate max-w-2xl">
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

          {/* Row 4: Editable fields row */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Status Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Status</span>
              <Select 
                value={status} 
                onValueChange={(v) => onStatusChange(v as IncidentStatus)}
                disabled={isConverted || status === 'closed'}
              >
                <SelectTrigger className={cn('h-8 w-auto min-w-[120px] text-sm font-medium', statusConfig.className)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={status} className="text-sm">
                    {statusConfig.label} (current)
                  </SelectItem>
                  {allowedTransitions
                    .filter(t => t.targetStatus !== status)
                    .map(t => (
                      <SelectItem key={t.targetStatus} value={t.targetStatus} className="text-sm">
                        {STATUS_CONFIG[t.targetStatus].label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Assignee</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2" disabled={isConverted}>
                    {assignee ? (
                      <>
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                            {assignee.avatar_initials || assignee.full_name?.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assignee.full_name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {availableUsers.map((user) => (
                    <DropdownMenuItem
                      key={user.id}
                      onClick={() => onAssigneeChange(user.id)}
                      className="flex items-center gap-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                          {user.avatar_initials || user.full_name?.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user.full_name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Severity Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Severity</span>
              <Select 
                value={severity} 
                onValueChange={(v) => onSeverityChange(v as SeverityLevel)}
                disabled={isConverted}
              >
                <SelectTrigger className={cn('h-8 w-auto min-w-[100px] text-sm font-medium', severityConfig.className)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEVERITY_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value} className="text-sm">
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority (read-only derived) */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Priority</span>
              <Badge variant="outline" className="h-8 px-3 text-sm font-medium">
                {priority || 'Not set'}
              </Badge>
            </div>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
