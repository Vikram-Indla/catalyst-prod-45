/**
 * Create Defect Modal Component
 * TC-331 to TC-355: AI-powered defect creation with pre-population
 */

import React, { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bug, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface AiSuggestion {
  title: string;
  description: string;
  severity: string;
  stepsToReproduce?: string[];
}

export interface LinkedEvidence {
  attachmentId: string;
  imageUrl: string;
}

export interface CreateDefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiSuggestion?: AiSuggestion;
  linkedEvidence: LinkedEvidence;
  testCaseId?: string;
  testCaseName?: string;
  projectId?: string;
  onDefectCreated?: (defectId: string, defectKey: string) => void;
}

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type Priority = 'P1' | 'P2' | 'P3' | 'P4';

export const CreateDefectModal: React.FC<CreateDefectModalProps> = ({
  isOpen,
  onClose,
  aiSuggestion,
  linkedEvidence,
  testCaseId,
  testCaseName,
  projectId,
  onDefectCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('HIGH');
  const [priority, setPriority] = useState<Priority>('P2');
  const [steps, setSteps] = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-fill from AI suggestion when modal opens
  useEffect(() => {
    if (isOpen && aiSuggestion) {
      setTitle(aiSuggestion.title || '');
      setDescription(aiSuggestion.description || '');
      setSeverity((aiSuggestion.severity as Severity) || 'HIGH');
      setSteps(aiSuggestion.stepsToReproduce?.join('\n') || '');
    }
  }, [isOpen, aiSuggestion]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setSeverity('HIGH');
      setPriority('P2');
      setSteps('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!title.trim() || title.length < 10) {
      toast.error('Title must be at least 10 characters');
      return;
    }

    if (!projectId) {
      toast.error('Project ID is required');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Generate defect key
      const { data: existingDefects } = await supabase
        .from('tm_defects')
        .select('defect_key')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (existingDefects && existingDefects.length > 0) {
        const lastKey = existingDefects[0].defect_key;
        const match = lastKey.match(/DEF-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      const defectKey = `DEF-${nextNum}`;

      // Create defect
      const { data: defect, error } = await supabase
        .from('tm_defects')
        .insert({
          project_id: projectId,
          defect_key: defectKey,
          title,
          description: `${description}\n\n**Steps to Reproduce:**\n${steps}`,
          severity: severity.toLowerCase() as 'critical' | 'major' | 'minor' | 'trivial',
          priority: priority,
          status: 'open',
          reporter_id: user.id,
          test_case_id: testCaseId || null,
          found_during: aiSuggestion ? 'ai_analysis' : 'test_execution',
        })
        .select('id, defect_key')
        .single();

      if (error) throw error;

      // Link evidence to defect
      if (linkedEvidence.attachmentId) {
        await supabase
          .from('tm_defect_links')
          .insert({
            defect_id: defect.id,
            step_result_id: linkedEvidence.attachmentId,
            created_by: user.id,
          });
      }

      toast.success(`Defect ${defect.defect_key} created successfully`);
      onDefectCreated?.(defect.id, defect.defect_key);
      onClose();
    } catch (error) {
      console.error('Failed to create defect:', error);
      toast.error('Failed to create defect');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-destructive" />
            Create Defect
            {aiSuggestion && (
              <span className="text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Pre-filled
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Linked Evidence */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            {linkedEvidence.imageUrl ? (
              <img
                src={linkedEvidence.imageUrl}
                alt="Evidence"
                className="w-16 h-12 object-cover rounded border"
              />
            ) : (
              <div className="w-16 h-12 bg-muted-foreground/10 rounded border flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium">Evidence Linked</p>
              <p className="text-xs text-muted-foreground">Screenshot will be attached</p>
            </div>
          </div>

          {/* Test Case Link */}
          {testCaseName && (
            <div className="text-sm text-muted-foreground">
              Linked to: <span className="font-medium text-foreground">{testCaseName}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="defect-title" className="flex items-center gap-1">
              Title *
              {aiSuggestion?.title && (
                <Sparkles className="w-3 h-3 text-teal-600" />
              )}
            </Label>
            <Input
              id="defect-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the defect"
              className={cn(
                aiSuggestion?.title && 'ring-1 ring-teal-500/30'
              )}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="defect-description" className="flex items-center gap-1">
              Description
              {aiSuggestion?.description && (
                <Sparkles className="w-3 h-3 text-teal-600" />
              )}
            </Label>
            <Textarea
              id="defect-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description"
              rows={3}
              className={cn(
                aiSuggestion?.description && 'ring-1 ring-teal-500/30'
              )}
            />
          </div>

          {/* Severity & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Severity *</Label>
              <Select
                value={severity}
                onValueChange={(v) => setSeverity(v as Severity)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as Priority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1">P1 - Urgent</SelectItem>
                  <SelectItem value="P2">P2 - High</SelectItem>
                  <SelectItem value="P3">P3 - Normal</SelectItem>
                  <SelectItem value="P4">P4 - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Steps to Reproduce */}
          <div className="space-y-2">
            <Label htmlFor="defect-steps" className="flex items-center gap-1">
              Steps to Reproduce
              {aiSuggestion?.stepsToReproduce && (
                <Sparkles className="w-3 h-3 text-teal-600" />
              )}
            </Label>
            <Textarea
              id="defect-steps"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="1. Navigate to...&#10;2. Click on...&#10;3. Observe..."
              rows={4}
              className={cn(
                'font-mono text-sm',
                aiSuggestion?.stepsToReproduce && 'ring-1 ring-teal-500/30'
              )}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            variant="destructive"
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bug className="w-4 h-4" />
            )}
            Create Defect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
