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
  Clock,
  AlertTriangle,
  Paperclip,
  Send,
  Play,
  Pause,
  RotateCcw,
  Link2,
  MoreHorizontal,
  History,
  Eye,
  Share2,
  Image,
  Video,
  Hand
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

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Severity left border colors (industry standard pattern - Jira, Notion, Linear)
function getSeverityBorderColor(severity: string): string {
  const colors: Record<string, string> = {
    blocker: 'border-l-red-600',
    critical: 'border-l-red-500',
    major: 'border-l-orange-500',
    minor: 'border-l-amber-400',
    trivial: 'border-l-gray-300',
  };
  return colors[severity] || 'border-l-gray-300';
}

// Status transitions based on current status
function getQuickTransitions(currentStatus: string) {
  const transitions: Record<string, Array<{ to: string; label: string; icon: React.ReactNode }>> = {
    'todo': [
      { to: 'under_implementation', label: 'Start Work', icon: <Play className="w-3.5 h-3.5" /> },
      { to: 'blocked', label: 'Block', icon: <Hand className="w-3.5 h-3.5" /> },
    ],
    'open': [
      { to: 'under_implementation', label: 'Start Work', icon: <Play className="w-3.5 h-3.5" /> },
      { to: 'blocked', label: 'Block', icon: <Hand className="w-3.5 h-3.5" /> },
    ],
    'under_implementation': [
      { to: 'ready_for_qa', label: 'Submit for QA', icon: <CheckCircle className="w-3.5 h-3.5" /> },
      { to: 'blocked', label: 'Block', icon: <Hand className="w-3.5 h-3.5" /> },
    ],
    'in_progress': [
      { to: 'ready_for_qa', label: 'Submit for QA', icon: <CheckCircle className="w-3.5 h-3.5" /> },
      { to: 'blocked', label: 'Block', icon: <Hand className="w-3.5 h-3.5" /> },
    ],
    'ready_for_qa': [
      { to: 'uat_ready', label: 'Pass to UAT', icon: <CheckCircle className="w-3.5 h-3.5" /> },
      { to: 'rejected', label: 'Reject', icon: <XCircle className="w-3.5 h-3.5" /> },
    ],
    'rejected': [
      { to: 'under_implementation', label: 'Rework', icon: <RotateCcw className="w-3.5 h-3.5" /> },
    ],
    'blocked': [
      { to: 'todo', label: 'Unblock', icon: <Play className="w-3.5 h-3.5" /> },
    ],
    'uat_ready': [
      { to: 'in_beta', label: 'Deploy to Beta', icon: <Play className="w-3.5 h-3.5" /> },
      { to: 'rejected', label: 'UAT Failed', icon: <XCircle className="w-3.5 h-3.5" /> },
    ],
    'in_beta': [
      { to: 'ready_for_production', label: 'Ready for Prod', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    ],
    'ready_for_production': [
      { to: 'in_production', label: 'Deploy', icon: <Play className="w-3.5 h-3.5" /> },
    ],
    'in_production': [
      { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    ],
    'monitor': [
      { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    ],
    'reopen': [
      { to: 'under_implementation', label: 'Start Fix', icon: <Play className="w-3.5 h-3.5" /> },
    ],
    'retest': [
      { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3.5 h-3.5" /> },
      { to: 'rejected', label: 'Fail Retest', icon: <XCircle className="w-3.5 h-3.5" /> },
    ],
    'awaiting_info': [
      { to: 'todo', label: 'Info Received', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    ],
  };
  
  return transitions[currentStatus] || [
    { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3.5 h-3.5" /> }
  ];
}

// Avatar color helper
const avatarColors: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700' },
  green: { bg: 'bg-teal-100', text: 'text-teal-700' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700' },
  orange: { bg: 'bg-amber-100', text: 'text-amber-700' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
  gray: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function ContentCard({ 
  title, 
  titleIcon,
  titleClass = 'text-foreground',
  action, 
  children 
}: { 
  title: string; 
  titleIcon?: React.ReactNode;
  titleClass?: string;
  action?: React.ReactNode; 
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className={cn("text-sm font-semibold flex items-center gap-2", titleClass)}>
          {titleIcon}
          {title}
        </h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SidebarPanel({ 
  title, 
  action, 
  children 
}: { 
  title: string; 
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{title}</h3>
        {action}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-foreground font-medium">{children}</div>
    </div>
  );
}

function UserChip({ user }: { user: { name: string; initials: string; color: string } }) {
  const colorStyle = avatarColors[user.color] || avatarColors.gray;
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold", colorStyle.bg, colorStyle.text)}>
        {user.initials}
      </div>
      <span className="text-sm">{user.name}</span>
    </div>
  );
}

function InlineEmpty({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg border border-dashed border-border">
      <span className="text-sm text-muted-foreground">{message}</span>
      {action && (
        <button onClick={onAction} className="text-sm text-primary hover:text-primary/80 font-medium">
          + {action}
        </button>
      )}
    </div>
  );
}

function AddButton({ label, small, onClick }: { label: string; small?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn("text-primary hover:text-primary/80 font-medium", small ? "text-[10px]" : "text-xs")}>
      + {label}
    </button>
  );
}

function HistoryItem({ field, from, to, user, time }: { 
  field: string; 
  from: string; 
  to: string; 
  user: string; 
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
      <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-foreground">
          <span className="font-medium">{field}</span> changed from{' '}
          <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{from}</span> to{' '}
          <span className="font-mono text-xs bg-primary/10 text-primary px-1 py-0.5 rounded">{to}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">{user} • {time}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

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
      toast.success(`Status changed to ${formatStatus(newStatus)}`);
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

  const quickTransitions = getQuickTransitions(defect.status);
  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'reproduction', label: 'Reproduction' },
    { id: 'activity', label: 'Activity', count: 1 },
    { id: 'linked', label: 'Linked Items', count: defect.linkedTestId ? 1 : 0 },
    { id: 'history', label: 'History' },
  ];

  const assigneeColor = avatarColors[defect.assignee?.color || 'gray'] || avatarColors.gray;
  const reporterColor = avatarColors[defect.reporter?.color || 'gray'] || avatarColors.gray;

  return (
    <div className="min-h-screen bg-muted/30">
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER - Dense, 3 rows                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Row 1: Breadcrumb + ID + Badges + Actions */}
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            {/* Left */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/releases/defects')}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Defects
              </button>
              
              <span className="text-muted-foreground">/</span>
              
              <span className="text-lg font-bold font-mono text-primary">
                {defect.id}
              </span>
              
              <SeverityBadge severity={defect.severity} />
              <PriorityBadge priority={defect.priority || 'P3'} size="sm" />
              <DefectStatusBadge status={defect.status} />
            </div>
            
            {/* Right */}
            <div className="flex items-center gap-3">
              {/* Assignee Chip */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full text-sm">
                {defect.assignee && defect.assignee.initials !== '?' ? (
                  <>
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold", assigneeColor.bg, assigneeColor.text)}>
                      {defect.assignee.initials}
                    </div>
                    <span className="font-medium text-foreground">{defect.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </div>
              
              <div className="h-5 w-px bg-border" />
              
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
                    <Eye className="w-4 h-4 mr-2" />
                    Watch
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link2 className="w-4 h-4 mr-2" />
                    Link Test Case
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Row 2: Title with Severity Border + Quick Actions */}
          <div className="flex items-start justify-between gap-6 py-4">
            {/* Title with LEFT BORDER for severity */}
            <div className={cn("flex-1 pl-4 border-l-4", getSeverityBorderColor(defect.severity))}>
              <h1 className="text-xl font-bold text-foreground">{defect.title}</h1>
              {defect.description && (
                <p className="text-muted-foreground mt-1 text-sm">{defect.description}</p>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-muted-foreground mr-1">Move to:</span>
              {quickTransitions.map((t, i) => (
                <Button
                  key={t.to}
                  variant={i === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusChange(t.to)}
                  className="gap-1.5 h-8"
                >
                  {t.icon}
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Row 3: Tabs */}
          <div className="flex gap-1 border-t border-border/50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary -mb-px'
                    : 'text-muted-foreground hover:text-foreground'
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
      {/* MAIN CONTENT - Two Column Layout                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          
          {/* LEFT COLUMN: Content */}
          <div className="flex-1 space-y-4 min-w-0">
            
            {/* ─────────────────────────────────────────────────────────────── */}
            {/* DETAILS TAB                                                     */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {activeTab === 'details' && (
              <>
                {/* Description */}
                <ContentCard title="Description" action={<AddButton label="Edit" onClick={() => setIsEditModalOpen(true)} />}>
                  {defect.description ? (
                    <p className="text-sm text-foreground">{defect.description}</p>
                  ) : (
                    <InlineEmpty message="No description provided" action="Add description" onAction={() => setIsEditModalOpen(true)} />
                  )}
                </ContentCard>
                
                {/* Steps to Reproduce */}
                <ContentCard title="Steps to Reproduce" action={<AddButton label="Edit" onClick={() => setIsEditModalOpen(true)} />}>
                  {defect.stepsToReproduce ? (
                    <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm text-foreground border-l-4 border-primary whitespace-pre-wrap">
                      {defect.stepsToReproduce}
                    </div>
                  ) : (
                    <InlineEmpty message="No steps provided" action="Add steps" onAction={() => setIsEditModalOpen(true)} />
                  )}
                </ContentCard>
                
                {/* Expected vs Actual */}
                <div className="grid grid-cols-2 gap-4">
                  <ContentCard 
                    title="Expected Result" 
                    titleIcon={<CheckCircle className="w-3.5 h-3.5 text-teal-500" />}
                    titleClass="text-teal-700"
                  >
                    {defect.expectedResult ? (
                      <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-4 text-sm text-foreground border-l-4 border-teal-500">
                        {defect.expectedResult}
                      </div>
                    ) : (
                      <InlineEmpty message="Not provided" />
                    )}
                  </ContentCard>
                  
                  <ContentCard 
                    title="Actual Result" 
                    titleIcon={<XCircle className="w-3.5 h-3.5 text-red-500" />}
                    titleClass="text-destructive"
                  >
                    {defect.actualResult ? (
                      <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 text-sm text-foreground border-l-4 border-red-500">
                        {defect.actualResult}
                      </div>
                    ) : (
                      <InlineEmpty message="Not provided" />
                    )}
                  </ContentCard>
                </div>
                
                {/* Attachments */}
                <ContentCard title="Attachments" action={<AddButton label="Add" onClick={() => toast.info('Attachment upload coming soon')} />}>
                  <InlineEmpty message="No attachments" action="Add attachment" onAction={() => toast.info('Attachment upload coming soon')} />
                </ContentCard>
                
                {/* Activity Preview - Always Visible */}
                <ContentCard title="Activity">
                  {/* Comment Input */}
                  <div className="flex gap-3 mb-4 pb-4 border-b border-border">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                      VS
                    </div>
                    <div className="flex-1">
                      <Textarea 
                        placeholder="Add a comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[60px] text-sm resize-none"
                      />
                      <div className="flex justify-end mt-2">
                        <Button 
                          size="sm" 
                          onClick={handleAddComment}
                          disabled={!comment.trim()}
                          className="h-7 px-3"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Timeline */}
                  <div className="space-y-3">
                    {/* Updated Event */}
                    {defect.updatedAt !== defect.createdAt && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 pt-2">
                          <p className="text-sm text-muted-foreground">Defect was updated</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{defect.updatedAt}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Creation Event */}
                    <div className="flex gap-3">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0", reporterColor.bg, reporterColor.text)}>
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
                </ContentCard>
              </>
            )}
            
            {/* ─────────────────────────────────────────────────────────────── */}
            {/* REPRODUCTION TAB                                                */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {activeTab === 'reproduction' && (
              <>
                <ContentCard title="Steps to Reproduce" action={<AddButton label="Edit" onClick={() => setIsEditModalOpen(true)} />}>
                  {defect.stepsToReproduce ? (
                    <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm text-foreground border-l-4 border-primary whitespace-pre-wrap">
                      {defect.stepsToReproduce}
                    </div>
                  ) : (
                    <InlineEmpty message="No steps provided" action="Add steps" onAction={() => setIsEditModalOpen(true)} />
                  )}
                </ContentCard>
                
                <div className="grid grid-cols-2 gap-4">
                  <ContentCard 
                    title="Expected Result" 
                    titleIcon={<CheckCircle className="w-3.5 h-3.5 text-teal-500" />}
                    titleClass="text-teal-700"
                  >
                    {defect.expectedResult ? (
                      <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-4 text-sm text-foreground border-l-4 border-teal-500">
                        {defect.expectedResult}
                      </div>
                    ) : (
                      <InlineEmpty message="Not provided" />
                    )}
                  </ContentCard>
                  
                  <ContentCard 
                    title="Actual Result" 
                    titleIcon={<XCircle className="w-3.5 h-3.5 text-red-500" />}
                    titleClass="text-destructive"
                  >
                    {defect.actualResult ? (
                      <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 text-sm text-foreground border-l-4 border-red-500">
                        {defect.actualResult}
                      </div>
                    ) : (
                      <InlineEmpty message="Not provided" />
                    )}
                  </ContentCard>
                </div>
                
                {/* Environment Details */}
                {(defect.environment || defect.browser || defect.os || defect.url) && (
                  <ContentCard title="Environment Details">
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
                          <a href={defect.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium truncate">
                            {defect.url}
                          </a>
                        </div>
                      )}
                    </div>
                  </ContentCard>
                )}
                
                <ContentCard title="Attachments" action={<AddButton label="Add" onClick={() => toast.info('Attachment upload coming soon')} />}>
                  <InlineEmpty message="No attachments" action="Add attachment" onAction={() => toast.info('Attachment upload coming soon')} />
                </ContentCard>
              </>
            )}
            
            {/* ─────────────────────────────────────────────────────────────── */}
            {/* ACTIVITY TAB                                                    */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {activeTab === 'activity' && (
              <ContentCard title="Activity & Comments">
                {/* Comment Input */}
                <div className="flex gap-3 mb-4 pb-4 border-b border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                    VS
                  </div>
                  <div className="flex-1">
                    <Textarea 
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-[80px] text-sm resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <Button 
                        size="sm" 
                        onClick={handleAddComment}
                        disabled={!comment.trim()}
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Timeline */}
                <div className="space-y-4">
                  {/* Updated Event */}
                  {defect.updatedAt !== defect.createdAt && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 pt-2">
                        <p className="text-sm text-muted-foreground">Defect was updated</p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{defect.updatedAt}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Creation Event */}
                  <div className="flex gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0", reporterColor.bg, reporterColor.text)}>
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
              </ContentCard>
            )}
            
            {/* ─────────────────────────────────────────────────────────────── */}
            {/* LINKED ITEMS TAB                                                */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {activeTab === 'linked' && (
              <ContentCard title="Linked Items" action={<AddButton label="Link Item" />}>
                {defect.linkedTestId ? (
                  <div className="space-y-2">
                    <a 
                      href={`/releases/tests/${defect.linkedTestId}`}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-teal-100 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-teal-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground group-hover:text-primary">
                            {defect.linkedTestId}
                          </p>
                          <p className="text-xs text-muted-foreground">Test Case</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                    </a>
                  </div>
                ) : (
                  <InlineEmpty message="No linked items" action="Link a test case" />
                )}
              </ContentCard>
            )}
            
            {/* ─────────────────────────────────────────────────────────────── */}
            {/* HISTORY TAB                                                     */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {activeTab === 'history' && (
              <ContentCard title="Change History">
                <div className="space-y-3">
                  <HistoryItem 
                    field="Status"
                    from="TODO"
                    to="IN PROGRESS"
                    user={defect.assignee?.name || 'System'}
                    time={defect.updatedAt || 'Recently'}
                  />
                  <HistoryItem 
                    field="Assignee"
                    from="Unassigned"
                    to={defect.assignee?.name || 'Unknown'}
                    user={defect.reporter?.name || 'System'}
                    time="2 hours ago"
                  />
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        Defect <span className="font-medium">created</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{defect.reporter?.name || 'Unknown'} • {defect.createdAt}</p>
                    </div>
                  </div>
                </div>
              </ContentCard>
            )}
            
          </div>
          
          {/* RIGHT COLUMN: Sidebar */}
          <div className="w-80 flex-shrink-0 space-y-4">
            
            {/* Details Panel */}
            <SidebarPanel title="Details">
              <FieldRow label="Status">
                <DefectStatusBadge status={defect.status} />
              </FieldRow>
              <FieldRow label="Severity">
                <SeverityBadge severity={defect.severity} />
              </FieldRow>
              <FieldRow label="Priority">
                <PriorityBadge priority={defect.priority || 'P3'} size="sm" />
              </FieldRow>
              <FieldRow label="Release">
                <span className="font-mono text-xs">{defect.releaseId || '—'}</span>
              </FieldRow>
              <FieldRow label="Environment">
                {defect.environment || '—'}
              </FieldRow>
              <FieldRow label="Module">
                {defect.module || '—'}
              </FieldRow>
            </SidebarPanel>
            
            {/* People Panel */}
            <SidebarPanel title="People">
              <FieldRow label="Assignee">
                {defect.assignee && defect.assignee.initials !== '?' ? (
                  <UserChip user={defect.assignee} />
                ) : (
                  <button 
                    onClick={() => setIsReassignModalOpen(true)}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    + Assign
                  </button>
                )}
              </FieldRow>
              <FieldRow label="Reporter">
                {defect.reporter ? (
                  <UserChip user={defect.reporter} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </FieldRow>
            </SidebarPanel>
            
            {/* Timeline Panel */}
            <SidebarPanel title="Timeline">
              <FieldRow label="Created">
                {defect.createdAt}
              </FieldRow>
              <FieldRow label="Updated">
                {defect.updatedAt || defect.createdAt}
              </FieldRow>
            </SidebarPanel>
            
            {/* Linked Items Panel */}
            <SidebarPanel title="Linked Items" action={<AddButton label="Link" small />}>
              {defect.linkedTestId ? (
                <a 
                  href="#"
                  className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted/50 transition-all"
                >
                  <div className="w-6 h-6 rounded bg-teal-100 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-teal-600" />
                  </div>
                  <span className="text-xs font-mono text-teal-600 font-medium">{defect.linkedTestId}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                </a>
              ) : (
                <p className="text-xs text-muted-foreground py-2">No linked items</p>
              )}
            </SidebarPanel>
            
            {/* Related Defects Panel */}
            <SidebarPanel title="Related Defects">
              <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-all">
                <span className="font-mono text-xs text-primary font-medium">DEF-088</span>
                <span className="text-xs text-muted-foreground truncate flex-1">Login button unresponsive</span>
              </a>
              <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-all">
                <span className="font-mono text-xs text-primary font-medium">DEF-087</span>
                <span className="text-xs text-muted-foreground truncate flex-1">Dashboard charts dark mode</span>
              </a>
            </SidebarPanel>
            
          </div>
          
        </div>
      </main>
      
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
