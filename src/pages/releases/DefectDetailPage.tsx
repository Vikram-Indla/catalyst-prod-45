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
  Link2,
  MoreHorizontal,
  History
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
  const transitions: Record<string, Array<{ to: string; label: string; icon: React.ReactNode; primary?: boolean; className?: string }>> = {
    'todo': [
      { to: 'under_implementation', label: 'Start Implementation', icon: <Play className="w-3.5 h-3.5" />, primary: true },
      { to: 'blocked', label: 'Block', icon: <Pause className="w-3.5 h-3.5" />, className: 'text-destructive hover:bg-destructive/10 border-destructive/30' },
    ],
    'open': [
      { to: 'under_implementation', label: 'Start Implementation', icon: <Play className="w-3.5 h-3.5" />, primary: true },
      { to: 'blocked', label: 'Block', icon: <Pause className="w-3.5 h-3.5" />, className: 'text-destructive hover:bg-destructive/10 border-destructive/30' },
    ],
    'under_implementation': [
      { to: 'ready_for_qa', label: 'Submit for QA', icon: <CheckCircle className="w-3.5 h-3.5" />, primary: true },
      { to: 'blocked', label: 'Block', icon: <Pause className="w-3.5 h-3.5" />, className: 'text-destructive hover:bg-destructive/10 border-destructive/30' },
    ],
    'in_progress': [
      { to: 'ready_for_qa', label: 'Submit for QA', icon: <CheckCircle className="w-3.5 h-3.5" />, primary: true },
      { to: 'blocked', label: 'Block', icon: <Pause className="w-3.5 h-3.5" />, className: 'text-destructive hover:bg-destructive/10 border-destructive/30' },
    ],
    'ready_for_qa': [
      { to: 'uat_ready', label: 'Pass to UAT', icon: <CheckCircle className="w-3.5 h-3.5" />, primary: true },
      { to: 'rejected', label: 'Reject', icon: <XCircle className="w-3.5 h-3.5" />, className: 'text-destructive hover:bg-destructive/10 border-destructive/30' },
    ],
    'rejected': [
      { to: 'under_implementation', label: 'Rework', icon: <RotateCcw className="w-3.5 h-3.5" />, primary: true },
    ],
    'blocked': [
      { to: 'todo', label: 'Unblock', icon: <Play className="w-3.5 h-3.5" />, primary: true },
    ],
    'uat_ready': [
      { to: 'in_beta', label: 'Deploy to Beta', icon: <Play className="w-3.5 h-3.5" />, primary: true },
      { to: 'rejected', label: 'UAT Failed', icon: <XCircle className="w-3.5 h-3.5" />, className: 'text-destructive hover:bg-destructive/10 border-destructive/30' },
    ],
    'in_beta': [
      { to: 'ready_for_production', label: 'Ready for Prod', icon: <CheckCircle className="w-3.5 h-3.5" />, primary: true },
    ],
    'ready_for_production': [
      { to: 'in_production', label: 'Deploy to Prod', icon: <Play className="w-3.5 h-3.5" />, primary: true },
    ],
    'in_production': [
      { to: 'monitor', label: 'Monitor', icon: <Clock className="w-3.5 h-3.5" /> },
      { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3.5 h-3.5" />, primary: true },
    ],
    'monitor': [
      { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3.5 h-3.5" />, primary: true },
      { to: 'reopen', label: 'Re-open', icon: <RotateCcw className="w-3.5 h-3.5" />, className: 'text-orange-600 hover:bg-orange-50' },
    ],
    'reopen': [
      { to: 'under_implementation', label: 'Start Fix', icon: <Play className="w-3.5 h-3.5" />, primary: true },
    ],
    'retest': [
      { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3.5 h-3.5" />, primary: true },
      { to: 'rejected', label: 'Fail Retest', icon: <XCircle className="w-3.5 h-3.5" />, className: 'text-destructive hover:bg-destructive/10 border-destructive/30' },
    ],
    'awaiting_info': [
      { to: 'todo', label: 'Info Received', icon: <CheckCircle className="w-3.5 h-3.5" />, primary: true },
    ],
  };
  
  return transitions[currentStatus] || [
    { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3.5 h-3.5" /> }
  ];
}

// Detail Row component
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

// Inline Empty State
function InlineEmpty({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg border border-dashed border-border">
      <span className="text-sm text-muted-foreground">{message}</span>
      {action && (
        <Button variant="ghost" size="sm" onClick={onAction} className="text-primary hover:text-primary/80 h-7">
          + {action}
        </Button>
      )}
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
  const [activeTab, setActiveTab] = useState('details');
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
  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'reproduction', label: 'Reproduction' },
    { id: 'activity', label: 'Activity', count: 1 },
    { id: 'linked', label: 'Linked Items', count: defect.linkedTestId ? 1 : 0 },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DENSE HEADER                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-card border-b border-border shadow-sm">
        {/* Severity Color Bar */}
        <div className={`h-1.5 ${getSeverityBarColor(defect.severity)}`} />
        
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Row 1: Navigation + ID + Badges + Actions */}
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/releases/defects')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              
              <div className="h-5 w-px bg-border" />
              
              <span className="text-2xl font-bold font-mono text-primary">
                {defect.id}
              </span>
              
              <SeverityBadge severity={defect.severity} />
              <PriorityBadge priority={defect.priority || 'P3'} size="sm" />
              <DefectStatusBadge status={defect.status} />
            </div>
            
            <div className="flex items-center gap-3">
              {/* Assignee Chip */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                <span className="text-xs text-muted-foreground">Assigned:</span>
                {defect.assignee && defect.assignee.initials !== '?' ? (
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                      avatarColors[defect.assignee.color] || avatarColors.gray
                    )}>
                      {defect.assignee.initials}
                    </div>
                    <span className="text-sm font-medium text-foreground">{defect.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </div>
              
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsReassignModalOpen(true)}>
                <UserPlus className="w-4 h-4 mr-1" />
                Reassign
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
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
                  <DropdownMenuItem>
                    <Link2 className="w-4 h-4 mr-2" />
                    Link Test Case
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
          
          {/* Row 2: Title + Description */}
          <div className="py-4">
            <h1 className="text-xl font-bold text-foreground">{defect.title}</h1>
            {defect.description && (
              <p className="text-muted-foreground mt-1 text-sm">{defect.description}</p>
            )}
          </div>
          
          {/* Row 3: Quick Actions */}
          {availableTransitions.length > 0 && (
            <div className="flex items-center gap-2 pb-4 border-b border-border/50">
              <span className="text-sm text-muted-foreground mr-2">Quick Actions:</span>
              {availableTransitions.map(transition => (
                <Button
                  key={transition.to}
                  variant={transition.primary ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusChange(transition.to)}
                  className={cn("gap-1.5", transition.className)}
                >
                  {transition.icon}
                  {transition.label}
                </Button>
              ))}
            </div>
          )}
          
          {/* Row 4: Tabs */}
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn(
                    "ml-1.5 px-1.5 py-0.5 text-xs rounded-full",
                    activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB CONTENT                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        
        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-border">
              {/* Left Column */}
              <div className="p-6">
                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">
                  Classification
                </h3>
                <div className="space-y-0">
                  <DetailRow label="Status">
                    <DefectStatusBadge status={defect.status} />
                  </DetailRow>
                  <DetailRow label="Severity">
                    <SeverityBadge severity={defect.severity} />
                  </DetailRow>
                  <DetailRow label="Priority">
                    <PriorityBadge priority={defect.priority || 'P3'} size="sm" />
                  </DetailRow>
                  <DetailRow label="Release">
                    <span className="font-mono text-sm">{defect.releaseId || '—'}</span>
                  </DetailRow>
                  <DetailRow label="Environment">
                    <span className="text-sm">{defect.environment || '—'}</span>
                  </DetailRow>
                  <DetailRow label="Module">
                    <span className="text-sm">{defect.module || '—'}</span>
                  </DetailRow>
                  {defect.defectType && (
                    <DetailRow label="Type">
                      <span className="text-sm capitalize">{defect.defectType}</span>
                    </DetailRow>
                  )}
                </div>
              </div>
              
              {/* Right Column */}
              <div className="p-6">
                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">
                  People & Timeline
                </h3>
                <div className="space-y-0">
                  <DetailRow label="Assignee">
                    {defect.assignee && defect.assignee.initials !== '?' ? (
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                          avatarColors[defect.assignee.color] || avatarColors.gray
                        )}>
                          {defect.assignee.initials}
                        </div>
                        <span className="text-sm font-medium">{defect.assignee.name}</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsReassignModalOpen(true)}
                        className="text-sm text-primary hover:text-primary/80"
                      >
                        + Assign
                      </button>
                    )}
                  </DetailRow>
                  <DetailRow label="Reporter">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                        avatarColors[defect.reporter?.color || 'gray']
                      )}>
                        {defect.reporter?.initials || '?'}
                      </div>
                      <span className="text-sm font-medium">{defect.reporter?.name || 'Unknown'}</span>
                    </div>
                  </DetailRow>
                  <DetailRow label="Created">
                    <span className="text-sm">{defect.createdAt}</span>
                  </DetailRow>
                  <DetailRow label="Updated">
                    <span className="text-sm">{defect.updatedAt || defect.createdAt}</span>
                  </DetailRow>
                  <DetailRow label="Linked Test">
                    {defect.linkedTestId ? (
                      <a href="#" className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
                        {defect.linkedTestId}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </DetailRow>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* REPRODUCTION TAB */}
        {activeTab === 'reproduction' && (
          <div className="space-y-6">
            {/* Steps to Reproduce */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Steps to Reproduce
              </h3>
              {defect.stepsToReproduce ? (
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm text-foreground whitespace-pre-wrap border-l-4 border-primary">
                  {defect.stepsToReproduce}
                </div>
              ) : (
                <InlineEmpty 
                  message="No steps to reproduce provided" 
                  action="Add steps" 
                  onAction={() => setIsEditModalOpen(true)}
                />
              )}
            </div>
            
            {/* Expected & Actual */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <h3 className="text-sm font-bold text-teal-700 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Expected Result
                </h3>
                {defect.expectedResult ? (
                  <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-4 text-sm text-foreground border-l-4 border-teal-500">
                    {defect.expectedResult}
                  </div>
                ) : (
                  <InlineEmpty message="Not provided" />
                )}
              </div>
              
              <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <h3 className="text-sm font-bold text-destructive mb-4 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Actual Result
                </h3>
                {defect.actualResult ? (
                  <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 text-sm text-foreground border-l-4 border-red-500">
                    {defect.actualResult}
                  </div>
                ) : (
                  <InlineEmpty message="Not provided" />
                )}
              </div>
            </div>
            
            {/* Environment Details */}
            {(defect.environment || defect.browser || defect.os || defect.url) && (
              <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Environment Details
                </h3>
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
            
            {/* Attachments */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Attachments
              </h3>
              <InlineEmpty message="No attachments" action="Add attachment" onAction={() => toast.info('Attachment upload coming soon')} />
            </div>
          </div>
        )}
        
        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            {/* Comment Input */}
            <div className="flex gap-3 mb-6 pb-6 border-b border-border">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                VS
              </div>
              <div className="flex-1">
                <Textarea 
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button 
                    size="sm" 
                    onClick={handleAddComment}
                    disabled={!comment.trim()}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Comment
                  </Button>
                </div>
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
                    <span className="font-medium">{defect.reporter?.name || 'Unknown'}</span>
                    {' '}created this defect
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{defect.createdAt}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* LINKED ITEMS TAB */}
        {activeTab === 'linked' && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Linked Items</h3>
              <Button variant="outline" size="sm">
                <Link2 className="w-4 h-4 mr-1" />
                Link Item
              </Button>
            </div>
            
            {defect.linkedTestId ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-teal-100 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{defect.linkedTestId}</p>
                      <p className="text-xs text-muted-foreground">Test Case</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <InlineEmpty message="No linked items" action="Link a test case" />
            )}
          </div>
        )}
        
        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h3 className="text-sm font-bold text-foreground mb-4">Change History</h3>
            
            <div className="space-y-3">
              {/* Sample history items */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <History className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Status</span> changed from{' '}
                    <span className="font-mono text-xs bg-muted px-1 rounded">TODO</span> to{' '}
                    <span className="font-mono text-xs bg-primary/10 text-primary px-1 rounded">IN PROGRESS</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {defect.assignee?.name || 'System'} • {defect.updatedAt || 'Recently'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <History className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    Defect <span className="font-medium">created</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {defect.reporter?.name || 'Unknown'} • {defect.createdAt}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
