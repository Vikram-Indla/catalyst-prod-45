/**
 * Incident Kanban Card - Compact, operational design
 * Left accent indicates SLA health (breached/at-risk only)
 */

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Users, 
  Paperclip, 
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Incident } from '@/types/incident';
import { getSlaHealth, formatAge, SLA_HEALTH_CONFIG } from '../types';

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

  // Left accent color based on SLA
  const getAccentClass = () => {
    if (slaHealth === 'breached') return 'border-l-destructive';
    if (slaHealth === 'at_risk') return 'border-l-[hsl(var(--warning))]';
    return 'border-l-transparent';
  };

  // Severity styling - compact
  const getSeverityClass = () => {
    switch (incident.severity) {
      case 'SEV1': return 'text-destructive font-semibold';
      case 'SEV2': return 'text-[hsl(var(--warning))] font-medium';
      default: return 'text-muted-foreground';
    }
  };

  // SLA text styling
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
        "px-2 py-1.5 bg-card border border-border/60 rounded-sm cursor-grab active:cursor-grabbing",
        "border-l-2",
        getAccentClass(),
        "hover:bg-accent/30 hover:border-border transition-colors",
        "group select-none",
        isDragging && "opacity-50 shadow-md"
      )}
    >
      {/* Row 1: Key + Indicators */}
      <div className="flex items-center justify-between gap-1.5 mb-0.5">
        <button
          onClick={handleKeyClick}
          className="text-[11px] font-mono text-primary hover:underline truncate"
        >
          {incident.incident_key}
        </button>
        
        {/* Top-right indicators */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {incident.is_major_incident && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-[9px] font-medium">Major</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Major Incident</TooltipContent>
            </Tooltip>
          )}
          
          {incident.requires_committee && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span className="text-[9px]">CAB</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Requires Committee</TooltipContent>
            </Tooltip>
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
                  <span className="text-[9px] font-mono">{incident.converted_to_type?.slice(0, 3)}</span>
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
      <p className="text-[13px] font-medium text-foreground line-clamp-2 leading-snug mb-1">
        {incident.title}
      </p>

      {/* Row 3: Compact metadata line */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
        <span className={getSeverityClass()}>{incident.severity}</span>
        <span className="opacity-40">·</span>
        <span>{incident.support_level || '—'}</span>
        <span className="opacity-40">·</span>
        <span>{age}</span>
        <span className="opacity-40">·</span>
        <span className={getSlaClass()}>{slaConfig.label}</span>
      </div>

      {/* Row 4: Assignee + Release */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {incident.assignee ? (
            <>
              <Avatar className="h-4 w-4 flex-shrink-0">
                <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                  {incident.assignee.avatar_initials || incident.assignee.full_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground truncate">
                {incident.assignee.full_name.split(' ')[0]}
              </span>
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground/50 italic">Unassigned</span>
          )}
        </div>
        
        {/* Release tag */}
        {incident.release_version && (
          <span className="text-[9px] text-muted-foreground/70 bg-muted/50 px-1 py-0.5 rounded-sm truncate max-w-[56px]">
            {incident.release_version.version}
          </span>
        )}
      </div>
    </div>
  );
});

export default KanbanCard;
