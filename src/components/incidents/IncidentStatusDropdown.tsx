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

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  'open': { label: 'Open', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  'in-progress': { label: 'In Progress', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  'pending': { label: 'Pending', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
  'resolved': { label: 'Resolved', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  'closed': { label: 'Closed', bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
  'reopened': { label: 'Reopened', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  'cancelled': { label: 'Cancelled', bgColor: 'bg-gray-200', textColor: 'text-gray-500' },
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
            className="w-72 p-0 bg-white border border-[#DFE1E6] shadow-lg rounded-[3px]"
            sideOffset={4}
          >
            <div className="py-1">
              {transitions.map((transition, index) => (
                <button
                  key={transition.targetStatus}
                  onClick={() => handleTransition(transition.targetStatus)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F4F5F7] text-left transition-colors"
                >
                  <span className="text-[14px] text-[#42526E]">{transition.action}</span>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-[#8993A4]" />
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-[3px]",
                      STATUS_CONFIG[transition.targetStatus]?.bgColor || 'bg-gray-100',
                      STATUS_CONFIG[transition.targetStatus]?.textColor || 'text-gray-600'
                    )}>
                      {transition.targetLabel}
                    </span>
                  </div>
                </button>
              ))}
              
              {/* Divider */}
              <div className="border-t border-[#DFE1E6] my-1" />
              
              {/* View workflow */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center px-4 py-2.5 hover:bg-[#F4F5F7] text-left transition-colors"
              >
                <span className="text-[14px] text-[#42526E]">View workflow</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick action button */}
        <button
          className="inline-flex items-center justify-center w-8 h-8 rounded-[3px] border border-[#DFE1E6] hover:bg-[#F4F5F7] transition-colors"
          title="Quick actions"
        >
          <Zap className="w-4 h-4 text-[#42526E]" />
        </button>
      </div>

      {/* Assign to me link */}
      {onAssignToMe && (
        <button
          onClick={onAssignToMe}
          className="text-[14px] text-[#0052CC] hover:text-[#0065FF] hover:underline transition-colors"
        >
          Assign to me
        </button>
      )}
    </div>
  );
}
