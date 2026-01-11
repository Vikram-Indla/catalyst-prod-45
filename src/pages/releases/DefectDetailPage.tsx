import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  ExternalLink,
  ChevronDown,
  Clock,
  AlertTriangle,
  Paperclip,
  Flag,
  Send,
  Play,
  Pause,
  RotateCcw,
  ListOrdered
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { SeverityBadge } from '@/components/releases/defects/SeverityBadge';
import { DefectStatusBadge } from '@/components/releases/defects/DefectStatusBadge';
import { PriorityBadge } from '@/components/releases/defects/PriorityBadge';
import { EmptyState } from '@/components/releases/defects/EmptyState';
import { EditDefectModal } from '@/components/releases/defects/EditDefectModal';
import { ReassignModal } from '@/components/releases/defects/ReassignModal';
import { defectsData, Defect, getAssigneeById } from '@/data/defectsData';
import { cn } from '@/lib/utils';

// Severity bar colors
function getSeverityBarColor(severity: string): string {
  const colors: Record<string, string> = {
    blocker: 'bg-red-600',
    critical: 'bg-red-500',
    major: 'bg-orange-500',
    minor: 'bg-amber-400',
    trivial: 'bg-muted-foreground/30',
  };
  return colors[severity] || colors.major;
}

// Status transitions based on current status
function getAvailableTransitions(currentStatus: string) {
  const transitions: Record<string, Array<{ to: string; label: string; icon: React.ReactNode; color: string }>> = {
    'todo': [
      { to: 'under_implementation', label: 'Start Implementation', icon: <Play className="w-3.5 h-3.5" />, color: 'text-primary hover:bg-primary/10' },
      { to: 'blocked', label: 'Block', icon: <Pause className="w-3.5 h-3.5" />, color: 'text-destructive hover:bg-destructive/10' },
    ],
    'under_implementation': [
      { to: 'ready_for_qa', label: 'Ready for QA', icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-teal-600 hover:bg-teal-50' },
      { to: 'blocked', label: 'Block', icon: <Pause className="w-3.5 h-3.5" />, color: 'text-destructive hover:bg-destructive/10' },
    ],
    'ready_for_qa': [
      { to: 'rejected', label: 'Reject', icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-destructive hover:bg-destructive/10' },
      { to: 'uat_ready', label: 'Pass to UAT', icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-teal-600 hover:bg-teal-50' },
    ],
    'rejected': [
      { to: 'under_implementation', label: 'Back to Dev', icon: <RotateCcw className="w-3.5 h-3.5" />, color: 'text-primary hover:bg-primary/10' },
    ],
    'blocked': [
      { to: 'todo', label: 'Unblock', icon: <Play className="w-3.5 h-3.5" />, color: 'text-primary hover:bg-primary/10' },
    ],
    'uat_ready': [
      { to: 'ready_for_production', label: 'Ready for Prod', icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-teal-600 hover:bg-teal-50' },
      { to: 'rejected', label: 'UAT Failed', icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-destructive hover:bg-destructive/10' },
    ],
    'ready_for_production': [
      { to: 'in_production', label: 'Deploy to Prod', icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-teal-600 hover:bg-teal-50' },
    ],
    'in_production': [
      { to: 'monitor', label: 'Start Monitoring', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-amber-600 hover:bg-amber-50' },
      { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-muted-foreground hover:bg-muted' },
    ],
    'monitor': [
      { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-muted-foreground hover:bg-muted' },
      { to: 'reopen', label: 'Re-open', icon: <RotateCcw className="w-3.5 h-3.5" />, color: 'text-orange-600 hover:bg-orange-50' },
    ],
    'reopen': [
      { to: 'under_implementation', label: 'Start Fix', icon: <Play className="w-3.5 h-3.5" />, color: 'text-primary hover:bg-primary/10' },
    ],
  };
  
  return transitions[currentStatus] || [];
}

// Detail Row component
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

// Avatar color helper
const avatarColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  teal: 'bg-teal-100 text-teal-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-amber-100 text-amber-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-teal-100 text-teal-700',
  gray: 'bg-muted text-muted-foreground',
};

export default function DefectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [defect, setDefect] = useState<Defect | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [comment, setComment] = useState('');

  // Load defect data
  useEffect(() => {
    const found = defectsData.find(d => d.id === id);
    setDefect(found || null);
  }, [id]);

  const handleStatusChange = useCallback((newStatus: string) => {
    if (defect) {
      setDefect({ ...defect, status: newStatus, updatedAt: 'Just now' });
      toast.success(`Status changed to ${newStatus.replace(/_/g, ' ')}`);
    }
  }, [defect]);

  const handleSave = useCallback((updatedDefect: Defect) => {
    setDefect(updatedDefect);
    toast.success(`${updatedDefect.id} updated successfully`);
  }, []);

  const handleReassign = useCallback((assigneeId: string) => {
    if (defect) {
      const newAssignee = getAssigneeById(assigneeId);
      setDefect({ ...defect, assignee: newAssignee, updatedAt: 'Just now' });
      toast.success(`Reassigned to ${newAssignee.name}`);
    }
  }, [defect]);

  const handleDelete = useCallback(() => {
    if (confirm(`Are you sure you want to delete ${defect?.id}?`)) {
      toast.success(`${defect?.id} deleted`);
      navigate('/releases/defects');
    }
  }, [defect, navigate]);

  const handleAddComment = useCallback(() => {
    if (comment.trim() && defect) {
      setDefect({ ...defect, updatedAt: 'Just now' });
      toast.success('Comment added');
      setComment('');
    }
  }, [comment, defect]);

  // Not found state
  if (!defect) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Defect Not Found</h2>
          <p className="text-muted-foreground mb-4">The defect {id} doesn't exist or was deleted.</p>
          <Button onClick={() => navigate('/releases/defects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Defects
          </Button>
        </div>
      </div>
    );
  }

  const availableTransitions = getAvailableTransitions(defect.status);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STICKY HEADER                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Back + ID + Badges */}
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/releases/defects')}
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Defects
              </Button>
              
              <div className="h-6 w-px bg-border" />
              
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-bold text-primary">
                  {defect.id}
                </span>
                <SeverityBadge severity={defect.severity} />
                <DefectStatusBadge status={defect.status} />
              </div>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="gap-1"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsReassignModalOpen(true)}
                className="gap-1"
              >
                <UserPlus className="w-4 h-4" />
                Reassign
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Actions
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover">
                  <DropdownMenuItem>
                    <Flag className="w-4 h-4 mr-2" />
                    Mark as Blocker
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Paperclip className="w-4 h-4 mr-2" />
                    Add Attachment
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Defect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-6">
          
          {/* ─────────────────────────────────────────────────────────────── */}
          {/* LEFT COLUMN: Main Content (2/3 width)                           */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className="col-span-2 space-y-6">
            
            {/* HERO CARD: Title + Description + Status Actions */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              {/* Severity color bar */}
              <div className={`h-1.5 ${getSeverityBarColor(defect.severity)}`} />
              
              <div className="p-6">
                {/* Title */}
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {defect.title}
                </h1>
                
                {/* Description */}
                {defect.description ? (
                  <p className="text-muted-foreground mb-6">
                    {defect.description}
                  </p>
                ) : (
                  <p className="text-muted-foreground/60 italic mb-6">
                    No description provided
                  </p>
                )}
                
                {/* Status Transition Buttons */}
                {availableTransitions.length > 0 && (
                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    <span className="text-sm text-muted-foreground mr-2">Move to:</span>
                    {availableTransitions.map(transition => (
                      <Button
                        key={transition.to}
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(transition.to)}
                        className={`gap-1.5 ${transition.color}`}
                      >
                        {transition.icon}
                        {transition.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* REPRODUCTION DETAILS */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Reproduction Details
              </h2>
              
              {/* Steps to Reproduce */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Steps to Reproduce
                </h3>
                {defect.stepsToReproduce ? (
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm text-foreground whitespace-pre-wrap border-l-4 border-primary">
                    {defect.stepsToReproduce}
                  </div>
                ) : (
                  <EmptyState 
                    icon={<ListOrdered className="w-6 h-6" />}
                    message="No steps to reproduce provided"
                    action="Add steps"
                    onAction={() => setIsEditModalOpen(true)}
                  />
                )}
              </div>
              
              {/* Expected vs Actual - Side by side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Expected */}
                <div>
                  <h3 className="text-xs font-semibold text-teal-700 uppercase mb-2 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Expected Result
                  </h3>
                  {defect.expectedResult ? (
                    <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-4 text-sm text-foreground border-l-4 border-teal-500 min-h-[80px]">
                      {defect.expectedResult}
                    </div>
                  ) : (
                    <EmptyState 
                      icon={<CheckCircle className="w-5 h-5 text-teal-400" />}
                      message="Not provided"
                      variant="compact"
                    />
                  )}
                </div>
                
                {/* Actual */}
                <div>
                  <h3 className="text-xs font-semibold text-destructive uppercase mb-2 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    Actual Result
                  </h3>
                  {defect.actualResult ? (
                    <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 text-sm text-foreground border-l-4 border-red-500 min-h-[80px]">
                      {defect.actualResult}
                    </div>
                  ) : (
                    <EmptyState 
                      icon={<XCircle className="w-5 h-5 text-red-400" />}
                      message="Not provided"
                      variant="compact"
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* ENVIRONMENT DETAILS (if any exist) */}
            {(defect.environment || defect.browser || defect.os || defect.url) && (
              <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Environment Details
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {defect.environment && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Environment:</span>
                      <span className="font-medium text-foreground">{defect.environment}</span>
                    </div>
                  )}
                  {defect.browser && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Browser:</span>
                      <span className="font-medium text-foreground">{defect.browser}</span>
                    </div>
                  )}
                  {defect.os && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">OS:</span>
                      <span className="font-medium text-foreground">{defect.os}</span>
                    </div>
                  )}
                  {defect.url && (
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-muted-foreground">URL:</span>
                      <a 
                        href={defect.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline font-medium truncate"
                      >
                        {defect.url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* ATTACHMENTS */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Attachments
              </h2>
              
              <EmptyState 
                icon={<Paperclip className="w-6 h-6" />}
                message="No attachments"
                action="Add attachment"
                onAction={() => toast.info('Attachment upload coming soon')}
              />
            </div>
            
            {/* ACTIVITY & COMMENTS */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Activity & Comments
              </h2>
              
              {/* Comment Input */}
              <div className="flex gap-3 mb-6">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                  VS
                </div>
                <div className="flex-1 relative">
                  <Textarea 
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[80px] pr-12 resize-none"
                  />
                  <Button 
                    size="sm" 
                    className="absolute bottom-2 right-2 h-8 w-8 p-0"
                    disabled={!comment.trim()}
                    onClick={handleAddComment}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Activity Timeline */}
              <div className="space-y-4">
                {/* Updated Event */}
                {defect.updatedAt !== defect.createdAt && (
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 pt-2">
                      <p className="text-sm text-muted-foreground">Defect was updated</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{defect.updatedAt}</p>
                    </div>
                  </div>
                )}
                
                {/* Creation Event */}
                <div className="flex gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
                    avatarColors[defect.reporter?.color || 'gray']
                  )}>
                    {defect.reporter?.initials || '?'}
                  </div>
                  <div className="flex-1 pt-2">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">
                        {defect.reporter?.name || 'Unknown'}
                      </span>
                      {' '}created this defect
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {defect.createdAt}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* ─────────────────────────────────────────────────────────────── */}
          {/* RIGHT COLUMN: Sidebar (1/3 width)                               */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className="space-y-4">
            
            {/* DETAILS CARD */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                Details
              </h3>
              
              <div className="space-y-1">
                <DetailRow label="Status">
                  <DefectStatusBadge status={defect.status} />
                </DetailRow>
                
                <DetailRow label="Severity">
                  <SeverityBadge severity={defect.severity} />
                </DetailRow>
                
                <DetailRow label="Priority">
                  <PriorityBadge priority={defect.priority || 'P3'} size="sm" />
                </DetailRow>
                
                {defect.defectType && (
                  <DetailRow label="Type">
                    <span className="text-sm font-medium text-foreground">{defect.defectType}</span>
                  </DetailRow>
                )}
                
                {defect.module && (
                  <DetailRow label="Module">
                    <span className="text-sm font-medium text-foreground">{defect.module}</span>
                  </DetailRow>
                )}
                
                <div className="border-t border-border pt-3 mt-3">
                  <DetailRow label="Release">
                    <span className="font-mono text-sm font-medium text-foreground">
                      {defect.releaseId || '—'}
                    </span>
                  </DetailRow>
                  
                  <DetailRow label="Linked Test">
                    {defect.linkedTestId ? (
                      <a 
                        href={`/releases/tests/${defect.linkedTestId}`}
                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium text-sm"
                      >
                        {defect.linkedTestId}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground/60 text-sm">None</span>
                    )}
                  </DetailRow>
                  
                  <DetailRow label="Environment">
                    <span className="text-sm text-foreground">
                      {defect.environment || '—'}
                    </span>
                  </DetailRow>
                </div>
              </div>
            </div>
            
            {/* PEOPLE CARD */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                People
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Assignee</span>
                  {defect.assignee && defect.assignee.initials !== '?' ? (
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
                        avatarColors[defect.assignee.color] || avatarColors.gray
                      )}>
                        {defect.assignee.initials}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {defect.assignee.name}
                      </span>
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary hover:text-primary/80 h-7 px-2"
                      onClick={() => setIsReassignModalOpen(true)}
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1" />
                      Assign
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reporter</span>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
                      avatarColors[defect.reporter?.color || 'gray']
                    )}>
                      {defect.reporter?.initials || '?'}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {defect.reporter?.name || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* TIMELINE CARD */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                Timeline
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">{defect.createdAt}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="text-foreground">{defect.updatedAt || defect.createdAt}</span>
                </div>
              </div>
            </div>
            
            {/* RELATED DEFECTS (Placeholder) */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                Related Defects
              </h3>
              
              <p className="text-sm text-muted-foreground/60 italic">No related defects</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Modal */}
      <EditDefectModal 
        open={isEditModalOpen} 
        onOpenChange={setIsEditModalOpen}
        defect={defect}
        onSave={handleSave}
      />
      
      {/* Reassign Modal */}
      <ReassignModal
        open={isReassignModalOpen}
        onOpenChange={setIsReassignModalOpen}
        onReassign={handleReassign}
        currentAssignee={defect.assignee || null}
      />
    </div>
  );
}
