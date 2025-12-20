/**
 * Incident Kanban Card - Compact design for high-volume boards
 */

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Users, 
  Paperclip, 
  ArrowRightLeft,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Incident } from '@/types/incident';
import { getSlaHealth, formatAge, getTimeInStatus, SLA_HEALTH_CONFIG } from '../types';

interface KanbanCardProps {
  incident: Incident;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, incident: Incident) => void;
  onDragEnd?: () => void;
}

export const KanbanCard = memo(function KanbanCard({ 
  incident, 
  isDragging,
  onDragStart,
  onDragEnd,
}: KanbanCardProps) {
  const navigate = useNavigate();
  const slaHealth = getSlaHealth(incident);
  const slaConfig = SLA_HEALTH_CONFIG[slaHealth];
  const timeInStatus = getTimeInStatus(incident.updated_at);
  const age = formatAge(incident.created_at);

  const handleClick = () => {
    navigate(`/release/incidents/${incident.id}`);
  };

  const handleKeyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/release/incidents/${incident.id}`);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', incident.id);
    onDragStart?.(e, incident);
  };

  // Severity colors
  const getSeverityClass = () => {
    switch (incident.severity) {
      case 'SEV1': return 'text-destructive font-bold';
      case 'SEV2': return 'text-[hsl(var(--warning))] font-semibold';
      case 'SEV3': return 'text-[hsl(var(--b400))]';
      default: return 'text-muted-foreground';
    }
  };

  // SLA indicator
  const getSlaClass = () => {
    if (slaHealth === 'breached') return 'text-destructive';
    if (slaHealth === 'at_risk') return 'text-[hsl(var(--warning))]';
    return 'text-muted-foreground';
  };

  return (
    <div
      draggable
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "p-2.5 bg-card border border-border rounded cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:border-[var(--brand-primary)] transition-all",
        "group select-none",
        isDragging && "opacity-50 shadow-lg border-[var(--brand-primary)]"
      )}
    >
      {/* Row 1: Key + Indicators */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <button
          onClick={handleKeyClick}
          className="text-xs font-mono text-[var(--brand-primary)] hover:underline truncate"
        >
          {incident.incident_key}
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Major indicator */}
          {incident.is_major_incident && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Major Incident</TooltipContent>
            </Tooltip>
          )}
          
          {/* Committee indicator (governance, not status) */}
          {incident.requires_committee && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[hsl(var(--secondary-bronze))]">
                  <Users className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Requires Committee</TooltipContent>
            </Tooltip>
          )}
          
          {/* Attachments indicator */}
          {incident.attachments && incident.attachments.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">{incident.attachments.length} attachments</TooltipContent>
            </Tooltip>
          )}
          
          {/* Converted indicator */}
          {incident.converted_to_id && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[hsl(var(--info))]">
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

      {/* Row 2: Summary (2 lines max) */}
      <p className="text-sm font-medium text-foreground line-clamp-2 mb-1.5 leading-tight">
        {incident.title}
      </p>

      {/* Row 3: Metadata line */}
      <div className="flex items-center gap-1.5 text-[11px] mb-1.5">
        <span className={getSeverityClass()}>{incident.severity}</span>
        <span className="text-muted-foreground/50">·</span>
        <span className="text-muted-foreground">{incident.support_level || '—'}</span>
        <span className="text-muted-foreground/50">·</span>
        <span className="text-muted-foreground">{age}</span>
        <span className="text-muted-foreground/50">·</span>
        <span className={getSlaClass()}>{slaConfig.label}</span>
      </div>

      {/* Row 4: Assignee + Release + Time in status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {incident.assignee ? (
            <>
              <Avatar className="h-4 w-4 flex-shrink-0">
                <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                  {incident.assignee.avatar_initials || incident.assignee.full_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] text-muted-foreground truncate">
                {incident.assignee.full_name.split(' ')[0]}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground/60 italic">Unassigned</span>
          )}
          
          {/* Release tag */}
          {incident.release_version && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded truncate max-w-[60px]">
                {incident.release_version.version}
              </span>
            </>
          )}
        </div>
        
        {/* Time in status - subtle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60 flex-shrink-0">
              <Clock className="h-2.5 w-2.5" />
              {timeInStatus}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            In current status: {timeInStatus}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

export default KanbanCard;
