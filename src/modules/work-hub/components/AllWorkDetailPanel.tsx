import React from 'react';
import { X, ExternalLink, MoreHorizontal, Link2, ChevronRight, MessageSquare, Paperclip, History, Eye, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ads';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useTheme } from '@/hooks/useTheme';

interface WorkItem {
  id: string;
  type: 'Feature' | 'Story' | 'Task' | 'Defect' | 'Subtask';
  key: string;
  summary: string;
  status: string;
  statusCategory: 'todo' | 'in_progress' | 'done';
  reporter: string;
  assignee: string | null;
  created: string;
  parent: string | null;
  parentType?: 'Feature' | 'Epic';
  children?: WorkItem[];
  description?: string;
}

interface AllWorkDetailPanelProps {
  item: WorkItem | null;
  onClose: () => void;
  onNavigateToParent?: (parentKey: string, parentType: 'Feature' | 'Epic') => void;
}

// Type icons now use canonical JiraIssueTypeIcon component

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  'Backlog': { bg: 'bg-[#DFE1E6]', text: 'text-[#42526E]', label: 'BACKLOG' },
  'To Do': { bg: 'bg-[#DFE1E6]', text: 'text-[#42526E]', label: 'TO DO' },
  'In Progress': { bg: 'bg-[#0C66E4]', text: 'text-white', label: 'IN PROGRESS' },
  'Ready for QA': { bg: 'bg-[#EAE6FF]', text: 'text-[#403294]', label: 'READY FOR QA' },
  'In Production': { bg: 'bg-[#1B7F37]', text: 'text-white', label: 'IN PRODUCTION' },
  'Done': { bg: 'bg-[#1B7F37]', text: 'text-white', label: 'DONE' },
};

export function AllWorkDetailPanel({ item, onClose, onNavigateToParent }: AllWorkDetailPanelProps) {
  const { isDark } = useTheme();
  if (!item) return null;

  // typeInfo no longer needed — using JiraIssueTypeIcon directly
  const statusStyle = statusStyles[item.status] || statusStyles['Backlog'];

  return (
    <div
      className="flex flex-col h-full"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
        color: isDark ? '#EDEDED' : '#172B4D',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#DFE1E6'}` }}
      >
        <div className="flex items-center gap-2">
          <JiraIssueTypeIcon type={item.type} size={20} />
          <span className="text-[14px] font-medium" style={{ color: isDark ? '#EDEDED' : '#172B4D' }}>{item.key}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-[#F4F5F7]")}>
            <Eye className="h-4 w-4" style={{ color: isDark ? '#878787' : '#6B778C' }} />
          </Button>
          <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-[#F4F5F7]")}>
            <Share2 className="h-4 w-4" style={{ color: isDark ? '#878787' : '#6B778C' }} />
          </Button>
          <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-[#F4F5F7]")}>
            <ExternalLink className="h-4 w-4" style={{ color: isDark ? '#878787' : '#6B778C' }} />
          </Button>
          <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-[#F4F5F7]")}>
            <MoreHorizontal className="h-4 w-4" style={{ color: isDark ? '#878787' : '#6B778C' }} />
          </Button>
          <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-[#F4F5F7]")} onClick={onClose}>
            <X className="h-4 w-4" style={{ color: isDark ? '#878787' : '#6B778C' }} />
          </Button>
        </div>
      </div>

      {/* Parent Breadcrumb */}
      {item.parent && (
        <div
          className="px-4 py-2"
          style={{
            borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#DFE1E6'}`,
            backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC',
          }}
        >
          <div className="flex items-center gap-2 text-[12px]">
            <span style={{ color: isDark ? '#878787' : '#64748B' }}>Parent:</span>
            <button
              onClick={() => onNavigateToParent?.(item.parent!, item.parentType || 'Feature')}
              className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
            >
              <JiraIssueTypeIcon type={item.parentType || 'Epic'} size={12} />
              {item.parent}
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Title Section */}
        <div className="px-4 py-4" style={{ borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#F1F5F9'}` }}>
          <h1 className="text-[18px] font-semibold leading-tight mb-3" style={{ color: isDark ? '#EDEDED' : '#172B4D' }}>
            {item.summary}
          </h1>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center px-2 py-1 rounded-[3px] text-[10px] font-bold uppercase tracking-wide",
              statusStyle.bg, statusStyle.text
            )}>
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <TabsList
            className="px-4 h-10 rounded-none justify-start gap-0"
            style={{
              borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
            }}
          >
            <TabsTrigger
              value="details"
              className="text-[13px] data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="comments"
              className="text-[13px] data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Comments
            </TabsTrigger>
            <TabsTrigger
              value="attachments"
              className="text-[13px] data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4"
            >
              <Paperclip className="h-3.5 w-3.5 mr-1.5" />
              Attachments
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-[13px] data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4"
            >
              <History className="h-3.5 w-3.5 mr-1.5" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-auto mt-0 p-4">
            {/* Description */}
            <div className="mb-6">
              <div className="text-[11px] font-semibold uppercase mb-2" style={{ color: isDark ? '#878787' : '#6B778C' }}>Description</div>
              <div
                className="text-[14px] leading-relaxed rounded p-3 min-h-[60px]"
                style={{
                  backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC',
                  color: isDark ? '#EDEDED' : '#172B4D',
                  border: isDark ? '1px solid #2E2E2E' : 'none',
                }}
              >
                {item.description || (
                  <span style={{ color: isDark ? '#878787' : '#94A3B8', fontStyle: 'italic' }}>Click to add description...</span>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="space-y-4">
              <div className="text-[11px] font-semibold uppercase" style={{ color: isDark ? '#878787' : '#6B778C' }}>Details</div>

              <div className="grid grid-cols-2 gap-4">
                {/* Assignee */}
                <div>
                  <div className="text-[11px] mb-1" style={{ color: isDark ? '#878787' : '#64748B' }}>Assignee</div>
                  <div className="flex items-center gap-2">
                    {item.assignee ? (
                      <>
                        <Avatar name={item.assignee} size="xsmall" />
                        <span className="text-[13px]" style={{ color: isDark ? '#EDEDED' : '#172B4D' }}>{item.assignee}</span>
                      </>
                    ) : (
                      <span className="text-[13px]" style={{ color: isDark ? '#878787' : '#94A3B8' }}>Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Reporter */}
                <div>
                  <div className="text-[11px] mb-1" style={{ color: isDark ? '#878787' : '#64748B' }}>Reporter</div>
                  <div className="flex items-center gap-2">
                    <Avatar name={item.reporter} size="xsmall" />
                    <span className="text-[13px]" style={{ color: isDark ? '#EDEDED' : '#172B4D' }}>{item.reporter}</span>
                  </div>
                </div>

                {/* Type */}
                <div>
                  <div className="text-[11px] mb-1" style={{ color: isDark ? '#878787' : '#64748B' }}>Type</div>
                  <div className="flex items-center gap-2">
                    <JiraIssueTypeIcon type={item.type} size={16} />
                    <span className="text-[13px]" style={{ color: isDark ? '#EDEDED' : '#172B4D' }}>{item.type}</span>
                  </div>
                </div>

                {/* Created */}
                <div>
                  <div className="text-[11px] mb-1" style={{ color: isDark ? '#878787' : '#64748B' }}>Created</div>
                  <span className="text-[13px]" style={{ color: isDark ? '#EDEDED' : '#172B4D' }}>{item.created}</span>
                </div>
              </div>

              {/* Links Section */}
              <div className="pt-4" style={{ borderTop: `1px solid ${isDark ? '#2E2E2E' : '#F1F5F9'}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold uppercase" style={{ color: isDark ? '#878787' : '#6B778C' }}>Links</div>
                  <Button variant="ghost" size="sm" className="h-6 text-[11px] text-blue-600">
                    <Link2 className="h-3 w-3 mr-1" />
                    Link issue
                  </Button>
                </div>

                {item.parent ? (
                  <div
                    className="rounded p-3"
                    style={{
                      backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC',
                      border: isDark ? '1px solid #2E2E2E' : 'none',
                    }}
                  >
                    <div className="text-[10px] uppercase mb-1" style={{ color: isDark ? '#878787' : '#64748B' }}>is child of</div>
                    <button
                      onClick={() => onNavigateToParent?.(item.parent!, item.parentType || 'Feature')}
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <JiraIssueTypeIcon type={item.parentType || 'Epic'} size={16} />
                      <span className="text-[13px] font-medium">{item.parent}</span>
                      <span className="text-[12px]" style={{ color: isDark ? '#878787' : '#64748B' }}>
                        {item.parentType === 'Epic' ? '(Epic)' : '(Feature)'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="text-[12px] italic" style={{ color: isDark ? '#878787' : '#94A3B8' }}>No links</div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comments" className="flex-1 overflow-auto mt-0 p-4">
            <div className="text-[13px] text-center py-8" style={{ color: isDark ? '#878787' : '#64748B' }}>
              No comments yet
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="flex-1 overflow-auto mt-0 p-4">
            <div className="text-[13px] text-center py-8" style={{ color: isDark ? '#878787' : '#64748B' }}>
              No attachments
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-auto mt-0 p-4">
            <div className="text-[13px] text-center py-8" style={{ color: isDark ? '#878787' : '#64748B' }}>
              No history available
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
