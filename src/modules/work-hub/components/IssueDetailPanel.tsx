// Issue Detail Panel - Jira-style split-panel issue view
// Based on jira_research_brief.md and reference screenshots (screenshot3, screenshot4, screenshot5, screenshot6)

import React, { useState } from 'react';
import { 
  X, ExternalLink, MoreHorizontal, Eye, Share2, Zap, Bug, Bookmark, CircleDot, Settings2,
  ChevronDown, ChevronUp, Download, FileText, Plus, Paperclip, Link as LinkIcon, 
  MessageSquare, Clock, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

// Type icons matching Jira
const typeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  Feature: { icon: <Zap className="h-4 w-4" />, color: 'text-purple-500' },
  Story: { icon: <Bookmark className="h-4 w-4" />, color: 'text-green-600' },
  Task: { icon: <CircleDot className="h-4 w-4" />, color: 'text-blue-500' },
  Defect: { icon: <Bug className="h-4 w-4" />, color: 'text-red-500' },
  Subtask: { icon: <CircleDot className="h-4 w-4" />, color: 'text-cyan-500' },
  Incident: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-500' },
};

// Jira-style status lozenge styles
const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  'Backlog': { bg: 'bg-slate-200', text: 'text-slate-700', label: 'BACKLOG' },
  'To Do': { bg: 'bg-slate-200', text: 'text-slate-700', label: 'TO DO' },
  'In Progress': { bg: 'bg-blue-600', text: 'text-white', label: 'IN PROGRESS' },
  'In Requirement': { bg: 'bg-blue-600', text: 'text-white', label: 'IN REQUIREMENTS' },
  'In Production': { bg: 'bg-green-600', text: 'text-white', label: 'IN PRODUCTION' },
  'In QA': { bg: 'bg-green-600', text: 'text-white', label: 'IN QA' },
  'Ready for QA': { bg: 'bg-amber-500', text: 'text-white', label: 'READY FOR QA' },
  'Done': { bg: 'bg-green-600', text: 'text-white', label: 'DONE' },
  'Closed': { bg: 'bg-slate-200', text: 'text-slate-700', label: 'CLOSED' },
  'Blocked': { bg: 'bg-red-600', text: 'text-white', label: 'BLOCKED' },
};

export function IssueDetailPanel({ item, onClose, onFieldChange }: IssueDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>('comments');
  const [commentText, setCommentText] = useState('');
  const [pinnedFieldsExpanded, setPinnedFieldsExpanded] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(true);

  if (!item) return null;

  const typeInfo = typeIcons[item.type] || typeIcons['Task'];
  const statusStyle = statusStyles[item.status] || statusStyles['Backlog'];

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-500', 'bg-teal-600', 'bg-pink-500'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  // Mock attachments data
  const attachments = item.attachments || [
    { id: '1', name: 'image-20251207-121059.png', size: 181248, dateAdded: '2025-12-07T17:11:00.000Z' }
  ];

  // Mock reporter
  const reporter = item.reporter || { name: 'Yazeed Daraz' };

  // Mock fix versions  
  const fixVersions = item.fixVersions || ['ICP-Sprint 2.8- 04 Dec 25'];

  return (
    <div 
      className="w-full h-full flex flex-col bg-white border-l border-slate-200"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* Header - matching screenshot3_issue_detail.png */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={typeInfo.color}>{typeInfo.icon}</span>
          <span className="text-[13px] font-medium text-slate-700">{item.key}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px] text-slate-600 hover:bg-slate-100 gap-1">
            <Eye className="h-3.5 w-3.5" />
            <span>1</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100">
            <Share2 className="h-4 w-4 text-slate-500" />
          </Button>
          {/* Actions Menu - matching screenshot5_actions_menu.png */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100">
                <MoreHorizontal className="h-4 w-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg border border-slate-200">
              {ISSUE_ACTIONS.map((action, idx) => (
                <React.Fragment key={action.id}>
                  <DropdownMenuItem className="text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
                    {action.label}
                  </DropdownMenuItem>
                  {action.dividerAfter && <DropdownMenuSeparator />}
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={onClose}>
            <X className="h-4 w-4 text-slate-500" />
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
              <h1 className="text-[20px] font-semibold text-slate-900 leading-tight mb-3">
                {item.summary}
              </h1>
              
              {/* Quick add buttons */}
              <div className="flex items-center gap-2 text-[13px]">
                <button className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded">
                  <Plus className="h-4 w-4 inline mr-1" />
                  Add
                </button>
                <button className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded">
                  <LinkIcon className="h-4 w-4 inline mr-1" />
                  Link
                </button>
              </div>
            </div>

            {/* Description section - matching research brief */}
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 mb-2">Description</h3>
              <div className="text-[14px] text-slate-700 leading-relaxed">
                {item.description || (
                  <p className="text-slate-500 italic">
                    The system display alignment issue in Competitiveness Program page
                  </p>
                )}
                {/* Placeholder for embedded screenshot like in screenshot3 */}
                <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200 text-center text-slate-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-[12px]">Embedded content preview</p>
                </div>
              </div>
            </div>

            {/* Attachments section - matching screenshot4_attachments.png */}
            <div className="border border-slate-200 rounded">
              <button 
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                onClick={() => setAttachmentsExpanded(!attachmentsExpanded)}
              >
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-slate-500" />
                  <span className="text-[14px] font-semibold text-slate-900">
                    Attachments <span className="font-normal text-slate-500">{attachments.length}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100">
                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100">
                    <Plus className="h-4 w-4 text-slate-400" />
                  </Button>
                  {attachmentsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>
              
              {attachmentsExpanded && (
                <div className="border-t border-slate-200">
                  {/* Attachments table header */}
                  <div className="grid grid-cols-[1fr_80px_140px_60px] px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-medium text-slate-500 uppercase">
                    <span>Name</span>
                    <span>Size</span>
                    <span>Date added</span>
                    <span></span>
                  </div>
                  {/* Attachments rows */}
                  {attachments.map((att) => (
                    <div 
                      key={att.id} 
                      className="grid grid-cols-[1fr_80px_140px_60px] px-4 py-2 border-b border-slate-100 hover:bg-slate-50 items-center"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span className="text-[13px] text-blue-600 hover:underline cursor-pointer truncate">
                          {att.name}
                        </span>
                      </div>
                      <span className="text-[13px] text-slate-600">{formatFileSize(att.size)}</span>
                      <span className="text-[13px] text-slate-600">{formatIssueDateWithTime(att.dateAdded)}</span>
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-100">
                          <Eye className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-100">
                          <Download className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subtasks section */}
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 mb-2">Subtasks</h3>
              <button className="text-[13px] text-slate-500 hover:text-blue-600 hover:bg-slate-50 px-2 py-1 rounded -ml-2">
                <Plus className="h-4 w-4 inline mr-1" />
                Add subtask
              </button>
            </div>

            {/* Linked work items section */}
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 mb-2">Linked work items</h3>
              <button className="text-[13px] text-slate-500 hover:text-blue-600 hover:bg-slate-50 px-2 py-1 rounded -ml-2">
                <LinkIcon className="h-4 w-4 inline mr-1" />
                Add linked work item
              </button>
            </div>

            {/* Activity section - matching research brief and screenshots */}
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Activity</h3>
              
              {/* Activity tabs */}
              <div className="flex items-center gap-1 mb-4 border-b border-slate-200 -mx-1 px-1">
                {ACTIVITY_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-3 py-2 text-[13px] font-medium transition-colors relative",
                      activeTab === tab.id 
                        ? "text-blue-600" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                  </button>
                ))}
                <div className="ml-auto">
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100">
                    <Settings2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              </div>

              {/* Comment input - matching screenshot4 */}
              <div className="flex items-start gap-3 mb-4">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-[11px] text-white bg-green-600">VI</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea 
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[60px] text-[13px] border-slate-200 rounded resize-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  />
                  {/* Quick action buttons - matching screenshot */}
                  <div className="flex items-center gap-2 mt-2">
                    {QUICK_COMMENT_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        className="px-3 py-1 text-[12px] text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    <span className="font-medium">Pro tip:</span> press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">M</kbd> to comment
                  </p>
                </div>
              </div>

              {/* Existing comments would go here */}
              {item.comments > 0 && (
                <div className="text-[13px] text-slate-500 text-center py-4">
                  {item.comments} previous comment{item.comments > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Right sidebar - matching screenshot3, screenshot4 */}
        <div className="w-[260px] border-l border-slate-200 bg-slate-50/50 flex-shrink-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Status badge - prominent at top */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "inline-flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wide cursor-pointer transition-colors",
                      statusStyle.bg, statusStyle.text
                    )}>
                      {statusStyle.label}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 bg-white">
                    {Object.entries(statusStyles).map(([status, style]) => (
                      <DropdownMenuItem key={status} className="cursor-pointer">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          style.bg, style.text
                        )}>
                          {style.label}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100">
                  <Zap className="h-4 w-4 text-slate-500" />
                </Button>
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  ✨ Improve Production Incident
                </span>
              </div>

              {/* Your pinned fields - collapsible */}
              <div className="border border-slate-200 rounded bg-white">
                <button 
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50"
                  onClick={() => setPinnedFieldsExpanded(!pinnedFieldsExpanded)}
                >
                  <span className="text-[12px] font-semibold text-slate-700">Your pinned fields</span>
                  {pinnedFieldsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {pinnedFieldsExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-100">
                    <div className="text-[11px] text-slate-500 mb-1">Fix versions</div>
                    <div className="text-[13px] text-slate-700">
                      {fixVersions.join(', ') || 'None'}
                    </div>
                  </div>
                )}
              </div>

              {/* Details section - collapsible */}
              <div className="border border-slate-200 rounded bg-white">
                <button 
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50"
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                >
                  <span className="text-[12px] font-semibold text-slate-700">Details</span>
                  {detailsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {detailsExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3">
                    {/* Assignee */}
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1">Assignee</div>
                      <div className="flex items-center gap-2">
                        {item.assignee ? (
                          <>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className={cn("text-[9px] text-white", getAvatarColor(item.assignee.name))}>
                                {getInitials(item.assignee.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-[13px] text-slate-700">{item.assignee.name}</div>
                              <button className="text-[11px] text-blue-600 hover:underline">Assign to me</button>
                            </div>
                          </>
                        ) : (
                          <span className="text-[13px] text-slate-500">Unassigned</span>
                        )}
                      </div>
                    </div>

                    {/* Reporter */}
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1">Reporter</div>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className={cn("text-[9px] text-white", getAvatarColor(reporter.name))}>
                            {getInitials(reporter.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[13px] text-slate-700">{reporter.name}</span>
                      </div>
                    </div>

                    {/* Service Now# (custom field) */}
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1">Service Now#</div>
                      <button className="text-[13px] text-slate-400 hover:text-slate-600">Add text</button>
                    </div>

                    {/* Priority */}
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1">Priority</div>
                      <div className="flex items-center gap-1">
                        <span className="text-orange-500">—</span>
                        <span className="text-[13px] text-slate-700">{item.priority}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Automation section */}
              <div className="border border-slate-200 rounded bg-white">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-slate-700">Automation</span>
                    <Zap className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <span className="text-[11px] text-slate-500">Rule executions</span>
                </div>
                <div className="px-3 pb-2 border-t border-slate-100 pt-2">
                  <button className="text-[12px] text-blue-600 hover:underline flex items-center gap-1">
                    <Settings2 className="h-3.5 w-3.5" />
                    Configure
                  </button>
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-[11px] text-slate-400 space-y-1 px-1">
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
