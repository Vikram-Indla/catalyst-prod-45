/**
 * Create/Edit Defect Modal
 */

import React, { useState, useEffect } from 'react';
import { Flame, AlertTriangle, Info, Minus, Link2, Paperclip, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Defect, DefectSeverity, DefectStatus, TestCase } from '../../api/types';

interface CreateDefectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defect?: Defect | null;
  prefillData?: {
    title?: string;
    description?: string;
    linkedCaseId?: string;
    linkedRunId?: string;
    linkedStepId?: string;
    linkedCaseKey?: string;
  };
  teamMembers?: Array<{ id: string; full_name: string }>;
  testCases?: TestCase[];
  onSubmit: (data: {
    title: string;
    description?: string;
    severity: DefectSeverity;
    status?: DefectStatus;
    assigned_to?: string;
    linked_run_id?: string;
    linked_step_id?: string;
    external_tracker_id?: string;
    external_tracker_url?: string;
  }) => void;
  duplicates?: Array<{
    id: string;
    defect_key: string;
    title: string;
    status: DefectStatus;
    match_percent: number;
  }>;
  onCheckDuplicates?: (title: string) => void;
  onMarkAsDuplicate?: (originalDefectId: string) => void;
  isLoading?: boolean;
}

const SEVERITY_OPTIONS: { value: DefectSeverity; label: string; icon: React.ElementType; className: string }[] = [
  { value: 'critical', label: 'Critical', icon: Flame, className: 'text-danger' },
  { value: 'major', label: 'Major', icon: AlertTriangle, className: 'text-warning' },
  { value: 'minor', label: 'Minor', icon: Info, className: 'text-yellow-500' },
  { value: 'trivial', label: 'Trivial', icon: Minus, className: 'text-muted-foreground' },
];

const STATUS_OPTIONS: { value: DefectStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Fixed' },
  { value: 'closed', label: 'Closed' },
  { value: 'wont_fix', label: "Won't Fix" },
];

export function CreateDefectModal({
  open,
  onOpenChange,
  defect,
  prefillData,
  teamMembers = [],
  testCases = [],
  onSubmit,
  duplicates = [],
  onCheckDuplicates,
  onMarkAsDuplicate,
  isLoading,
}: CreateDefectModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<DefectSeverity>('major');
  const [status, setStatus] = useState<DefectStatus>('open');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [linkedRunId, setLinkedRunId] = useState<string>('');
  const [linkedStepId, setLinkedStepId] = useState<string>('');
  const [externalId, setExternalId] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [showDuplicates, setShowDuplicates] = useState(false);

  // Initialize form
  useEffect(() => {
    if (defect) {
      setTitle(defect.title);
      setDescription(defect.description || '');
      setSeverity(defect.severity);
      setStatus(defect.status);
      setAssigneeId(defect.assigned_to || '');
      setLinkedRunId(defect.linked_run_id || '');
      setLinkedStepId(defect.linked_step_id || '');
      setExternalId(defect.external_tracker_id || '');
      setExternalUrl(defect.external_tracker_url || '');
    } else if (prefillData) {
      setTitle(prefillData.title || '');
      setDescription(prefillData.description || '');
      setLinkedRunId(prefillData.linkedRunId || '');
      setLinkedStepId(prefillData.linkedStepId || '');
      setSeverity('major');
      setStatus('open');
      setAssigneeId('');
      setExternalId('');
      setExternalUrl('');
    } else {
      setTitle('');
      setDescription('');
      setSeverity('major');
      setStatus('open');
      setAssigneeId('');
      setLinkedRunId('');
      setLinkedStepId('');
      setExternalId('');
      setExternalUrl('');
    }
    setShowDuplicates(false);
  }, [defect, prefillData, open]);

  // Check for duplicates when title changes
  useEffect(() => {
    const words = title.trim().split(/\s+/);
    if (words.length >= 3 && onCheckDuplicates) {
      const timeout = setTimeout(() => {
        onCheckDuplicates(title);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [title, onCheckDuplicates]);

  useEffect(() => {
    if (duplicates.length > 0) {
      setShowDuplicates(true);
    }
  }, [duplicates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || undefined,
      severity,
      status,
      assigned_to: assigneeId || undefined,
      linked_run_id: linkedRunId || undefined,
      linked_step_id: linkedStepId || undefined,
      external_tracker_id: externalId || undefined,
      external_tracker_url: externalUrl || undefined,
    });
  };

  const isEdit = !!defect;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Defect' : 'Create Defect'}</DialogTitle>
        </DialogHeader>
        
        {/* Duplicate warning */}
        {showDuplicates && duplicates.length > 0 && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="font-medium">Possible Duplicates Found</span>
            </div>
            <div className="space-y-2">
              {duplicates.map((dup) => (
                <div 
                  key={dup.id}
                  className="flex items-center justify-between bg-background rounded-md p-2 text-sm"
                >
                  <div>
                    <span className="font-mono text-primary">{dup.defect_key}</span>
                    <span className="mx-2">—</span>
                    <span className="text-muted-foreground">{dup.title}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {dup.match_percent}% match
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open(`/tests/defects?highlight=${dup.id}`, '_blank')}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              {duplicates.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onMarkAsDuplicate?.(duplicates[0].id)}
                >
                  Mark as Duplicate of {duplicates[0].defect_key}
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowDuplicates(false)}
              >
                Continue - Not a Duplicate
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Login button unresponsive on Chrome browser"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Steps to reproduce, expected vs actual behavior..."
                rows={5}
                required
              />
            </div>

            {/* Severity, Status, Assignee */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Severity *</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as DefectSeverity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn('h-4 w-4', opt.className)} />
                            {opt.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as DefectStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select 
                  value={assigneeId || 'unassigned'} 
                  onValueChange={(v) => setAssigneeId(v === 'unassigned' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Link to Test (show linked info if prefilled) */}
            {(prefillData?.linkedCaseKey || linkedRunId) && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <Label className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Link to Test
                </Label>
                {prefillData?.linkedCaseKey && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Test Case:</span>
                    <Badge variant="outline" className="font-mono">
                      {prefillData.linkedCaseKey}
                    </Badge>
                  </div>
                )}
                {linkedRunId && (
                  <div className="text-sm text-muted-foreground">
                    Linked to execution run
                  </div>
                )}
              </div>
            )}

            {/* External Link */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-3">
              <Label className="flex items-center gap-2">
                External Link (optional)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    placeholder="JIRA-1234"
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    placeholder="https://jira.company.com/JIRA-1234"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    type="url"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title || !description || isLoading}>
              {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Defect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
