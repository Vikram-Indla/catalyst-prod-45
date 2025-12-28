/**
 * Incident Kanban Card - Streamlined operational design
 * Left accent indicates SLA health (breached/at-risk only)
 * Special handling for Committee column: shows approvers, due date, edit action
 * Quick actions on hover for faster incident handling
 */

import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Users, 
  Paperclip, 
  ArrowRightLeft,
  Clock,
  Settings,
  UserPlus,
  ArrowUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Incident } from '@/types/incident';
import { getSlaHealth, formatAge, SLA_HEALTH_CONFIG } from '../types';

interface KanbanCardProps {
  incident: Incident;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, incident: Incident) => void;
  onDragEnd?: () => void;
  onEditCommittee?: (incident: Incident) => void;
}

// Format due date compactly
function formatDueDate(dueDate: string): { text: string; isUrgent: boolean } {
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // Check if urgent (within 24h or past due)
  const isUrgent = diffHours <= 24;
  
  if (diffMs < 0) {
    const hoursAgo = Math.abs(Math.floor(diffHours));
    if (hoursAgo < 24) {
      return { text: `Overdue ${hoursAgo}h`, isUrgent: true };
    }
    const daysAgo = Math.floor(hoursAgo / 24);
    return { text: `Overdue ${daysAgo}d`, isUrgent: true };
  }
  
  // Today
  if (due.toDateString() === now.toDateString()) {
    return { 
      text: `Today ${due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      isUrgent 
    };
  }
  
  // Tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (due.toDateString() === tomorrow.toDateString()) {
    return { 
      text: `Tomorrow ${due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      isUrgent 
    };
  }
  
  // Within this week
  if (diffHours < 168) { // 7 days
    return { 
      text: due.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }),
      isUrgent 
    };
  }
  
  return { 
    text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    isUrgent: false 
  };
}

// Severity badge component - Catalyst V5 token compliant
function SeverityBadge({ severity }: { severity: string }) {
  // Using exact Catalyst V5 rgba values
  const getSeverityStyles = (): React.CSSProperties => {
    switch (severity) {
      case 'SEV1':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          borderColor: 'transparent',
        };
      case 'SEV2':
        return {
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          color: '#fbbf24',
          borderColor: 'transparent',
        };
      case 'SEV3':
      default:
        return {
          backgroundColor: 'var(--surface-hover, #262626)',
          color: 'var(--text-4, #737373)',
          borderColor: 'transparent',
        };
    }
  };
  
  return (
    <Badge 
      variant="outline"
      className="h-5 px-1.5 text-[10px] font-bold uppercase border-0"
      style={getSeverityStyles()}
    >
      {severity}
    </Badge>
  );
}

export const KanbanCard = memo(function KanbanCard({ 
  incident, 
  isDragging,
  onDragStart,
  onDragEnd,
  onEditCommittee,
}: KanbanCardProps) {
  const navigate = useNavigate();
  const slaHealth = getSlaHealth(incident);
  const slaConfig = SLA_HEALTH_CONFIG[slaHealth];
  const age = formatAge(incident.created_at);
  
  // Committee-specific data
  const isInCommittee = incident.status === 'to_committee';
  const approverCount = incident.committee?.members?.length || 0;
  const committeeDue = incident.committee?.due_date;
  
  const dueDateInfo = useMemo(() => {
    if (!committeeDue) return null;
    return formatDueDate(committeeDue);
  }, [committeeDue]);

  const handleClick = () => {
    navigate(`/release/incidents/${incident.id}`);
  };

  const handleKeyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/release/incidents/${incident.id}`);
  };
  
  const handleEditCommitteeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditCommittee?.(incident);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', incident.id);
    onDragStart?.(e, incident);
  };

  // Left accent color based on SLA - using V5 token colors
  const getAccentStyle = (): React.CSSProperties => {
    if (slaHealth === 'breached') return { borderLeftColor: '#ef4444' };
    if (slaHealth === 'at_risk') return { borderLeftColor: '#f59e0b' };
    return { borderLeftColor: 'transparent' };
  };

  return (
    <div
      draggable
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "p-3.5 rounded-[10px] border shadow-sm",
        "border-l-[3px]",
        "hover:shadow-md transition-all cursor-pointer group",
        isDragging && "opacity-50 shadow-lg"
      )}
      style={{
        backgroundColor: 'var(--surface-subtle, #1f1f1f)',
        borderColor: 'var(--border-color, #262626)',
        ...getAccentStyle(),
      }}
    >
      {/* Row 1: ID + Badges */}
      <div className="flex items-center justify-between mb-1.5">
        <button
          onClick={handleKeyClick}
          className="font-mono text-sm font-semibold hover:underline"
          style={{ color: 'var(--brand-primary-hex, #3b82f6)' }}
        >
          {incident.incident_key}
        </button>
        <div className="flex items-center gap-1.5">
          {incident.is_major_incident && (
            <Badge 
              variant="outline" 
              className="h-5 px-2 py-0.5 text-[11px] font-semibold border-0"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
              }}
            >
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
              Major
            </Badge>
          )}
          {incident.requires_committee && incident.status !== 'to_committee' && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              CAB
            </Badge>
          )}
          {incident.attachments && incident.attachments.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Paperclip className="h-3 w-3 text-muted-foreground/60" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">{incident.attachments.length} attachments</TooltipContent>
            </Tooltip>
          )}
          {incident.converted_to_id && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <ArrowRightLeft className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Converted to {incident.converted_to_type}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      
      {/* Row 2: Title */}
      <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
        {incident.title}
      </p>
      
      {/* Row 3: Meta */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <span className="text-xs" style={{ color: 'var(--text-4, #737373)' }}>{age}</span>
          {slaHealth === 'breached' && (
            <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>Breached</span>
          )}
          {slaHealth === 'at_risk' && (
            <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>At Risk</span>
          )}
        </div>
        
        {/* Assignee Avatar */}
        {incident.assignee ? (
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px] bg-muted">
              {incident.assignee.avatar_initials || incident.assignee.full_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="text-muted-foreground italic text-xs">Unassigned</span>
        )}
      </div>
      
      {/* Committee-specific info */}
      {isInCommittee && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
          {/* Approvers count */}
          <span className="flex items-center gap-0.5 text-[#2563eb] dark:text-[#60a5fa]">
            <Users className="h-3 w-3" />
            <span className="font-medium">{approverCount}</span>
          </span>
          
          {/* Due date */}
          {dueDateInfo && (
            <>
              <span className="opacity-40">·</span>
              <span className={cn(
                "flex items-center gap-0.5",
                dueDateInfo.isUrgent && "text-amber-600 dark:text-amber-400"
              )}>
                {dueDateInfo.isUrgent && <Clock className="h-3 w-3" />}
                Due: {dueDateInfo.text}
              </span>
            </>
          )}
          
          {/* Edit button */}
          {onEditCommittee && (
            <>
              <span className="flex-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleEditCommitteeClick}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-[#2563eb] dark:hover:text-[#60a5fa] transition-colors"
                  >
                    <Settings className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Edit Committee</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      )}
      
      {/* Quick Actions (on hover) */}
      <div className="hidden group-hover:flex items-center gap-1 mt-2 pt-2 border-t border-border">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs flex-1"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Open assign modal
            navigate(`/release/incidents/${incident.id}?action=assign`);
          }}
        >
          <UserPlus className="h-3 w-3 mr-1" />
          Assign
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs flex-1"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Open escalate modal
            navigate(`/release/incidents/${incident.id}?action=escalate`);
          }}
        >
          <ArrowUp className="h-3 w-3 mr-1" />
          Escalate
        </Button>
      </div>
    </div>
  );
});

export default KanbanCard;
