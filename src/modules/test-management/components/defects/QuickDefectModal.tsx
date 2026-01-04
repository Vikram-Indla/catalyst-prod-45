/**
 * Quick Defect Modal - Enhanced
 * Auto-populated context, visual severity pills, Jira integration option
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Bug,
  Loader2,
  ExternalLink,
  Paperclip,
  AlertTriangle,
  AlertCircle,
  Info,
  MinusCircle,
  FileText,
  Beaker,
  Server,
} from 'lucide-react';
import type { DefectSeverity, ExecutionStatus } from '../../api/types';

interface QuickDefectContext {
  caseKey?: string;
  caseTitle?: string;
  cycleId?: string;
  cycleName?: string;
  stepNumber?: number;
  stepAction?: string;
  expectedResult?: string;
  actualResult?: string;
  environment?: string;
  runId?: string;
  stepId?: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
}

interface QuickDefectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: QuickDefectContext;
  onSubmit: (data: DefectSubmitData) => Promise<void>;
}

export interface DefectSubmitData {
  title: string;
  description: string;
  severity: DefectSeverity;
  priority: string;
  attachmentIds: string[];
  createJiraIssue: boolean;
  linkedRunId?: string;
  linkedStepId?: string;
}

const SEVERITY_OPTIONS: Array<{
  value: DefectSeverity;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}> = [
  {
    value: 'critical',
    label: 'Critical',
    icon: AlertTriangle,
    color: 'bg-red-500 hover:bg-red-600 text-white',
    description: 'System crash or data loss',
  },
  {
    value: 'major',
    label: 'Major',
    icon: AlertCircle,
    color: 'bg-orange-500 hover:bg-orange-600 text-white',
    description: 'Major feature broken',
  },
  {
    value: 'minor',
    label: 'Minor',
    icon: Info,
    color: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    description: 'Minor inconvenience',
  },
  {
    value: 'trivial',
    label: 'Trivial',
    icon: MinusCircle,
    color: 'bg-gray-500 hover:bg-gray-600 text-white',
    description: 'Cosmetic issue',
  },
];

export function QuickDefectModal({
  open,
  onOpenChange,
  context,
  onSubmit,
}: QuickDefectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [severity, setSeverity] = useState<DefectSeverity>('major');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [createJiraIssue, setCreateJiraIssue] = useState(false);

  // Auto-generate title from context
  const generatedTitle = useMemo(() => {
    if (context.caseKey && context.stepNumber) {
      return `[${context.caseKey}] Step ${context.stepNumber}: ${context.stepAction?.slice(0, 50) || 'Failed'}`;
    }
    if (context.caseTitle) {
      return `Defect in: ${context.caseTitle.slice(0, 60)}`;
    }
    return '';
  }, [context]);

  // Auto-generate description in markdown
  const generatedDescription = useMemo(() => {
    const lines: string[] = [];

    lines.push('## Context');
    if (context.caseKey) lines.push(`- **Test Case:** ${context.caseKey}${context.caseTitle ? ` - ${context.caseTitle}` : ''}`);
    if (context.cycleName) lines.push(`- **Test Cycle:** ${context.cycleName}`);
    if (context.environment) lines.push(`- **Environment:** ${context.environment}`);
    if (context.stepNumber) lines.push(`- **Step:** ${context.stepNumber}`);

    if (context.stepAction) {
      lines.push('');
      lines.push('## Steps to Reproduce');
      lines.push(context.stepAction);
    }

    if (context.expectedResult) {
      lines.push('');
      lines.push('## Expected Result');
      lines.push(context.expectedResult);
    }

    if (context.actualResult) {
      lines.push('');
      lines.push('## Actual Result');
      lines.push(context.actualResult);
    }

    lines.push('');
    lines.push('## Additional Notes');
    lines.push('<!-- Add any additional context here -->');

    return lines.join('\n');
  }, [context]);

  // Initialize form values when context changes
  useEffect(() => {
    if (open) {
      setTitle(generatedTitle);
      setDescription(generatedDescription);
      setSelectedAttachments([]);
      setSeverity('major');
      setCreateJiraIssue(false);
    }
  }, [open, generatedTitle, generatedDescription]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        severity,
        priority: severity === 'critical' ? 'highest' : severity === 'major' ? 'high' : 'medium',
        attachmentIds: selectedAttachments,
        createJiraIssue,
        linkedRunId: context.runId,
        linkedStepId: context.stepId,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAttachment = (id: string) => {
    setSelectedAttachments((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-500" />
            Log Defect
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Context Summary */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg text-sm">
              {context.caseKey && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Case:</span>
                  <span className="font-medium">{context.caseKey}</span>
                </div>
              )}
              {context.cycleName && (
                <div className="flex items-center gap-2">
                  <Beaker className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Cycle:</span>
                  <span className="font-medium truncate">{context.cycleName}</span>
                </div>
              )}
              {context.stepNumber && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Step:</span>
                  <Badge variant="secondary">{context.stepNumber}</Badge>
                </div>
              )}
              {context.environment && (
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Env:</span>
                  <span className="font-medium">{context.environment}</span>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief defect summary..."
              />
            </div>

            {/* Severity Pills */}
            <div className="space-y-2">
              <Label>Severity</Label>
              <div className="flex gap-2">
                {SEVERITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSeverity(option.value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        severity === option.value
                          ? option.color
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {SEVERITY_OPTIONS.find((o) => o.value === severity)?.description}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Markdown)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            {/* Attachments */}
            {context.attachments && context.attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Attachments from Step</Label>
                <div className="space-y-2">
                  {context.attachments.map((attachment) => (
                    <label
                      key={attachment.id}
                      className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedAttachments.includes(attachment.id)}
                        onCheckedChange={() => toggleAttachment(attachment.id)}
                      />
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{attachment.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {attachment.type}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Jira Integration */}
            <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer">
              <Checkbox
                checked={createJiraIssue}
                onCheckedChange={(checked) => setCreateJiraIssue(checked as boolean)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <ExternalLink className="h-4 w-4" />
                  Also create Jira issue
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Creates a linked issue in your connected Jira project
                </p>
              </div>
            </label>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bug className="h-4 w-4 mr-2" />
            )}
            Log Defect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
