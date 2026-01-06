import { useState } from 'react';
import { ChevronDown, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface StatusTransition {
  action: string;
  targetStatus: string;
  targetLabel: string;
}

interface IncidentStatusDropdownProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  onAssignToMe?: () => void;
}

/**
 * Status config using Catalyst V5 semantic tokens - NO hardcoded colors
 */
const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  'open': { label: 'Open', bgColor: 'bg-[var(--sem-info-bg)]', textColor: 'text-[var(--sem-info)]' },
  'in-progress': { label: 'In Progress', bgColor: 'bg-[var(--sem-warning-bg)]', textColor: 'text-[var(--sem-warning)]' },
  'pending': { label: 'Pending', bgColor: 'bg-[var(--sem-high-bg)]', textColor: 'text-[var(--sem-high)]' },
  'resolved': { label: 'Resolved', bgColor: 'bg-[var(--sem-success-bg)]', textColor: 'text-[var(--sem-success)]' },
  'closed': { label: 'Closed', bgColor: 'bg-[var(--sem-medium-bg)]', textColor: 'text-[var(--sem-medium)]' },
  'reopened': { label: 'Reopened', bgColor: 'bg-[var(--sem-danger-bg)]', textColor: 'text-[var(--sem-danger)]' },
  'cancelled': { label: 'Cancelled', bgColor: 'bg-[var(--sem-low-bg)]', textColor: 'text-[var(--sem-low)]' },
};

// Define workflow transitions from each status
const WORKFLOW_TRANSITIONS: Record<string, StatusTransition[]> = {
  'open': [
    { action: 'start', targetStatus: 'in-progress', targetLabel: 'IN PROGRESS' },
    { action: 'hold', targetStatus: 'pending', targetLabel: 'PENDING' },
    { action: 'cancel', targetStatus: 'cancelled', targetLabel: 'CANCELLED' },
  ],
  'in-progress': [
    { action: 'resolve', targetStatus: 'resolved', targetLabel: 'RESOLVED' },
    { action: 'hold', targetStatus: 'pending', targetLabel: 'PENDING' },
    { action: 'cancel', targetStatus: 'cancelled', targetLabel: 'CANCELLED' },
  ],
  'pending': [
    { action: 'resume', targetStatus: 'in-progress', targetLabel: 'IN PROGRESS' },
    { action: 'resolve', targetStatus: 'resolved', targetLabel: 'RESOLVED' },
    { action: 'cancel', targetStatus: 'cancelled', targetLabel: 'CANCELLED' },
  ],
  'resolved': [
    { action: 'close', targetStatus: 'closed', targetLabel: 'CLOSED' },
    { action: 'reopen', targetStatus: 'reopened', targetLabel: 'REOPENED' },
  ],
  'closed': [
    { action: 'reopen', targetStatus: 'reopened', targetLabel: 'REOPENED' },
  ],
  'reopened': [
    { action: 'start', targetStatus: 'in-progress', targetLabel: 'IN PROGRESS' },
    { action: 'resolve', targetStatus: 'resolved', targetLabel: 'RESOLVED' },
  ],
  'cancelled': [
    { action: 'reopen', targetStatus: 'reopened', targetLabel: 'REOPENED' },
  ],
};

export function IncidentStatusDropdown({
  currentStatus,
  onStatusChange,
  onAssignToMe,
}: IncidentStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const statusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['open'];
  const transitions = WORKFLOW_TRANSITIONS[currentStatus] || [];

  const handleTransition = (targetStatus: string) => {
    onStatusChange(targetStatus);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-[3px] text-sm font-medium border border-transparent",
                "hover:bg-opacity-80 transition-colors cursor-pointer",
                statusConfig.bgColor,
                statusConfig.textColor
              )}
            >
              {statusConfig.label}
              <ChevronDown className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            align="start" 
            className="w-72 p-0 bg-popover border border-border shadow-lg rounded-md"
            sideOffset={4}
          >
            <div className="py-1">
              {transitions.map((transition, index) => (
                <button
                  key={transition.targetStatus}
                  onClick={() => handleTransition(transition.targetStatus)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted text-left transition-colors"
                >
                  <span className="text-sm text-foreground">{transition.action}</span>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-md",
                      STATUS_CONFIG[transition.targetStatus]?.bgColor || 'bg-muted',
                      STATUS_CONFIG[transition.targetStatus]?.textColor || 'text-muted-foreground'
                    )}>
                      {transition.targetLabel}
                    </span>
                  </div>
                </button>
              ))}
              
              {/* Divider */}
              <div className="border-t border-border my-1" />
              
              {/* View workflow */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center px-4 py-2.5 hover:bg-muted text-left transition-colors"
              >
                <span className="text-sm text-foreground">View workflow</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick action button */}
        <button
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-border hover:bg-muted transition-colors"
          title="Quick actions"
        >
          <Zap className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Assign to me link */}
      {onAssignToMe && (
        <button
          onClick={onAssignToMe}
          className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
        >
          Assign to me
        </button>
      )}
    </div>
  );
}
