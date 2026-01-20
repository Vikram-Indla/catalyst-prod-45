/**
 * Module 3A-4: Quick Create Defect Dialog
 * Auto-populated form to create a defect from failure context
 */

import { useState, useEffect } from 'react';
import { Bug, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FailedStepContext, DefectSeverity, QuickCreateDefectInput } from '../../types/defect-linking';

interface QuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  stepResultId: string;
  runId?: string;
  context: FailedStepContext;
  isCreating: boolean;
  onCreate: (input: QuickCreateDefectInput) => void;
}

const SEVERITY_OPTIONS: { value: DefectSeverity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'trivial', label: 'Trivial' },
];

function generateDescription(context: FailedStepContext): string {
  const lines = [
    `**Test Case:** ${context.test_case.case_number} - ${context.test_case.title}`,
    '',
    `**Step ${context.step_number}:**`,
    `Action: ${context.action}`,
    '',
    `**Expected Result:**`,
    context.expected_result,
    '',
    `**Actual Result:**`,
    context.actual_result || 'Not specified',
  ];

  if (context.run) {
    lines.push('', `**Environment:** ${context.run.environment || 'N/A'}`);
  }

  return lines.join('\n');
}

export function QuickCreateDialog({
  open,
  onOpenChange,
  projectId,
  stepResultId,
  runId,
  context,
  isCreating,
  onCreate,
}: QuickCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<DefectSeverity>('major');

  // Auto-populate when dialog opens
  useEffect(() => {
    if (open && context) {
      setTitle(`Step ${context.step_number} failed: ${context.action.slice(0, 80)}${context.action.length > 80 ? '...' : ''}`);
      setDescription(generateDescription(context));
      setSeverity('major');
    }
  }, [open, context]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    onCreate({
      project_id: projectId,
      step_result_id: stepResultId,
      run_id: runId,
      title: title.trim(),
      description: description.trim() || undefined,
      severity,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-destructive" />
            Quick Create Defect
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="defect-title">Title *</Label>
            <Input
              id="defect-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Describe the defect..."
            />
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as DefectSeverity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="defect-description">Description</Label>
            <Textarea
              id="defect-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Steps to reproduce..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim() || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Bug className="h-4 w-4 mr-2" />
                Create & Link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
