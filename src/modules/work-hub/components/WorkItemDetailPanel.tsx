import React from 'react';
import { X, ExternalLink, MoreHorizontal, Zap, Bug, Bookmark, CircleDot, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WorkItem {
  id: string;
  type: string;
  key: string;
  summary: string;
  status: string;
  comments: number;
  assignee: { name: string; avatar?: string } | null;
  dueDate: string | null;
  priority: string;
  labels: string[];
  created: string;
  updated: string;
  hasChildren?: boolean;
  parentKey?: string;
  parentSummary?: string;
  description?: string;
}

interface WorkItemDetailPanelProps {
  item: WorkItem | null;
  onClose: () => void;
}

const typeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  Feature: { icon: <Zap className="h-4 w-4" />, color: 'text-purple-500' },
  Story: { icon: <Bookmark className="h-4 w-4" />, color: 'text-green-600' },
  Task: { icon: <CircleDot className="h-4 w-4" />, color: 'text-blue-500' },
  Defect: { icon: <Bug className="h-4 w-4" />, color: 'text-red-500' },
  Subtask: { icon: <CircleDot className="h-4 w-4" />, color: 'text-cyan-500' },
  Incident: { icon: <Settings2 className="h-4 w-4" />, color: 'text-orange-500' },
};

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  'Backlog': { bg: 'bg-[#DFE1E6]', text: 'text-[#42526E]', label: 'BACKLOG' },
  'To Do': { bg: 'bg-[#DFE1E6]', text: 'text-[#42526E]', label: 'TO DO' },
  'In Progress': { bg: 'bg-[#DEEBFF]', text: 'text-[#0747A6]', label: 'IN PROGRESS' },
  'In Requirement': { bg: 'bg-[#DEEBFF]', text: 'text-[#0747A6]', label: 'IN REQUIREMENTS' },
  'In Production': { bg: 'bg-[#EAE6FF]', text: 'text-[#403294]', label: 'IN PRODUCTION' },
  'Done': { bg: 'bg-[#E3FCEF]', text: 'text-[#006644]', label: 'DONE' },
  'Closed': { bg: 'bg-[#DFE1E6]', text: 'text-[#42526E]', label: 'CLOSED' },
  'Blocked': { bg: 'bg-[#FFEBE6]', text: 'text-[#BF2600]', label: 'BLOCKED' },
};

export function WorkItemDetailPanel({ item, onClose }: WorkItemDetailPanelProps) {
  if (!item) return null;

  const typeInfo = typeIcons[item.type] || typeIcons['Task'];
  const statusStyle = statusStyles[item.status] || statusStyles['Backlog'];

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-500', 'bg-teal-600'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <div className="w-[440px] border-l border-[#DFE1E6] bg-white h-full flex flex-col" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#DFE1E6]">
        <div className="flex items-center gap-2">
          <span className={typeInfo.color}>{typeInfo.icon}</span>
          <span className="text-[13px] font-medium text-[#172B4D]">Jira work item</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-[#F4F5F7]">
            <ExternalLink className="h-4 w-4 text-[#6B778C]" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-[#F4F5F7]">
            <MoreHorizontal className="h-4 w-4 text-[#6B778C]" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-[#F4F5F7]" onClick={onClose}>
            <X className="h-4 w-4 text-[#6B778C]" />
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      {item.parentKey && (
        <div className="px-4 py-2 border-b border-[#DFE1E6] text-[12px]">
          <span className="text-[#6B778C]">{item.parentKey}</span>
          <span className="text-[#6B778C] mx-1">/</span>
          <span className="text-[#0052CC] hover:underline cursor-pointer">{item.key}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Title & Status */}
        <div className="mb-4">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-[11px] text-[#6B778C]">{item.key}</span>
            <span className="text-[11px] text-[#6B778C]">•</span>
            <span className="text-[11px] text-[#6B778C]">{item.comments} comments</span>
          </div>
          <h2 className="text-[20px] font-medium text-[#172B4D] leading-tight mb-3">
            {item.summary}
          </h2>
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center px-2 py-1 rounded-[3px] text-[11px] font-bold uppercase tracking-wide",
              statusStyle.bg, statusStyle.text
            )}>
              {statusStyle.label}
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-[12px] text-[#6B778C] hover:bg-[#F4F5F7]">
              + Add
            </Button>
          </div>
        </div>

        {/* Parent */}
        {item.parentKey && item.parentSummary && (
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-[#6B778C] uppercase mb-1">Parent</div>
            <div className="flex items-center gap-2 p-2 bg-[#F4F5F7] rounded-[3px]">
              <span className="text-purple-500"><Zap className="h-4 w-4" /></span>
              <span className="text-[13px] text-[#0052CC] hover:underline cursor-pointer">
                {item.parentKey} {item.parentSummary}
              </span>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-4">
          <div className="text-[11px] font-semibold text-[#6B778C] uppercase mb-2">Description</div>
          <div className="text-[14px] text-[#172B4D] leading-relaxed">
            {item.description || (
              <span className="text-[#6B778C] italic">No description provided.</span>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="border-t border-[#DFE1E6] pt-4">
          <div className="text-[11px] font-semibold text-[#6B778C] uppercase mb-3">Details</div>
          
          <div className="space-y-3">
            {/* Assignee */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#6B778C]">Assignee</span>
              <div className="flex items-center gap-2">
                {item.assignee ? (
                  <>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className={cn("text-[10px] text-white", getAvatarColor(item.assignee.name))}>
                        {getInitials(item.assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[13px] text-[#172B4D]">{item.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-[13px] text-[#6B778C]">Unassigned</span>
                )}
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#6B778C]">Priority</span>
              <span className="text-[13px] text-[#172B4D]">{item.priority}</span>
            </div>

            {/* Due Date */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#6B778C]">Due date</span>
              <span className="text-[13px] text-[#172B4D]">
                {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}
              </span>
            </div>

            {/* Labels */}
            {item.labels.length > 0 && (
              <div className="flex items-start justify-between">
                <span className="text-[13px] text-[#6B778C]">Labels</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {item.labels.map((label) => (
                    <Badge key={label} variant="secondary" className="text-[11px] bg-[#DFE1E6] text-[#42526E]">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
