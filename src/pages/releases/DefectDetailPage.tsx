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
  RotateCcw,
  Link2,
  MoreHorizontal,
  Eye,
  Share2,
  Image,
  Video,
  Hand,
  Copy
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

function getSeverityBorderColor(severity: string): string {
  const colors: Record<string, string> = {
    blocker: 'border-red-600',
    critical: 'border-red-500',
    major: 'border-orange-500',
    minor: 'border-amber-400',
    trivial: 'border-gray-300',
  };
  return colors[severity] || 'border-gray-300';
}

function getQuickTransitions(currentStatus: string) {
  const transitions: Record<string, Array<{ to: string; label: string; icon: React.ReactNode }>> = {
    'todo': [
      { to: 'under_implementation', label: 'Start Work', icon: <Play className="w-3 h-3" /> },
      { to: 'blocked', label: 'Block', icon: <Hand className="w-3 h-3" /> },
    ],
    'open': [
      { to: 'under_implementation', label: 'Start Work', icon: <Play className="w-3 h-3" /> },
      { to: 'blocked', label: 'Block', icon: <Hand className="w-3 h-3" /> },
    ],
    'under_implementation': [
      { to: 'ready_for_qa', label: 'Submit for QA', icon: <CheckCircle className="w-3 h-3" /> },
      { to: 'blocked', label: 'Block', icon: <Hand className="w-3 h-3" /> },
    ],
    'in_progress': [
      { to: 'ready_for_qa', label: 'Submit for QA', icon: <CheckCircle className="w-3 h-3" /> },
      { to: 'blocked', label: 'Block', icon: <Hand className="w-3 h-3" /> },
    ],
    'ready_for_qa': [
      { to: 'uat_ready', label: 'Pass to UAT', icon: <CheckCircle className="w-3 h-3" /> },
      { to: 'rejected', label: 'Reject', icon: <XCircle className="w-3 h-3" /> },
    ],
    'rejected': [
      { to: 'under_implementation', label: 'Rework', icon: <RotateCcw className="w-3 h-3" /> },
    ],
    'blocked': [
      { to: 'todo', label: 'Unblock', icon: <Play className="w-3 h-3" /> },
    ],
    'uat_ready': [
      { to: 'in_beta', label: 'Deploy to Beta', icon: <Play className="w-3 h-3" /> },
      { to: 'rejected', label: 'UAT Failed', icon: <XCircle className="w-3 h-3" /> },
    ],
    'in_beta': [
      { to: 'ready_for_production', label: 'Ready for Prod', icon: <CheckCircle className="w-3 h-3" /> },
    ],
    'ready_for_production': [
      { to: 'in_production', label: 'Deploy', icon: <Play className="w-3 h-3" /> },
    ],
    'in_production': [
      { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3 h-3" /> },
    ],
    'monitor': [
      { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3 h-3" /> },
    ],
    'reopen': [
      { to: 'under_implementation', label: 'Start Fix', icon: <Play className="w-3 h-3" /> },
    ],
    'retest': [
      { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3 h-3" /> },
      { to: 'rejected', label: 'Fail Retest', icon: <XCircle className="w-3 h-3" /> },
    ],
    'awaiting_info': [
      { to: 'todo', label: 'Info Received', icon: <CheckCircle className="w-3 h-3" /> },
    ],
  };
  
  return transitions[currentStatus] || [
    { to: 'closed', label: 'Close', icon: <CheckCircle className="w-3 h-3" /> }
  ];
}

const avatarColors: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700' },
  green: { bg: 'bg-green-100', text: 'text-green-700' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS - Dense Enterprise Style
// ═══════════════════════════════════════════════════════════════════════════════

function ContentCard({ 
  title, 
  titleIcon,
  titleClass = 'text-gray-900',
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <h2 className={cn("text-[13px] font-semibold flex items-center gap-1.5", titleClass)}>
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase text-gray-500 tracking-wider">{title}</h3>
        {action}
      </div>
      <div className="px-4 py-1.5">{children}</div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-[13px] text-gray-500">{label}</span>
      <div className="text-[13px] text-gray-900 font-medium">{children}</div>
    </div>
  );
}

function Avatar({ user, size = 'sm' }: { user: { initials: string; color: string }; size?: 'xs' | 'sm' }) {
  const sizeClass = size === 'xs' ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-[11px]';
  const colorStyle = avatarColors[user.color] || avatarColors.gray;
  
  return (
    <div className={cn(sizeClass, "rounded-full flex items-center justify-center font-semibold flex-shrink-0", colorStyle.bg, colorStyle.text)}>
      {user.initials}
    </div>
  );
}

function IconButton({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function EditLink({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
      Edit
    </button>
  );
}

function AddLink({ label, small, onClick }: { label: string; small?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn("text-blue-600 hover:text-blue-700 font-medium", small ? "text-[10px]" : "text-[11px]")}>
      + {label}
    </button>
  );
}

function InlineEmpty({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
      <span className="text-[13px] text-gray-500">{message}</span>
      {action && (
        <button onClick={onAction} className="text-[13px] text-blue-600 hover:text-blue-700 font-medium">
          + {action}
        </button>
      )}
    </div>
  );
}

function ActivityItem({ item }: { item: { type: string; user: { name: string; initials: string; color: string }; content?: string; from?: string; to?: string; timestamp: string } }) {
  if (item.type === 'comment') {
    return (
      <div className="flex gap-3">
        <Avatar user={item.user} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-medium text-gray-900">{item.user.name}</span>
              <span className="text-[11px] text-gray-400">{item.timestamp}</span>
            </div>
            <p className="text-[13px] text-gray-700 leading-relaxed">{item.content}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
        <Clock className="w-3.5 h-3.5" />
      </div>
      <div className="pt-1.5">
        <p className="text-[13px] text-gray-600">
          <span className="font-medium text-gray-900">{item.user.name}</span>
          {' '}changed status{' '}
          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] font-mono">{item.from}</span>
          {' → '}
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[11px] font-mono">{item.to}</span>
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">{item.timestamp}</p>
      </div>
    </div>
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
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
      <div>
        <p className="text-[13px] text-gray-700">
          <span className="font-medium">{field}</span> changed from{' '}
          <span className="font-mono text-[11px] bg-gray-200 px-1.5 py-0.5 rounded">{from}</span> to{' '}
          <span className="font-mono text-[11px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{to}</span>
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">{user} • {time}</p>
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

  // Mock activity data
  const activity = [
    {
      type: 'comment',
      user: { name: 'Ahmed A.', initials: 'AA', color: 'green' },
      content: 'Investigating - seems related to CDN timeout settings. Will check with infrastructure team.',
      timestamp: '30 min ago'
    },
    {
      type: 'status_change',
      user: { name: 'Ahmed A.', initials: 'AA', color: 'green' },
      from: 'TODO',
      to: 'IN PROGRESS',
      timestamp: '1 hour ago'
    }
  ];

  // Mock attachments data
  const attachments = [
    { name: 'timeout-error.png', type: 'image', size: '128KB' },
    { name: 'screen-recording.mp4', type: 'video', size: '2.4MB' },
  ];

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

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied');
  }, []);

  // Not found state
  if (!defect) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Defect Not Found</h2>
          <p className="text-[13px] text-gray-500 mb-4">The defect {id} doesn't exist or was deleted.</p>
          <Button onClick={() => navigate('/releases/defects')} className="bg-blue-600 hover:bg-blue-700">
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
    { id: 'activity', label: 'Activity', count: activity.length },
    { id: 'linked', label: 'Linked Items', count: defect.linkedTestId ? 1 : 0 },
    { id: 'history', label: 'History' },
  ];

  const assigneeColor = avatarColors[defect.assignee?.color || 'gray'] || avatarColors.gray;

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER - Full Width, Dense                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-6">
          
          {/* Row 1: Breadcrumb + ID + Badges + Actions (44px height) */}
          <div className="flex items-center justify-between h-11 border-b border-gray-100">
            {/* Left */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/releases/defects')}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-[13px] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Defects
              </button>
              
              <span className="text-gray-300">/</span>
              
              <span className="text-[15px] font-bold font-mono text-blue-600">
                {defect.id}
              </span>
              
              <div className="flex items-center gap-1.5">
                <SeverityBadge severity={defect.severity} />
                <PriorityBadge priority={defect.priority || 'P3'} size="sm" />
                <DefectStatusBadge status={defect.status} />
              </div>
            </div>
            
            {/* Right */}
            <div className="flex items-center gap-2">
              {/* Assignee Chip */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-[13px]">
                {defect.assignee && defect.assignee.initials !== '?' ? (
                  <>
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold", assigneeColor.bg, assigneeColor.text)}>
                      {defect.assignee.initials}
                    </div>
                    <span className="font-medium text-gray-700">{defect.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-gray-500">Unassigned</span>
                )}
              </div>
              
              <div className="h-4 w-px bg-gray-200" />
              
              <IconButton icon={Eye} label="Watch" />
              <IconButton icon={Share2} label="Share" onClick={handleCopyLink} />
              <IconButton icon={Copy} label="Copy Link" onClick={handleCopyLink} />
              
              <div className="h-4 w-px bg-gray-200" />
              
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)} className="h-7 px-2.5 text-[13px]">
                <Edit className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsReassignModalOpen(true)} className="h-7 px-2.5 text-[13px]">
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Reassign
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 bg-white">
                  <DropdownMenuItem onClick={handleCopyLink} className="text-[13px]">
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-[13px]">
                    <Link2 className="w-3.5 h-3.5 mr-2" />
                    Link Test Case
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600 text-[13px]">
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Row 2: Title with Severity Border + Quick Actions */}
          <div className="flex items-start justify-between gap-6 py-3">
            {/* Title with LEFT BORDER for severity */}
            <div className={cn("flex-1 pl-4 border-l-[3px]", getSeverityBorderColor(defect.severity))}>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                {defect.title}
              </h1>
              <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-1">
                {defect.description?.substring(0, 120)}...
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[13px] text-gray-500">Move to:</span>
              {quickTransitions.map((t, i) => (
                <Button
                  key={t.to}
                  variant={i === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusChange(t.to)}
                  className={cn("h-7 px-3 text-[13px] gap-1.5", i === 0 ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-gray-50")}
                >
                  {t.icon}
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Row 3: Tabs (36px) */}
          <div className="flex items-center gap-0 border-t border-gray-100">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "text-blue-600 border-blue-600"
                    : "text-gray-500 hover:text-gray-700 border-transparent"
                )}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          
        </div>
      </header>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT - Full Width, Two Column                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <main className="w-full px-6 py-4">
        <div className="flex gap-6">
          
          {/* LEFT COLUMN: Content (flex-1) */}
          <div className="flex-1 space-y-4 min-w-0">
            
            {activeTab === 'details' && (
              <>
                {/* Description */}
                <ContentCard title="Description" action={<EditLink onClick={() => setIsEditModalOpen(true)} />}>
                  {defect.description ? (
                    <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {defect.description}
                    </p>
                  ) : (
                    <InlineEmpty message="No description" action="Add description" onAction={() => setIsEditModalOpen(true)} />
                  )}
                </ContentCard>
                
                {/* Steps to Reproduce */}
                <ContentCard title="Steps to Reproduce" action={<EditLink onClick={() => setIsEditModalOpen(true)} />}>
                  {defect.stepsToReproduce ? (
                    <div className="bg-gray-50 rounded p-4 font-mono text-[13px] text-gray-700 border-l-[3px] border-blue-500 whitespace-pre-wrap leading-relaxed">
                      {defect.stepsToReproduce}
                    </div>
                  ) : (
                    <InlineEmpty message="No steps provided" action="Add steps" onAction={() => setIsEditModalOpen(true)} />
                  )}
                </ContentCard>
                
                {/* Expected vs Actual - Side by Side */}
                <div className="grid grid-cols-2 gap-4">
                  <ContentCard 
                    title="Expected Result" 
                    titleIcon={<CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                    titleClass="text-emerald-700"
                  >
                    {defect.expectedResult ? (
                      <div className="bg-emerald-50 rounded p-4 text-[13px] text-gray-700 border-l-[3px] border-emerald-500 leading-relaxed">
                        {defect.expectedResult}
                      </div>
                    ) : (
                      <InlineEmpty message="Not provided" />
                    )}
                  </ContentCard>
                  
                  <ContentCard 
                    title="Actual Result" 
                    titleIcon={<XCircle className="w-3.5 h-3.5 text-red-500" />}
                    titleClass="text-red-700"
                  >
                    {defect.actualResult ? (
                      <div className="bg-red-50 rounded p-4 text-[13px] text-gray-700 border-l-[3px] border-red-500 leading-relaxed">
                        {defect.actualResult}
                      </div>
                    ) : (
                      <InlineEmpty message="Not provided" />
                    )}
                  </ContentCard>
                </div>
                
                {/* Attachments */}
                <ContentCard 
                  title={`Attachments (${attachments.length})`} 
                  action={<AddLink label="Add" />}
                >
                  <div className="flex flex-wrap gap-3">
                    {attachments.map((file, i) => (
                      <div 
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors"
                      >
                        {file.type === 'image' ? (
                          <Image className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Video className="w-4 h-4 text-purple-500" />
                        )}
                        <span className="text-[13px] text-gray-700">{file.name}</span>
                        <span className="text-[11px] text-gray-400">{file.size}</span>
                      </div>
                    ))}
                  </div>
                </ContentCard>
                
                {/* Activity Preview */}
                <ContentCard title="Activity">
                  {/* Comment Input */}
                  <div className="flex gap-3 pb-4 border-b border-gray-100">
                    <Avatar user={{ initials: 'VS', color: 'blue' }} size="sm" />
                    <div className="flex-1">
                      <Textarea 
                        placeholder="Add a comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[64px] text-[13px] resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={handleAddComment}
                          disabled={!comment.trim()}
                          className="h-7 px-3 text-[13px] bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="w-3 h-3 mr-1.5" />
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Timeline */}
                  <div className="space-y-3 pt-4">
                    {activity.map((item, i) => (
                      <ActivityItem key={i} item={item} />
                    ))}
                    
                    {/* Creation Event */}
                    {defect.reporter && (
                      <div className="flex gap-3">
                        <Avatar user={defect.reporter} size="sm" />
                        <div className="pt-1.5">
                          <p className="text-[13px] text-gray-600">
                            <span className="font-medium text-gray-900">{defect.reporter.name}</span>
                            {' '}created this defect
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{defect.createdAt}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </ContentCard>
              </>
            )}
            
            {activeTab === 'reproduction' && (
              <>
                <ContentCard title="Steps to Reproduce" action={<EditLink onClick={() => setIsEditModalOpen(true)} />}>
                  {defect.stepsToReproduce ? (
                    <div className="bg-gray-50 rounded p-4 font-mono text-[13px] text-gray-700 border-l-[3px] border-blue-500 whitespace-pre-wrap leading-relaxed">
                      {defect.stepsToReproduce}
                    </div>
                  ) : (
                    <InlineEmpty message="No steps provided" action="Add steps" onAction={() => setIsEditModalOpen(true)} />
                  )}
                </ContentCard>
                
                <div className="grid grid-cols-2 gap-4">
                  <ContentCard 
                    title="Expected Result" 
                    titleIcon={<CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                    titleClass="text-emerald-700"
                  >
                    {defect.expectedResult ? (
                      <div className="bg-emerald-50 rounded p-4 text-[13px] text-gray-700 border-l-[3px] border-emerald-500 leading-relaxed">
                        {defect.expectedResult}
                      </div>
                    ) : (
                      <InlineEmpty message="Not provided" />
                    )}
                  </ContentCard>
                  
                  <ContentCard 
                    title="Actual Result" 
                    titleIcon={<XCircle className="w-3.5 h-3.5 text-red-500" />}
                    titleClass="text-red-700"
                  >
                    {defect.actualResult ? (
                      <div className="bg-red-50 rounded p-4 text-[13px] text-gray-700 border-l-[3px] border-red-500 leading-relaxed">
                        {defect.actualResult}
                      </div>
                    ) : (
                      <InlineEmpty message="Not provided" />
                    )}
                  </ContentCard>
                </div>
                
                <ContentCard 
                  title={`Attachments (${attachments.length})`} 
                  action={<AddLink label="Add" />}
                >
                  <div className="flex flex-wrap gap-3">
                    {attachments.map((file, i) => (
                      <div 
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors"
                      >
                        {file.type === 'image' ? (
                          <Image className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Video className="w-4 h-4 text-purple-500" />
                        )}
                        <span className="text-[13px] text-gray-700">{file.name}</span>
                        <span className="text-[11px] text-gray-400">{file.size}</span>
                      </div>
                    ))}
                  </div>
                </ContentCard>
              </>
            )}
            
            {activeTab === 'activity' && (
              <ContentCard title="Activity & Comments">
                {/* Comment Input */}
                <div className="flex gap-3 pb-4 border-b border-gray-100">
                  <Avatar user={{ initials: 'VS', color: 'blue' }} size="sm" />
                  <div className="flex-1">
                    <Textarea 
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-[80px] text-[13px] resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <Button 
                        size="sm" 
                        onClick={handleAddComment}
                        disabled={!comment.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Timeline */}
                <div className="space-y-4 pt-4">
                  {activity.map((item, i) => (
                    <ActivityItem key={i} item={item} />
                  ))}
                  
                  {defect.reporter && (
                    <div className="flex gap-3">
                      <Avatar user={defect.reporter} size="sm" />
                      <div className="pt-1.5">
                        <p className="text-[13px] text-gray-600">
                          <span className="font-medium text-gray-900">{defect.reporter.name}</span>
                          {' '}created this defect
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{defect.createdAt}</p>
                      </div>
                    </div>
                  )}
                </div>
              </ContentCard>
            )}
            
            {activeTab === 'linked' && (
              <ContentCard title="Linked Items" action={<AddLink label="Link Item" />}>
                {defect.linkedTestId ? (
                  <div className="space-y-2">
                    <a 
                      href="#"
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-teal-100 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-teal-600" />
                        </div>
                        <div>
                          <p className="text-[13px] font-mono font-medium text-teal-600 group-hover:text-teal-700">
                            {defect.linkedTestId}
                          </p>
                          <p className="text-[11px] text-gray-500">Test Case • Payment flow validation</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    </a>
                  </div>
                ) : (
                  <InlineEmpty message="No linked items" action="Link a test case" />
                )}
              </ContentCard>
            )}
            
            {activeTab === 'history' && (
              <ContentCard title="Change History">
                <div className="space-y-2">
                  <HistoryItem 
                    field="Status"
                    from="TODO"
                    to="IN PROGRESS"
                    user="Ahmed A."
                    time="1 hour ago"
                  />
                  <HistoryItem 
                    field="Assignee"
                    from="Unassigned"
                    to="Ahmed A."
                    user="Sara K."
                    time="2 hours ago"
                  />
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-[13px] text-gray-700">
                        Defect <span className="font-medium">created</span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{defect.reporter?.name || 'Unknown'} • {defect.createdAt}</p>
                    </div>
                  </div>
                </div>
              </ContentCard>
            )}
            
          </div>
          
          {/* RIGHT COLUMN: Sidebar (w-96 = 384px) */}
          <div className="w-96 flex-shrink-0 space-y-3">
            
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
                <span className="font-mono text-[12px] text-gray-900">{defect.releaseId || '—'}</span>
              </FieldRow>
              <FieldRow label="Environment">
                {defect.environment || '—'}
              </FieldRow>
              <FieldRow label="Module">
                {defect.module || '—'}
              </FieldRow>
              <FieldRow label="Browser">
                {defect.browser || '—'}
              </FieldRow>
            </SidebarPanel>
            
            {/* People Panel */}
            <SidebarPanel title="People">
              <FieldRow label="Assignee">
                {defect.assignee && defect.assignee.initials !== '?' ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar user={defect.assignee} size="xs" />
                    <span className="text-[13px]">{defect.assignee.name}</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsReassignModalOpen(true)}
                    className="text-[13px] text-blue-600 hover:text-blue-700"
                  >
                    + Assign
                  </button>
                )}
              </FieldRow>
              <FieldRow label="Reporter">
                {defect.reporter ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar user={defect.reporter} size="xs" />
                    <span className="text-[13px]">{defect.reporter.name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </FieldRow>
            </SidebarPanel>
            
            {/* Timeline Panel */}
            <SidebarPanel title="Timeline">
              <FieldRow label="Created">
                <span className="text-[12px]">{defect.createdAt}</span>
              </FieldRow>
              <FieldRow label="Updated">
                <span className="text-[12px]">{defect.updatedAt || defect.createdAt}</span>
              </FieldRow>
            </SidebarPanel>
            
            {/* Linked Items Panel */}
            <SidebarPanel title="Linked Items" action={<AddLink label="Link" small />}>
              {defect.linkedTestId ? (
                <a 
                  href="#"
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
                >
                  <div className="w-5 h-5 rounded bg-teal-100 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-teal-600" />
                  </div>
                  <span className="text-[12px] font-mono text-teal-600 font-medium">{defect.linkedTestId}</span>
                  <ExternalLink className="w-3 h-3 text-gray-400 ml-auto" />
                </a>
              ) : (
                <p className="text-[12px] text-gray-400 py-2">No linked items</p>
              )}
            </SidebarPanel>
            
            {/* Related Defects Panel */}
            <SidebarPanel title="Related Defects">
              <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors">
                <span className="font-mono text-[12px] text-blue-600 font-medium">DEF-088</span>
                <span className="text-[12px] text-gray-600 truncate flex-1">Login button unresponsive</span>
              </a>
              <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors">
                <span className="font-mono text-[12px] text-blue-600 font-medium">DEF-087</span>
                <span className="text-[12px] text-gray-600 truncate flex-1">Dashboard charts dark mode</span>
              </a>
            </SidebarPanel>
            
          </div>
          
        </div>
      </main>
      
      {/* Modals */}
      {isEditModalOpen && defect && (
        <EditDefectModal 
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          defect={defect}
          onSave={handleSave}
        />
      )}
      
      {isReassignModalOpen && defect && (
        <ReassignModal
          open={isReassignModalOpen}
          onOpenChange={setIsReassignModalOpen}
          defectId={defect.id}
          defectTitle={defect.title}
          currentAssignee={defect.assignee || null}
          onReassign={handleReassign}
        />
      )}
      
    </div>
  );
}
