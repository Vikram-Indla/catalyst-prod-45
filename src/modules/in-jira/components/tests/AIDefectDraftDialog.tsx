/**
 * AI Defect Draft Dialog
 * AI-3: Fail → Defect Auto-Draft
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Edit3 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTestAIGeneration } from '../../hooks/useTestAIGeneration';
import { useTestAISettings } from '../../hooks/useTestAISettings';

interface DefectDraft {
  title: string;
  description: string;
  expected_result: string;
  actual_result: string;
  severity: string;
  priority: string;
  steps_to_reproduce?: { step_number: number; action: string; expected: string }[];
}

interface AIDefectDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionId: string;
  testCaseTitle: string;
  execution?: Record<string, unknown>;
  testCase?: Record<string, unknown>;
  failureNotes?: string;
  programId?: string;
  onDefectCreated?: (defectId: string) => void;
}

export function AIDefectDraftDialog({
  open,
  onOpenChange,
  executionId,
  testCaseTitle,
  execution,
  testCase,
  failureNotes,
  programId,
  onDefectCreated,
}: AIDefectDraftDialogProps) {
  const [draft, setDraft] = useState<DefectDraft | null>(null);
  const [editedDraft, setEditedDraft] = useState<Partial<DefectDraft>>({});
  const [isEditing, setIsEditing] = useState(false);

  const { settings } = useTestAISettings(programId || null);
  const { generateDefectDraft, isGeneratingDefect, createDefectFromDraft, isCreatingDefect } = useTestAIGeneration(programId || null);

  useEffect(() => {
    if (open && !draft && execution && testCase) {
      handleGenerate();
    }
  }, [open]);

  const handleGenerate = async () => {
    if (!execution || !testCase) return;
    try {
      const result = await generateDefectDraft({ executionId, execution, testCase, failureNotes });
      if (result?.defectDraft) {
        setDraft(result.defectDraft as DefectDraft);
        setEditedDraft(result.defectDraft as DefectDraft);
      }
    } catch (error) {
      console.error('Generation error:', error);
    }
  };

  const handleApprove = async () => {
    if (!editedDraft) return;
    try {
      const result = await createDefectFromDraft({ draft: editedDraft as any, executionId });
      if (result?.id) {
        toast.success('Defect created');
        onDefectCreated?.(result.id);
        onOpenChange(false);
        setDraft(null);
      }
    } catch (error) {
      toast.error('Failed to create defect');
    }
  };

  const handleReject = () => {
    onOpenChange(false);
    setDraft(null);
    setEditedDraft({});
  };

  const updateField = (field: keyof DefectDraft, value: string) => {
    setEditedDraft(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-primary" />AI Defect Draft
          </DialogTitle>
          <DialogDescription>Auto-generated defect from failed test. Review and approve.</DialogDescription>
        </DialogHeader>

        {!settings?.is_active ? (
          <div className="py-8 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-status-warning" />
            <p className="text-text-primary font-medium">AI Not Configured</p>
          </div>
        ) : isGeneratingDefect ? (
          <div className="py-12 text-center">
            <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-accent-primary" />
            <p className="text-text-primary font-medium">Analyzing Failure...</p>
          </div>
        ) : draft ? (
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs text-text-tertiary uppercase">Title</Label>
              {isEditing ? (
                <Input value={editedDraft.title || ''} onChange={(e) => updateField('title', e.target.value)} className="mt-1.5 bg-surface-2 border-border-default" />
              ) : (
                <p className="mt-1.5 text-sm font-medium text-text-primary">{editedDraft.title}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-text-tertiary uppercase">Severity</Label>
                {isEditing ? (
                  <Select value={editedDraft.severity || 'medium'} onValueChange={(v) => updateField('severity', v)}>
                    <SelectTrigger className="mt-1.5 bg-surface-2 border-border-default"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className="mt-1.5 text-status-error bg-status-error/10">{editedDraft.severity}</Badge>
                )}
              </div>
              <div>
                <Label className="text-xs text-text-tertiary uppercase">Priority</Label>
                {isEditing ? (
                  <Select value={editedDraft.priority || 'high'} onValueChange={(v) => updateField('priority', v)}>
                    <SelectTrigger className="mt-1.5 bg-surface-2 border-border-default"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className="mt-1.5 text-status-warning bg-status-warning/10">{editedDraft.priority}</Badge>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs text-text-tertiary uppercase">Description</Label>
              {isEditing ? (
                <Textarea value={editedDraft.description || ''} onChange={(e) => updateField('description', e.target.value)} className="mt-1.5 bg-surface-2 border-border-default" rows={3} />
              ) : (
                <p className="mt-1.5 text-sm text-text-secondary whitespace-pre-wrap">{editedDraft.description}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-text-tertiary">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Failed to generate draft</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleGenerate}>Retry</Button>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div>
            {draft && !isGeneratingDefect && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Edit3 className="h-4 w-4 mr-1.5" />{isEditing ? 'Preview' : 'Edit'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReject}>Reject</Button>
            <Button onClick={handleApprove} disabled={!draft || isCreatingDefect}>
              {isCreatingDefect ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              Create Defect
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AIDefectDraftDialog;
