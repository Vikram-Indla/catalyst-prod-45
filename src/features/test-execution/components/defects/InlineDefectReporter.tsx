/**
 * Module 4C-3: Inline Defect Reporter
 * Quick defect creation inline during execution
 */

import React, { useState } from 'react';
import { Bug, Plus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useInlineDefectCreate } from '../../hooks/useRunDefects';
import type { DefectSeverity } from '../../types/defect-linking';
import { SEVERITY_CONFIG } from '../../types/defect-linking';

interface InlineDefectReporterProps {
  runId: string;
  projectId: string;
  testCaseId: string;
  testCaseKey: string;
  stepResultId?: string;
  stepNumber?: number;
  expectedResult?: string;
  actualResult?: string;
  onCreated?: (defectId: string) => void;
  className?: string;
}

export function InlineDefectReporter({
  runId,
  projectId,
  testCaseId,
  testCaseKey,
  stepResultId,
  stepNumber,
  expectedResult,
  actualResult,
  onCreated,
  className,
}: InlineDefectReporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<DefectSeverity>('major');
  
  const { createDefect, isCreating } = useInlineDefectCreate(runId);

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Auto-populate title
      const stepPrefix = stepNumber ? `Step ${stepNumber}: ` : '';
      setTitle(`${stepPrefix}${testCaseKey} - `);
      
      // Auto-populate description
      const descParts: string[] = [];
      if (expectedResult) {
        descParts.push(`**Expected:** ${expectedResult}`);
      }
      if (actualResult) {
        descParts.push(`**Actual:** ${actualResult}`);
      }
      setDescription(descParts.join('\n\n'));
    } else {
      // Reset
      setTitle('');
      setDescription('');
      setSeverity('major');
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    createDefect({
      project_id: projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      severity,
      test_case_id: testCaseId,
      step_result_id: stepResultId,
    });

    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-1 text-destructive border-destructive/30 hover:bg-destructive/10',
            className
          )}
        >
          <Bug className="h-3.5 w-3.5" />
          Log Defect
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-destructive" />
              <span className="font-medium">Quick Log Defect</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Context */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {testCaseKey}
            </Badge>
            {stepNumber && (
              <Badge variant="secondary" className="text-xs">
                Step {stepNumber}
              </Badge>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Describe the issue..."
              className="text-sm"
            />
          </div>

          {/* Severity */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Severity
            </label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as DefectSeverity)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['critical', 'major', 'minor', 'trivial'] as DefectSeverity[]).map((sev) => {
                  const config = SEVERITY_CONFIG[sev];
                  return (
                    <SelectItem key={sev} value={sev}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', config.bgClass)} />
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!title.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Defect
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
