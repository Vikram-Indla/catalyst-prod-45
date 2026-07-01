/**
 * Incident Kanban Card - Streamlined operational design
 * Left accent indicates SLA health (breached/at-risk only)
 * Special handling for Committee column: shows approvers, due date, edit action
 * Quick actions on hover for faster incident handling
 * DARK MODE COMPLIANT per Design System V2
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
} from '@/lib/atlaskit-icons';
import { cn } from '@/lib/utils';
import { Lozenge, Tooltip } from '@/components/ads';
import { Button } from '@/components/ui/button';
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

// Severity badge component - Dark mode compliant
function SeverityBadge({ severity }: { severity: string }) {
  const getSeverityClasses = () => {
    switch (severity) {
      case 'SEV1':
        // Dark red background, light red text for dark mode
        return "bg-[var(--ds-background-danger)] text-[var(--ds-text-danger)] dark:bg-[var(--ds-text-danger, var(--ds-text-danger))] dark:text-[var(--ds-border-danger)] dark:border dark:border-[var(--ds-text-danger)]";
      case 'SEV2':
        // Amber variant for dark mode
        return "bg-[var(--ds-background-warning-bold)] text-[var(--ds-text-warning)] dark:bg-[var(--ds-text-warning, var(--ds-text-warning))] dark:text-[var(--ds-background-warning, var(--ds-background-warning))] dark:border dark:border-[var(--ds-text-warning, var(--ds-text-warning))]";
      case 'SEV3':
      case 'SEV4':
      default:
        // Gray variant for dark mode
        return "bg-[var(--ds-background-neutral-subtle)] text-[var(--ds-text-subtlest)] dark:bg-[var(--ds-surface-overlay,var(--cp-ink-1))] dark:text-[var(--ds-text-disabled)] dark:border dark:border-[var(--ds-text-subtle)]";
    }
  };
  
  return (
    <span className={cn(
      "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
      getSeverityClasses()
    )}>
      {severity}
    </span>
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

  // Build card styles - dark mode compliant with straight left border
  const isBreached = slaHealth === 'breached';
  const isAtRisk = slaHealth === 'at_risk';

  return (
    <div
      draggable
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "p-3.5 rounded-[10px] flex-shrink-0",
        "cursor-pointer transition-all group",
        isDragging && "opacity-50",
        // Dark mode compliant backgrounds
        "bg-white dark:bg-[var(--ds-surface-overlay,var(--cp-ink-1))]",
        "border border-[var(--ds-border)] dark:border-[var(--ds-border,var(--cp-ink-1))]",
        // Hover state
        "hover:border-[var(--ds-background-neutral-hovered)] dark:hover:border-[var(--ds-border-bold)] dark:hover:bg-[var(--ds-surface-raised,var(--cp-ink-1))]",
        // Shadow
        "shadow-[0_1px_3px_var(--ds-shadow-raised, var(--ds-shadow-raised)),0_1px_2px_var(--ds-shadow-raised, var(--ds-shadow-raised))]",
        "dark:shadow-none",
        isDragging && "shadow-[0_4px_12px_var(--ds-shadow-raised, var(--ds-shadow-raised))]",
        // Left border for severity
        isBreached && "border-l-[3px] border-l-[var(--ds-text-danger)]",
        isAtRisk && !isBreached && "border-l-[3px] border-l-[var(--ds-text-warning)]"
      )}
    >
      {/* Row 1: ID + Badges */}
      <div className="flex items-start justify-between mb-1.5">
        <button
          onClick={handleKeyClick}
          className="font-mono text-sm font-semibold hover:underline text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] dark:text-[var(--ds-text-brand)]"
        >
          {incident.incident_key}
        </button>
        <div className="flex items-center gap-1.5">
          {incident.is_major_incident && (
            <span className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold",
              "bg-[var(--ds-background-warning-bold)] text-[var(--ds-text-warning)]",
              "dark:bg-[#431407] dark:text-[var(--ds-background-warning)] dark:border dark:border-[var(--ds-text-danger)]"
            )}>
              <AlertTriangle className="h-2.5 w-2.5" />
              Major
            </span>
          )}
          {incident.requires_committee && incident.status !== 'to_committee' && (
            <Lozenge appearance="default">CAB</Lozenge>
          )}
          {incident.attachments && incident.attachments.length > 0 && (
            <Tooltip position="top" content={`${incident.attachments.length} attachments`}>
              <Paperclip className="h-3 w-3 text-muted-foreground/60" />
            </Tooltip>
          )}
          {incident.converted_to_id && (
            <Tooltip position="top" content={`Converted to ${incident.converted_to_type}`}>
              <span className="flex items-center gap-0.5 text-muted-foreground">
                <ArrowRightLeft className="h-3 w-3" />
              </span>
            </Tooltip>
          )}
        </div>
      </div>
      
      {/* Row 2: Title */}
      <h4 className="text-sm font-medium leading-snug mb-2.5 text-[var(--ds-surface)] dark:text-[var(--ds-surface-sunken)]">
        {incident.title}
      </h4>
      
      {/* Row 3: Meta */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <span className="text-xs text-[var(--ds-text-subtlest)] dark:text-[var(--ds-text-disabled)]">{age}</span>
          {isBreached && (
            <span className="text-xs font-semibold text-[var(--ds-text-danger)] dark:text-[var(--ds-background-danger)]">Breached</span>
          )}
          {isAtRisk && (
            <span className="text-xs font-semibold text-[var(--ds-text-warning)] dark:text-[var(--ds-background-warning-bold)]">At Risk</span>
          )}
        </div>
        
        {/* Assignee Avatar */}
        {incident.assignee ? (
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold",
            "bg-[var(--ds-background-neutral-subtle)] text-[var(--ds-text-subtlest)]",
            "dark:bg-[var(--ds-text-subtle)] dark:text-[var(--ds-background-neutral-hovered)]"
          )}>
            {incident.assignee.avatar_initials || incident.assignee.full_name.slice(0, 2).toUpperCase()}
          </div>
        ) : (
          <span className="italic text-xs text-[var(--ds-text-subtlest)] dark:text-[var(--ds-text-disabled)]">Unassigned</span>
        )}
      </div>
      
      {/* Committee-specific info */}
      {isInCommittee && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
          {/* Approvers count */}
          <span className="flex items-center gap-0.5 text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] dark:text-[var(--ds-text-brand)]">
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
              <Tooltip position="top" content="Edit Committee">
                <button
                  onClick={handleEditCommitteeClick}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] dark:hover:text-[var(--ds-text-brand)] transition-colors"
                >
                  <Settings className="h-3 w-3" />
                </button>
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
