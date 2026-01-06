/**
 * Enhanced Defect Detail Panel - Module 6
 * Matches HTML reference design with quick actions, repro steps, attachments
 */

import React, { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  X, 
  Edit, 
  Flame, 
  AlertTriangle,
  AlertCircle, 
  Info, 
  Minus,
  Link2,
  ExternalLink,
  Paperclip,
  MessageSquare,
  Clock,
  Send,
  FileText,
  Image as ImageIcon,
  Play,
  UserPlus,
  Check,
  RefreshCw,
  ChevronRight
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

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DefectSeverity = 'blocker' | 'critical' | 'major' | 'minor' | 'trivial';
type DefectPriority = 'p1' | 'p2' | 'p3' | 'p4';
type DefectStatus = 'open' | 'in_progress' | 'in_review' | 'verified' | 'closed' | 'wont_fix';

interface DefectDetailPanelEnhancedProps {
  defect: any;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: DefectStatus) => void;
  onAddComment?: (comment: string) => void;
  isLoading?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<DefectSeverity, { 
  label: string; 
  icon: React.ElementType;
  badgeClass: string;
}> = {
  blocker: { label: 'Blocker', icon: Flame, badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' },
  critical: { label: 'Critical', icon: AlertCircle, badgeClass: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' },
  major: { label: 'Major', icon: AlertTriangle, badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' },
  minor: { label: 'Minor', icon: Info, badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' },
  trivial: { label: 'Trivial', icon: Minus, badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

const PRIORITY_CONFIG: Record<DefectPriority, { label: string; badgeClass: string }> = {
  p1: { label: 'P1 - High', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' },
  p2: { label: 'P2 - Medium', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' },
  p3: { label: 'P3 - Low', badgeClass: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' },
  p4: { label: 'P4 - Lowest', badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

const STATUS_CONFIG: Record<DefectStatus, { label: string; badgeClass: string }> = {
  open: { label: 'Open', badgeClass: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' },
  in_progress: { label: 'In Progress', badgeClass: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' },
  in_review: { label: 'In Review', badgeClass: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400' },
  verified: { label: 'Verified', badgeClass: 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400' },
  closed: { label: 'Closed', badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  wont_fix: { label: "Won't Fix", badgeClass: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
};

// Mock repro steps
const MOCK_REPRO_STEPS = [
  { step: 1, description: 'Navigate to the registration form' },
  { step: 2, description: 'Enter Arabic text with diacritical marks (e.g., "مُحَمَّد")' },
  { step: 3, description: 'Click the Submit button' },
  { step: 4, description: 'Observe application crash' },
];

// Mock activity
const MOCK_ACTIVITY = [
  { id: '1', type: 'status_changed', user: 'Sarah Mohammed', from: 'New', to: 'Open', time: '2 hours ago' },
  { id: '2', type: 'assigned', user: 'Ahmed Al-Rashid', to: 'Sarah Mohammed', time: '3 hours ago' },
  { id: '3', type: 'created', user: 'Ahmed Al-Rashid', time: '2 days ago' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DefectDetailPanelEnhanced({
  defect,
  onClose,
  onEdit,
  onStatusChange,
  onAddComment,
  isLoading,
}: DefectDetailPanelEnhancedProps) {
  const [newComment, setNewComment] = useState('');
  
  const severityConfig = SEVERITY_CONFIG[defect.severity as DefectSeverity] || SEVERITY_CONFIG.major;
  const priorityConfig = PRIORITY_CONFIG[defect.priority as DefectPriority] || PRIORITY_CONFIG.p2;
  const statusConfig = STATUS_CONFIG[defect.status as DefectStatus] || STATUS_CONFIG.open;
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
    <div className="h-full flex flex-col bg-background border-l w-[480px] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-gradient-to-b from-background to-muted/20">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-sm font-semibold text-muted-foreground">
            {defect.defect_key}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open('#', '_blank')}>
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <h2 className="text-lg font-bold leading-snug mb-4">{defect.title}</h2>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm" 
            className="bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => onStatusChange('in_progress')}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Start Work
          </Button>
          <Button variant="outline" size="sm">
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Assign
          </Button>
          <Button variant="outline" size="sm">
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            Link Jira
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Details Grid */}
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-muted-foreground">Status</span>
                <div className="mt-1">
                  <Badge className={cn("text-xs", statusConfig.badgeClass)}>
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Severity</span>
                <div className="mt-1">
                  <Badge className={cn("text-xs", severityConfig.badgeClass)}>
                    {severityConfig.label}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Priority</span>
                <div className="mt-1">
                  <Badge className={cn("text-xs", priorityConfig.badgeClass)}>
                    {priorityConfig.label}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Environment</span>
                <div className="mt-1 text-sm font-medium">Production</div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Assignee</span>
                <div className="flex items-center gap-2 mt-1">
                  {defect.assigned_user ? (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={defect.assigned_user.avatar_url} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {getInitials(defect.assigned_user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{defect.assigned_user.full_name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Unassigned</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Reporter</span>
                <div className="flex items-center gap-2 mt-1">
                  {defect.reporter ? (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={defect.reporter.avatar_url} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {getInitials(defect.reporter.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{defect.reporter.full_name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Unknown</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Created</span>
                <div className="mt-1 text-sm font-medium">
                  {format(new Date(defect.created_at), 'MMM d, yyyy • h:mm a')}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Updated</span>
                <div className="mt-1 text-sm font-medium">
                  {format(new Date(defect.updated_at), 'MMM d, yyyy • h:mm a')}
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Description */}
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Description
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {defect.description || 'No description provided.'}
            </p>
          </div>
          
          <Separator />
          
          {/* Steps to Reproduce */}
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Steps to Reproduce
            </h3>
            <div className="space-y-2">
              {MOCK_REPRO_STEPS.map((step) => (
                <div key={step.step} className="flex gap-3 p-2.5 bg-muted/50 rounded-lg text-sm">
                  <span className="flex-shrink-0 w-5 h-5 bg-muted rounded-full flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
                    {step.step}
                  </span>
                  <span className="text-foreground/80">{step.description}</span>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Attachments */}
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Attachments
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-[4/3] bg-muted rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                <ImageIcon className="h-5 w-5 text-muted-foreground mb-1" />
                <span className="text-[10px] text-muted-foreground">crash_log.png</span>
              </div>
              <div className="aspect-[4/3] bg-muted rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                <FileText className="h-5 w-5 text-muted-foreground mb-1" />
                <span className="text-[10px] text-muted-foreground">error.log</span>
              </div>
              <div className="aspect-[4/3] bg-muted/50 border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground/40 transition-colors">
                <Paperclip className="h-5 w-5 text-muted-foreground/50 mb-1" />
                <span className="text-[10px] text-muted-foreground/50">Add file</span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Linked Items */}
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Linked Items
            </h3>
            <div className="space-y-2">
              {defect.linked_test_case_key && (
                <div className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono font-semibold text-muted-foreground">
                      {defect.linked_test_case_key}
                    </div>
                    <div className="text-xs text-foreground/80 truncate">
                      Login form validation test
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              {defect.external_tracker_url && (
                <a 
                  href={defect.external_tracker_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                >
                  <div className="w-7 h-7 rounded bg-[#0052CC] flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">J</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono font-semibold text-muted-foreground">
                      {defect.external_id || 'JIRA-123'}
                    </div>
                    <div className="text-xs text-foreground/80 truncate">
                      External issue link
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
              {!defect.linked_test_case_key && !defect.external_tracker_url && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No linked items
                </div>
              )}
            </div>
          </div>
          
          <Separator />
          
          {/* Activity */}
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Activity
            </h3>
            
            {/* Comment Input */}
            <div className="flex gap-2 mb-4">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  ME
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                />
                <div className="flex justify-end">
                  <Button 
                    size="sm"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isLoading}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Comment
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Activity Timeline */}
            <div className="space-y-3">
              {MOCK_ACTIVITY.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                    activity.type === 'created' && "bg-teal-100 dark:bg-teal-900/50 text-teal-600",
                    activity.type === 'status_changed' && "bg-blue-100 dark:bg-blue-900/50 text-blue-600",
                    activity.type === 'assigned' && "bg-purple-100 dark:bg-purple-900/50 text-purple-600"
                  )}>
                    {activity.type === 'created' && <Check className="h-3.5 w-3.5" />}
                    {activity.type === 'status_changed' && <RefreshCw className="h-3.5 w-3.5" />}
                    {activity.type === 'assigned' && <UserPlus className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm text-foreground/80">
                      <span className="font-medium">{activity.user}</span>
                      {activity.type === 'created' && ' created this defect'}
                      {activity.type === 'status_changed' && ` changed status from ${activity.from} to ${activity.to}`}
                      {activity.type === 'assigned' && ` assigned to ${activity.to}`}
                    </p>
                    <span className="text-[11px] text-muted-foreground">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default DefectDetailPanelEnhanced;
