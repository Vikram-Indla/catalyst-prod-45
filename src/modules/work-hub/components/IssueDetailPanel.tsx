// Issue Detail Panel - Jira-style split-panel issue view
// Based on jira_research_brief.md and reference screenshots (screenshot3, screenshot4, screenshot5, screenshot6)

import React, { useState } from 'react';
import { 
  X, ExternalLink, MoreHorizontal, Eye, Share2, Zap, Settings2,
  ChevronDown, ChevronUp, Download, FileText, Plus, Paperclip, Link as LinkIcon, 
  MessageSquare, Clock
} from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ads';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { 
  ISSUE_ACTIONS, 
  ACTIVITY_TABS, 
  QUICK_COMMENT_ACTIONS,
  type ActivityTab,
  formatFileSize,
  formatIssueDateWithTime 
} from '../types/issueTypes';

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
  fixVersions?: string[];
  reporter?: { name: string; avatar?: string };
  attachments?: { id: string; name: string; size: number; dateAdded: string }[];
  subtasks?: { id: string; key: string; summary: string; status: string; assignee?: { name: string } }[];
  linkedItems?: { id: string; key: string; summary: string; linkType: string }[];
}

interface IssueDetailPanelProps {
  item: WorkItem | null;
  onClose: () => void;
  onFieldChange?: (field: string, value: any) => void;
}

// Type icons — delegated to canonical guardrail (src/lib/jira-issue-type-icons.tsx)

// Status lozenge - NEUTRAL STYLING (no colors per status)
const formatStatusLabel = (status: string): string => status.toUpperCase();

export function IssueDetailPanel({ item, onClose, onFieldChange }: IssueDetailPanelProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<ActivityTab>('comments');
  const [commentText, setCommentText] = useState('');
  const [pinnedFieldsExpanded, setPinnedFieldsExpanded] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(true);

  if (!item) return null;

  // typeInfo now from canonical guardrail
  // Status label - neutral styling
  const statusLabel = formatStatusLabel(item.status);

  // Use item data or empty defaults
  const attachments = item.attachments || [];
  const reporter = item.reporter || null;
  const fixVersions = item.fixVersions || [];

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
        borderLeft: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}` }}>
        <div className="flex items-center gap-2">
          <JiraIssueTypeIcon type={item.type} size={16} />
          <span className="text-[13px] font-medium" style={{ color: isDark ? '#EDEDED' : '#334155' }}>{item.key}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className={cn("h-7 px-2 text-[12px] gap-1", isDark ? "text-[#A1A1A1] hover:bg-[#1A1A1A]" : "text-slate-600 hover:bg-slate-100")}>
            <Eye className="h-3.5 w-3.5" />
            <span>1</span>
          </Button>
          <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-slate-100")}>
            <Share2 className="h-4 w-4" style={{ color: isDark ? '#878787' : '#64748B' }} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-slate-100")}>
                <MoreHorizontal className="h-4 w-4" style={{ color: isDark ? '#878787' : '#64748B' }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={cn("w-56 shadow-lg", isDark ? "bg-[#1A1A1A] border-[#2E2E2E]" : "bg-white border-slate-200")}>
              {ISSUE_ACTIONS.map((action, idx) => (
                <React.Fragment key={action.id}>
                  <DropdownMenuItem className={cn("text-[13px] cursor-pointer", isDark ? "text-[#EDEDED] hover:bg-[#232323]" : "text-slate-700 hover:bg-slate-50")}>
                    {action.label}
                  </DropdownMenuItem>
                  {action.dividerAfter && <DropdownMenuSeparator />}
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-slate-100")} onClick={onClose}>
            <X className="h-4 w-4" style={{ color: isDark ? '#878787' : '#64748B' }} />
          </Button>
        </div>
      </div>

      {/* Two-column layout - matching research brief section 3 */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column - Main content */}
        <ScrollArea className="flex-1 min-w-0">
          <div className="p-5 space-y-6">
            {/* Issue Title */}
            <div>
              <h1 className="text-[20px] font-semibold leading-tight mb-3" style={{ color: isDark ? '#EDEDED' : '#0F172A' }}>
                {item.summary}
              </h1>

              {/* Quick add buttons */}
              <div className="flex items-center gap-2 text-[13px]">
                <button className={cn("px-2 py-1 rounded", isDark ? "text-[#878787] hover:text-[#A1A1A1] hover:bg-[#1A1A1A]" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100")}>
                  <Plus className="h-4 w-4 inline mr-1" />
                  Add
                </button>
                <button className={cn("px-2 py-1 rounded", isDark ? "text-[#878787] hover:text-[#A1A1A1] hover:bg-[#1A1A1A]" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100")}>
                  <LinkIcon className="h-4 w-4 inline mr-1" />
                  Link
                </button>
              </div>
            </div>

            {/* Description section */}
            <div>
              <h3 className="text-[14px] font-semibold mb-2" style={{ color: isDark ? '#EDEDED' : '#0F172A' }}>Description</h3>
              <div className="text-[14px] leading-relaxed" style={{ color: isDark ? '#A1A1A1' : '#334155' }}>
                {item.description || (
                  <p style={{ color: isDark ? '#878787' : '#64748B', fontStyle: 'italic' }}>
                    The system display alignment issue in Competitiveness Program page
                  </p>
                )}
                <div className="mt-4 p-4 rounded text-center" style={{ backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, color: isDark ? '#878787' : '#64748B' }}>
                  <FileText className="h-8 w-8 mx-auto mb-2" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                  <p className="text-[12px]">Embedded content preview</p>
                </div>
              </div>
            </div>

            {/* Attachments section */}
            <div className="rounded" style={{ border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}` }}>
              <button
                className={cn("w-full flex items-center justify-between px-4 py-3 transition-colors", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-slate-50")}
                onClick={() => setAttachmentsExpanded(!attachmentsExpanded)}
              >
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" style={{ color: isDark ? '#878787' : '#64748B' }} />
                  <span className="text-[14px] font-semibold" style={{ color: isDark ? '#EDEDED' : '#0F172A' }}>
                    Attachments <span className="font-normal" style={{ color: isDark ? '#878787' : '#64748B' }}>{attachments.length}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-slate-100")}>
                    <MoreHorizontal className="h-4 w-4" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                  </Button>
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-slate-100")}>
                    <Plus className="h-4 w-4" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                  </Button>
                  {attachmentsExpanded ? (
                    <ChevronUp className="h-4 w-4" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                  ) : (
                    <ChevronDown className="h-4 w-4" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                  )}
                </div>
              </button>

              {attachmentsExpanded && (
                <div style={{ borderTop: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}` }}>
                  <div className="grid grid-cols-[1fr_80px_140px_60px] px-4 py-2 text-[11px] font-medium uppercase" style={{ backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC', borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, color: isDark ? '#878787' : '#64748B' }}>
                    <span>Name</span>
                    <span>Size</span>
                    <span>Date added</span>
                    <span></span>
                  </div>
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className={cn("grid grid-cols-[1fr_80px_140px_60px] px-4 py-2 items-center", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-slate-50")}
                      style={{ borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}` }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 flex-shrink-0" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                        <span className="text-[13px] text-blue-600 hover:underline cursor-pointer truncate">
                          {att.name}
                        </span>
                      </div>
                      <span className="text-[13px]" style={{ color: isDark ? '#A1A1A1' : '#475569' }}>{formatFileSize(att.size)}</span>
                      <span className="text-[13px]" style={{ color: isDark ? '#A1A1A1' : '#475569' }}>{formatIssueDateWithTime(att.dateAdded)}</span>
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className={cn("h-6 w-6", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-slate-100")}>
                          <Eye className="h-3.5 w-3.5" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                        </Button>
                        <Button variant="ghost" size="icon" className={cn("h-6 w-6", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-slate-100")}>
                          <Download className="h-3.5 w-3.5" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subtasks section */}
            <div>
              <h3 className="text-[14px] font-semibold mb-2" style={{ color: isDark ? '#EDEDED' : '#0F172A' }}>Subtasks</h3>
              <button className={cn("text-[13px] px-2 py-1 rounded -ml-2", isDark ? "text-[#878787] hover:text-blue-500 hover:bg-[#1A1A1A]" : "text-slate-500 hover:text-blue-600 hover:bg-slate-50")}>
                <Plus className="h-4 w-4 inline mr-1" />
                Add subtask
              </button>
            </div>

            {/* Linked work items section */}
            <div>
              <h3 className="text-[14px] font-semibold mb-2" style={{ color: isDark ? '#EDEDED' : '#0F172A' }}>Linked work items</h3>
              <button className={cn("text-[13px] px-2 py-1 rounded -ml-2", isDark ? "text-[#878787] hover:text-blue-500 hover:bg-[#1A1A1A]" : "text-slate-500 hover:text-blue-600 hover:bg-slate-50")}>
                <LinkIcon className="h-4 w-4 inline mr-1" />
                Add linked work item
              </button>
            </div>

            {/* Activity section */}
            <div>
              <h3 className="text-[14px] font-semibold mb-3" style={{ color: isDark ? '#EDEDED' : '#0F172A' }}>Activity</h3>

              {/* Activity tabs */}
              <div className="flex items-center gap-1 mb-4 -mx-1 px-1" style={{ borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}` }}>
                {ACTIVITY_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-3 py-2 text-[13px] font-medium transition-colors relative",
                      activeTab === tab.id
                        ? "text-blue-600"
                        : isDark ? "text-[#878787] hover:text-[#A1A1A1]" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                  </button>
                ))}
                <div className="ml-auto">
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-slate-100")}>
                    <Settings2 className="h-4 w-4" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                  </Button>
                </div>
              </div>

              {/* Comment input */}
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0">
                  <Avatar name="Vikram Indla" size="small" />
                </span>
                <div className="flex-1">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className={cn("min-h-[60px] text-[13px] rounded resize-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400", isDark ? "border-[#2E2E2E] bg-[#1A1A1A] text-[#EDEDED]" : "border-slate-200")}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    {QUICK_COMMENT_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        className={cn("px-3 py-1 text-[12px] rounded transition-colors", isDark ? "text-[#A1A1A1] bg-[#292929] hover:bg-[#2E2E2E]" : "text-slate-600 bg-slate-100 hover:bg-slate-200")}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: isDark ? '#878787' : '#94A3B8' }}>
                    <span className="font-medium">Pro tip:</span> press <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: isDark ? '#292929' : '#F1F5F9' }}>M</kbd> to comment
                  </p>
                </div>
              </div>

              {item.comments > 0 && (
                <div className="text-[13px] text-center py-4" style={{ color: isDark ? '#878787' : '#64748B' }}>
                  {item.comments} previous comment{item.comments > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Right sidebar */}
        <div className="w-[260px] flex-shrink-0" style={{ borderLeft: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, backgroundColor: isDark ? '#1A1A1A' : 'rgba(248,250,252,0.5)' }}>
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Status badge */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="catalyst-status inline-flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-medium uppercase tracking-wide cursor-pointer bg-muted/50 text-foreground border border-border">
                      {statusLabel}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className={cn("w-48", isDark ? "bg-[#1A1A1A] border-[#2E2E2E]" : "bg-white")}>
                    {['Backlog', 'To Do', 'In Progress', 'In Requirement', 'In Production', 'In QA', 'Ready for QA', 'Done', 'Closed', 'Blocked'].map((status) => (
                      <DropdownMenuItem key={status} className="cursor-pointer">
                        <span className="catalyst-status inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-muted/50 text-foreground border border-border">
                          {status.toUpperCase()}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-slate-100")}>
                  <Zap className="h-4 w-4" style={{ color: isDark ? '#878787' : '#64748B' }} />
                </Button>
                <span className="text-[11px] px-2 py-1 rounded" style={{ color: isDark ? '#A1A1A1' : '#64748B', backgroundColor: isDark ? '#292929' : '#F1F5F9' }}>
                  Improve Production Incident
                </span>
              </div>

              {/* Your pinned fields - collapsible */}
              <div className="rounded" style={{ border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }}>
                <button
                  className={cn("w-full flex items-center justify-between px-3 py-2", isDark ? "hover:bg-[#232323]" : "hover:bg-slate-50")}
                  onClick={() => setPinnedFieldsExpanded(!pinnedFieldsExpanded)}
                >
                  <span className="text-[12px] font-semibold" style={{ color: isDark ? '#EDEDED' : '#334155' }}>Your pinned fields</span>
                  {pinnedFieldsExpanded ? (
                    <ChevronUp className="h-4 w-4" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                  ) : (
                    <ChevronDown className="h-4 w-4" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                  )}
                </button>
                {pinnedFieldsExpanded && (
                  <div className="px-3 pb-3 pt-1" style={{ borderTop: `1px solid ${isDark ? '#292929' : '#F1F5F9'}` }}>
                    <div className="text-[11px] mb-1" style={{ color: isDark ? '#878787' : '#64748B' }}>Fix versions</div>
                    <div className="text-[13px]" style={{ color: isDark ? '#EDEDED' : '#334155' }}>
                      {fixVersions.join(', ') || 'None'}
                    </div>
                  </div>
                )}
              </div>

              {/* Details section - collapsible */}
              <div className="rounded" style={{ border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }}>
                <button
                  className={cn("w-full flex items-center justify-between px-3 py-2", isDark ? "hover:bg-[#232323]" : "hover:bg-slate-50")}
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                >
                  <span className="text-[12px] font-semibold" style={{ color: isDark ? '#EDEDED' : '#334155' }}>Details</span>
                  {detailsExpanded ? (
                    <ChevronUp className="h-4 w-4" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                  ) : (
                    <ChevronDown className="h-4 w-4" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                  )}
                </button>
                {detailsExpanded && (
                  <div className="px-3 pb-3 space-y-3 pt-3" style={{ borderTop: `1px solid ${isDark ? '#292929' : '#F1F5F9'}` }}>
                    {/* Assignee */}
                    <div>
                      <div className="text-[11px] mb-1" style={{ color: isDark ? '#878787' : '#64748B' }}>Assignee</div>
                      <div className="flex items-center gap-2">
                        {item.assignee ? (
                          <>
                            <Avatar name={item.assignee.name} size="xsmall" />
                            <div>
                              <div className="text-[13px]" style={{ color: isDark ? '#EDEDED' : '#334155' }}>{item.assignee.name}</div>
                              <button className="text-[11px] text-blue-600 hover:underline">Assign to me</button>
                            </div>
                          </>
                        ) : (
                          <span className="text-[13px]" style={{ color: isDark ? '#878787' : '#64748B' }}>Unassigned</span>
                        )}
                      </div>
                    </div>

                    {/* Reporter */}
                    <div>
                      <div className="text-[11px] mb-1" style={{ color: isDark ? '#878787' : '#64748B' }}>Reporter</div>
                      <div className="flex items-center gap-2">
                        <Avatar name={reporter.name} size="xsmall" />
                        <span className="text-[13px]" style={{ color: isDark ? '#EDEDED' : '#334155' }}>{reporter.name}</span>
                      </div>
                    </div>

                    {/* Service Now# (custom field) */}
                    <div>
                      <div className="text-[11px] mb-1" style={{ color: isDark ? '#878787' : '#64748B' }}>Service Now#</div>
                      <button className="text-[13px]" style={{ color: isDark ? '#878787' : '#94A3B8' }}>Add text</button>
                    </div>

                    {/* Priority */}
                    <div>
                      <div className="text-[11px] mb-1" style={{ color: isDark ? '#878787' : '#64748B' }}>Priority</div>
                      <div className="flex items-center gap-1">
                        <span className="text-orange-500">--</span>
                        <span className="text-[13px]" style={{ color: isDark ? '#EDEDED' : '#334155' }}>{item.priority}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Automation section */}
              <div className="rounded" style={{ border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }}>
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold" style={{ color: isDark ? '#EDEDED' : '#334155' }}>Automation</span>
                    <Zap className="h-3.5 w-3.5" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                  </div>
                  <span className="text-[11px]" style={{ color: isDark ? '#878787' : '#64748B' }}>Rule executions</span>
                </div>
                <div className="px-3 pb-2 pt-2" style={{ borderTop: `1px solid ${isDark ? '#292929' : '#F1F5F9'}` }}>
                  <button className="text-[12px] text-blue-600 hover:underline flex items-center gap-1">
                    <Settings2 className="h-3.5 w-3.5" />
                    Configure
                  </button>
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-[11px] space-y-1 px-1" style={{ color: isDark ? '#878787' : '#94A3B8' }}>
                <div>Created {formatIssueDateWithTime(item.created)}</div>
                <div>Updated {formatIssueDateWithTime(item.updated)}</div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export default IssueDetailPanel;
