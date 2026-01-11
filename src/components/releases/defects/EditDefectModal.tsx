import { useState, useEffect } from 'react';
import { Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Defect, releaseOptions, getAssigneeById, testCaseOptions } from '@/data/defectsData';

interface EditDefectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defect: Defect;
  onSave: (defect: Defect) => void;
}

interface FormData {
  title: string;
  description: string;
  severity: string;
  priority: string;
  status: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  releaseId: string;
  linkedTestId: string;
  assigneeId: string;
  defectType: string;
  module: string;
  environment: string;
  browser: string;
  os: string;
  url: string;
}

const severityOptions = [
  { value: 'blocker', label: 'Blocker' },
  { value: 'critical', label: 'Critical' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'trivial', label: 'Trivial' },
];

const priorityOptions = [
  { value: 'P1', label: 'P1 - Critical' },
  { value: 'P2', label: 'P2 - High' },
  { value: 'P3', label: 'P3 - Medium' },
  { value: 'P4', label: 'P4 - Low' },
];

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'under_implementation', label: 'Under Implementation' },
  { value: 'ready_for_qa', label: 'Ready for QA' },
  { value: 'in_qa', label: 'In QA' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'reopened', label: 'Reopened' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'awaiting_info', label: 'Awaiting Info' },
];

const assigneeOptions = [
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'VS', label: 'Vikram S.' },
  { value: 'AA', label: 'Ahmed A.' },
  { value: 'SK', label: 'Sara K.' },
  { value: 'MR', label: 'Mohammed R.' },
];

const environmentOptions = [
  { value: 'none', label: 'Select environment' },
  { value: 'development', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'uat', label: 'UAT' },
  { value: 'production', label: 'Production' },
];

export function EditDefectModal({ open, onOpenChange, defect, onSave }: EditDefectModalProps) {
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    severity: '',
    priority: '',
    status: '',
    stepsToReproduce: '',
    expectedResult: '',
    actualResult: '',
    releaseId: '',
    linkedTestId: 'none',
    assigneeId: '',
    defectType: '',
    module: '',
    environment: '',
    browser: '',
    os: '',
    url: '',
  });

  // Pre-fill form when defect changes
  useEffect(() => {
    if (defect) {
      setForm({
        title: defect.title || '',
        description: defect.description || '',
        severity: defect.severity || '',
        priority: defect.priority || 'P3',
        status: defect.status || 'open',
        stepsToReproduce: defect.stepsToReproduce || '',
        expectedResult: defect.expectedResult || '',
        actualResult: defect.actualResult || '',
        releaseId: defect.releaseId || '',
        linkedTestId: defect.linkedTestId && defect.linkedTestId.trim() !== '' ? defect.linkedTestId : 'none',
        assigneeId: defect.assignee?.initials || 'unassigned',
        defectType: defect.defectType || '',
        module: defect.module || '',
        environment: defect.environment || 'none',
        browser: defect.browser || '',
        os: defect.os || '',
        url: defect.url || '',
      });
    }
  }, [defect, open]);

  const handleSave = () => {
    const updatedDefect: Defect = {
      ...defect,
      title: form.title,
      description: form.description,
      severity: form.severity as Defect['severity'],
      priority: form.priority,
      status: form.status,
      stepsToReproduce: form.stepsToReproduce,
      expectedResult: form.expectedResult,
      actualResult: form.actualResult,
      releaseId: form.releaseId,
      linkedTestId: form.linkedTestId === 'none' ? null : form.linkedTestId,
      assignee: form.assigneeId && form.assigneeId !== 'unassigned' ? getAssigneeById(form.assigneeId) : { name: 'Unassigned', initials: '?', color: 'gray' },
      defectType: form.defectType,
      module: form.module,
      environment: form.environment === 'none' ? '' : form.environment,
      browser: form.browser,
      os: form.os,
      url: form.url,
      updatedAt: 'Just now',
    };
    onSave(updatedDefect);
    onOpenChange(false);
  };

  const updateField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 bg-card">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted rounded-t-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Edit className="w-5 h-5 text-primary" />
              Edit Defect
              <span className="font-mono text-primary">{defect?.id}</span>
            </DialogTitle>
          </DialogHeader>
        </div>
        
        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Defect title"
              className="bg-background"
            />
          </div>

          {/* Status, Severity, Priority Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Severity *</Label>
              <Select value={form.severity} onValueChange={(v) => updateField('severity', v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {severityOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => updateField('priority', v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {priorityOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Release and Assignee Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Release *</Label>
              <Select value={form.releaseId} onValueChange={(v) => updateField('releaseId', v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select release" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {releaseOptions.filter(r => r.value !== 'all').map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Assignee</Label>
              <Select value={form.assigneeId} onValueChange={(v) => updateField('assigneeId', v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {assigneeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linked Test Case */}
          <div className="space-y-2">
            <Label className="text-foreground">Linked Test Case</Label>
            <Select value={form.linkedTestId} onValueChange={(v) => updateField('linkedTestId', v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select test case" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {testCaseOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Steps to Reproduce */}
          <div className="space-y-2">
            <Label className="text-foreground">Steps to Reproduce *</Label>
            <Textarea
              value={form.stepsToReproduce}
              onChange={(e) => updateField('stepsToReproduce', e.target.value)}
              placeholder="1. Navigate to...\n2. Click on...\n3. Observe..."
              rows={4}
              className="bg-background font-mono text-sm"
            />
          </div>

          {/* Expected and Actual Results */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Expected Result *</Label>
              <Textarea
                value={form.expectedResult}
                onChange={(e) => updateField('expectedResult', e.target.value)}
                placeholder="What should happen..."
                rows={3}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Actual Result *</Label>
              <Textarea
                value={form.actualResult}
                onChange={(e) => updateField('actualResult', e.target.value)}
                placeholder="What actually happened..."
                rows={3}
                className="bg-background"
              />
            </div>
          </div>

          {/* Environment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Environment</Label>
              <Select value={form.environment} onValueChange={(v) => updateField('environment', v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {environmentOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Browser</Label>
              <Input
                value={form.browser}
                onChange={(e) => updateField('browser', e.target.value)}
                placeholder="e.g., Chrome 120"
                className="bg-background"
              />
            </div>
          </div>

          {/* OS and URL */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Operating System</Label>
              <Input
                value={form.os}
                onChange={(e) => updateField('os', e.target.value)}
                placeholder="e.g., Windows 11"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">URL</Label>
              <Input
                value={form.url}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder="https://..."
                className="bg-background"
              />
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted rounded-b-lg flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
