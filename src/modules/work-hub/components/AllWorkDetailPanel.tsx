import React from 'react';
import { X, ExternalLink, MoreHorizontal, Zap, Bug, Bookmark, CircleDot, CheckSquare, Link2, ChevronRight, MessageSquare, Paperclip, History, Eye, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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

const typeIcons: Record<string, { icon: React.ReactNode; bgColor: string; textColor: string }> = {
  Feature: { icon: <Zap className="h-4 w-4" />, bgColor: 'bg-purple-100', textColor: 'text-purple-600' },
  Story: { icon: <Bookmark className="h-4 w-4" />, bgColor: 'bg-green-100', textColor: 'text-green-600' },
  Task: { icon: <CheckSquare className="h-4 w-4" />, bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
  Defect: { icon: <Bug className="h-4 w-4" />, bgColor: 'bg-red-100', textColor: 'text-red-600' },
  Subtask: { icon: <CircleDot className="h-4 w-4" />, bgColor: 'bg-cyan-100', textColor: 'text-cyan-600' },
};

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  'Backlog': { bg: 'bg-[#DFE1E6]', text: 'text-[#42526E]', label: 'BACKLOG' },
  'To Do': { bg: 'bg-[#DFE1E6]', text: 'text-[#42526E]', label: 'TO DO' },
  'In Progress': { bg: 'bg-[#DEEBFF]', text: 'text-[#0747A6]', label: 'IN PROGRESS' },
  'Ready for QA': { bg: 'bg-[#EAE6FF]', text: 'text-[#403294]', label: 'READY FOR QA' },
  'In Production': { bg: 'bg-[#E3FCEF]', text: 'text-[#006644]', label: 'IN PRODUCTION' },
  'Done': { bg: 'bg-[#E3FCEF]', text: 'text-[#006644]', label: 'DONE' },
};

export function AllWorkDetailPanel({ item, onClose, onNavigateToParent }: AllWorkDetailPanelProps) {
  if (!item) return null;

  const typeInfo = typeIcons[item.type] || typeIcons['Task'];
  const statusStyle = statusStyles[item.status] || statusStyles['Backlog'];

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-500', 'bg-teal-600'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#DFE1E6]">
        <div className="flex items-center gap-2">
          <div className={cn('w-6 h-6 rounded flex items-center justify-center', typeInfo.bgColor)}>
            <span className={typeInfo.textColor}>{typeInfo.icon}</span>
          </div>
          <span className="text-[14px] font-medium text-[#172B4D]">{item.key}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-[#F4F5F7]">
            <Eye className="h-4 w-4 text-[#6B778C]" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-[#F4F5F7]">
            <Share2 className="h-4 w-4 text-[#6B778C]" />
          </Button>
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

      {/* Parent Breadcrumb */}
      {item.parent && (
        <div className="px-4 py-2 border-b border-[#DFE1E6] bg-slate-50">
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-slate-500">Parent:</span>
            <button
              onClick={() => onNavigateToParent?.(item.parent!, item.parentType || 'Feature')}
              className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
            >
              <Zap className="h-3 w-3" />
              {item.parent}
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Title Section */}
        <div className="px-4 py-4 border-b border-slate-100">
          <h1 className="text-[18px] font-semibold text-[#172B4D] leading-tight mb-3">
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
          <TabsList className="px-4 border-b border-slate-200 bg-white h-10 rounded-none justify-start gap-0">
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
              <div className="text-[11px] font-semibold text-[#6B778C] uppercase mb-2">Description</div>
              <div className="text-[14px] text-[#172B4D] leading-relaxed bg-slate-50 rounded p-3 min-h-[60px]">
                {item.description || (
                  <span className="text-slate-400 italic">Click to add description...</span>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="space-y-4">
              <div className="text-[11px] font-semibold text-[#6B778C] uppercase">Details</div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Assignee */}
                <div>
                  <div className="text-[11px] text-slate-500 mb-1">Assignee</div>
                  <div className="flex items-center gap-2">
                    {item.assignee ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className={cn("text-[10px] text-white", getAvatarColor(item.assignee))}>
                            {getInitials(item.assignee)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[13px] text-[#172B4D]">{item.assignee}</span>
                      </>
                    ) : (
                      <span className="text-[13px] text-slate-400">Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Reporter */}
                <div>
                  <div className="text-[11px] text-slate-500 mb-1">Reporter</div>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className={cn("text-[10px] text-white", getAvatarColor(item.reporter))}>
                        {getInitials(item.reporter)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[13px] text-[#172B4D]">{item.reporter}</span>
                  </div>
                </div>

                {/* Type */}
                <div>
                  <div className="text-[11px] text-slate-500 mb-1">Type</div>
                  <div className="flex items-center gap-2">
                    <div className={cn('w-5 h-5 rounded flex items-center justify-center', typeInfo.bgColor)}>
                      <span className={cn('scale-75', typeInfo.textColor)}>{typeInfo.icon}</span>
                    </div>
                    <span className="text-[13px] text-[#172B4D]">{item.type}</span>
                  </div>
                </div>

                {/* Created */}
                <div>
                  <div className="text-[11px] text-slate-500 mb-1">Created</div>
                  <span className="text-[13px] text-[#172B4D]">{item.created}</span>
                </div>
              </div>

              {/* Links Section */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-[#6B778C] uppercase">Links</div>
                  <Button variant="ghost" size="sm" className="h-6 text-[11px] text-blue-600">
                    <Link2 className="h-3 w-3 mr-1" />
                    Link issue
                  </Button>
                </div>
                
                {item.parent ? (
                  <div className="bg-slate-50 rounded p-3">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">is child of</div>
                    <button
                      onClick={() => onNavigateToParent?.(item.parent!, item.parentType || 'Feature')}
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <div className="w-4 h-4 rounded bg-purple-500 flex items-center justify-center">
                        <Zap className="h-2.5 w-2.5 text-white" />
                      </div>
                      <span className="text-[13px] font-medium">{item.parent}</span>
                      <span className="text-[12px] text-slate-500">
                        {item.parentType === 'Epic' ? '(Epic)' : '(Feature)'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="text-[12px] text-slate-400 italic">No links</div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comments" className="flex-1 overflow-auto mt-0 p-4">
            <div className="text-[13px] text-slate-500 text-center py-8">
              No comments yet
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="flex-1 overflow-auto mt-0 p-4">
            <div className="text-[13px] text-slate-500 text-center py-8">
              No attachments
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-auto mt-0 p-4">
            <div className="text-[13px] text-slate-500 text-center py-8">
              No history available
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
