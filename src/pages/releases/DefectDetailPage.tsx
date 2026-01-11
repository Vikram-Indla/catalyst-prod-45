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
  FileText,
  Clock,
  AlertTriangle,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { EditDefectModal } from '@/components/releases/defects/EditDefectModal';
import { ReassignModal } from '@/components/releases/defects/ReassignModal';
import { defectsData, Defect, getAssigneeById } from '@/data/defectsData';
import { cn } from '@/lib/utils';

export default function DefectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [defect, setDefect] = useState<Defect | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

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

  const avatarColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    teal: 'bg-teal-100 text-teal-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-amber-100 text-amber-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-teal-100 text-teal-700',
    gray: 'bg-muted text-muted-foreground',
  };

  if (!defect) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Defect Not Found</h2>
          <p className="text-muted-foreground mb-4">The defect you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/releases/defects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Defects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/releases/defects')}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Defects
              </Button>
              <div className="h-6 w-px bg-border" />
              <span className="font-mono text-lg font-bold text-primary">{defect.id}</span>
              <SeverityBadge severity={defect.severity} />
              <DefectStatusBadge status={defect.status} />
            </div>
            
            <div className="flex items-center gap-2">
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
                    Actions
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onClick={() => handleStatusChange('ready_for_qa')}>
                    <CheckCircle className="w-4 h-4 mr-2 text-teal-600" />
                    Move to Ready for QA
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('resolved')}>
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    Mark Resolved
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('closed')}>
                    <XCircle className="w-4 h-4 mr-2 text-muted-foreground" />
                    Close Defect
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
      
      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-8">
          
          {/* Main Content - 2 columns */}
          <div className="col-span-2 space-y-6">
            
            {/* Title */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h1 className="text-xl font-semibold text-foreground">{defect.title}</h1>
              {defect.description && (
                <p className="mt-3 text-sm text-muted-foreground">{defect.description}</p>
              )}
            </div>
            
            {/* Steps to Reproduce */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Steps to Reproduce
              </h2>
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
                {defect.stepsToReproduce || 'No steps provided'}
              </pre>
            </div>
            
            {/* Expected vs Actual */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Expected Result
                </h2>
                <p className="text-sm text-foreground">
                  {defect.expectedResult || 'No expected result provided'}
                </p>
              </div>
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-sm font-semibold text-destructive uppercase tracking-wide mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Actual Result
                </h2>
                <p className="text-sm text-foreground">
                  {defect.actualResult || 'No actual result provided'}
                </p>
              </div>
            </div>
            
            {/* Environment Details */}
            {(defect.environment || defect.browser || defect.os || defect.url) && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Environment Details
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {defect.environment && (
                    <div>
                      <span className="text-muted-foreground">Environment:</span>
                      <span className="ml-2 text-foreground">{defect.environment}</span>
                    </div>
                  )}
                  {defect.browser && (
                    <div>
                      <span className="text-muted-foreground">Browser:</span>
                      <span className="ml-2 text-foreground">{defect.browser}</span>
                    </div>
                  )}
                  {defect.os && (
                    <div>
                      <span className="text-muted-foreground">OS:</span>
                      <span className="ml-2 text-foreground">{defect.os}</span>
                    </div>
                  )}
                  {defect.device && (
                    <div>
                      <span className="text-muted-foreground">Device:</span>
                      <span className="ml-2 text-foreground">{defect.device}</span>
                    </div>
                  )}
                  {defect.url && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">URL:</span>
                      <a href={defect.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">
                        {defect.url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Activity / Comments */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Activity
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                    avatarColors[defect.reporter?.color] || avatarColors.gray
                  )}>
                    {defect.reporter?.initials || 'VS'}
                  </div>
                  <div>
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{defect.reporter?.name || 'Vikram S.'}</span>
                      {' '}created this defect
                    </p>
                    <p className="text-xs text-muted-foreground">{defect.createdAt}</p>
                  </div>
                </div>
                {defect.updatedAt !== defect.createdAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground">Defect was updated</p>
                      <p className="text-xs text-muted-foreground">{defect.updatedAt}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
          </div>
          
          {/* Sidebar - 1 column */}
          <div className="space-y-4">
            
            {/* Details Card */}
            <div className="bg-card rounded-lg border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Details</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <DefectStatusBadge status={defect.status} />
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Severity</span>
                  <SeverityBadge severity={defect.severity} />
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Priority</span>
                  <span className="font-medium text-foreground">{defect.priority || 'P3'}</span>
                </div>
                
                {defect.defectType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium text-foreground">{defect.defectType}</span>
                  </div>
                )}
                
                {defect.module && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Module</span>
                    <span className="font-medium text-foreground">{defect.module}</span>
                  </div>
                )}
                
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Release</span>
                    <span className="font-medium text-foreground">{defect.releaseId}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Linked Test</span>
                  {defect.linkedTestId ? (
                    <a href="#" className="text-primary hover:underline flex items-center gap-1">
                      {defect.linkedTestId}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground/50">None</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* People Card */}
            <div className="bg-card rounded-lg border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground">People</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Assignee</span>
                  {defect.assignee && defect.assignee.initials !== '?' ? (
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                        avatarColors[defect.assignee.color] || avatarColors.gray
                      )}>
                        {defect.assignee.initials}
                      </div>
                      <span className="text-foreground">{defect.assignee.name}</span>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setIsReassignModalOpen(true)}>
                      <UserPlus className="w-3 h-3 mr-1" />
                      Assign
                    </Button>
                  )}
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Reporter</span>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      avatarColors[defect.reporter?.color] || avatarColors.gray
                    )}>
                      {defect.reporter?.initials || 'VS'}
                    </div>
                    <span className="text-foreground">{defect.reporter?.name || 'Vikram S.'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Dates Card */}
            <div className="bg-card rounded-lg border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Dates</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">{defect.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="text-foreground">{defect.updatedAt || defect.createdAt}</span>
                </div>
              </div>
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
        currentAssignee={defect.assignee}
        onReassign={handleReassign}
      />
    </div>
  );
}
