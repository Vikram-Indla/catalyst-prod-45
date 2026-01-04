/**
 * Defect Detail Panel - Slides in from right
 */

import React, { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  X, 
  Edit, 
  Flame, 
  AlertTriangle, 
  Info, 
  Minus,
  Link2,
  ExternalLink,
  Paperclip,
  MessageSquare,
  Clock,
  User,
  Send,
  FileText,
  ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Defect, DefectSeverity, DefectStatus } from '../../api/types';

interface DefectDetailPanelProps {
  defect: Defect;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: DefectStatus) => void;
  onAddComment?: (comment: string) => void;
  comments?: Array<{
    id: string;
    content: string;
    author: { id: string; full_name?: string; avatar_url?: string };
    created_at: string;
    is_system?: boolean;
  }>;
  isLoading?: boolean;
}

const SEVERITY_CONFIG: Record<DefectSeverity, { 
  label: string; 
  icon: React.ElementType;
  className: string;
}> = {
  critical: { label: 'Critical', icon: Flame, className: 'bg-danger text-white' },
  major: { label: 'Major', icon: AlertTriangle, className: 'bg-warning text-white' },
  minor: { label: 'Minor', icon: Info, className: 'bg-yellow-500 text-white' },
  trivial: { label: 'Trivial', icon: Minus, className: 'bg-muted text-muted-foreground' },
};

const STATUS_CONFIG: Record<DefectStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'border-danger text-danger' },
  in_progress: { label: 'In Progress', className: 'bg-info text-white border-info' },
  resolved: { label: 'Fixed', className: 'bg-purple-500 text-white border-purple-500' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
  wont_fix: { label: "Won't Fix", className: 'bg-muted text-muted-foreground line-through' },
};

export function DefectDetailPanel({
  defect,
  onClose,
  onEdit,
  onStatusChange,
  onAddComment,
  comments = [],
  isLoading,
}: DefectDetailPanelProps) {
  const [newComment, setNewComment] = useState('');
  const severityConfig = SEVERITY_CONFIG[defect.severity];
  const SeverityIcon = severityConfig.icon;

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSubmitComment = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-l w-[450px] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-start justify-between mb-2">
          <span className="font-mono text-sm text-primary">{defect.defect_key}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-3">{defect.title}</h2>
        <div className="flex items-center gap-2">
          <Badge className={cn('gap-1', severityConfig.className)}>
            <SeverityIcon className="h-3 w-3" />
            {severityConfig.label}
          </Badge>
          <Select value={defect.status} onValueChange={(v) => onStatusChange(v as DefectStatus)}>
            <SelectTrigger className="w-[130px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </h3>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
              {defect.description || 'No description provided.'}
            </div>
          </div>

          <Separator />

          {/* Details */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Severity</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <SeverityIcon className="h-3.5 w-3.5" />
                  {severityConfig.label}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="mt-0.5">{STATUS_CONFIG[defect.status]?.label || defect.status}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Assignee</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {defect.assigned_user ? (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={defect.assigned_user.avatar_url} />
                        <AvatarFallback className="text-[9px]">
                          {getInitials(defect.assigned_user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      {defect.assigned_user.full_name}
                    </>
                  ) : (
                    <span className="italic text-muted-foreground">Unassigned</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Reporter</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {defect.reporter ? (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={defect.reporter.avatar_url} />
                        <AvatarFallback className="text-[9px]">
                          {getInitials(defect.reporter.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      {defect.reporter.full_name}
                    </>
                  ) : (
                    <span className="italic text-muted-foreground">Unknown</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Created</span>
                <div className="mt-0.5">{format(new Date(defect.created_at), 'MMM d, yyyy h:mm a')}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Updated</span>
                <div className="mt-0.5">{formatDistanceToNow(new Date(defect.updated_at), { addSuffix: true })}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Links */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Links
            </h3>
            <div className="space-y-2 text-sm">
              {defect.run && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Test Run</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs">
                    Run #{defect.run.run_number}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
              {defect.external_tracker_url && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">External</span>
                  <a 
                    href={defect.external_tracker_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-xs"
                  >
                    {defect.external_tracker_id || 'View'}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {!defect.run && !defect.external_tracker_url && (
                <div className="text-muted-foreground text-xs">No links</div>
              )}
            </div>
          </div>

          <Separator />

          {/* Activity */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Activity
            </h3>
            
            {/* Comment input */}
            <div className="flex gap-2 mb-4">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] text-sm"
              />
              <Button 
                size="sm" 
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Comments list */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No activity yet
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      {comment.is_system ? (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={comment.author.avatar_url} />
                          <AvatarFallback className="text-[9px]">
                            {getInitials(comment.author.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className={cn(
                        "font-medium",
                        comment.is_system && "text-muted-foreground"
                      )}>
                        {comment.is_system ? 'System' : comment.author.full_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className={cn(
                      "ml-7 text-muted-foreground",
                      comment.is_system && "italic"
                    )}>
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
