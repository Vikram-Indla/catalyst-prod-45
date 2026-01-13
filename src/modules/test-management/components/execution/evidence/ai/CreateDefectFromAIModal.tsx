/**
 * Create Defect from AI Modal
 * TC-331 to TC-355: Create defects from AI-detected findings
 * Pre-populates defect form with AI analysis data
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Bug,
  Loader2,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Info,
  MinusCircle,
  CheckCircle,
  Image as ImageIcon,
} from 'lucide-react';
import type { DetectedDefect } from './useEvidenceAI';
import { toast } from 'sonner';

interface CreateDefectFromAIModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defect: DetectedDefect | null;
  evidenceId?: string;
  evidenceUrl?: string;
  onSubmit: (data: AIDefectSubmitData) => Promise<void>;
}

export interface AIDefectSubmitData {
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'trivial';
  type: string;
  location?: string;
  suggestion?: string;
  attachEvidenceId?: string;
}

type SeverityValue = 'critical' | 'major' | 'minor' | 'trivial';

const SEVERITY_OPTIONS: Array<{
  value: SeverityValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}> = [
  {
    value: 'critical',
    label: 'Critical',
    icon: AlertTriangle,
    color: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
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
    color: 'bg-muted-foreground/60 hover:bg-muted-foreground/70 text-white',
    description: 'Cosmetic issue',
  },
];

const TYPE_COLORS: Record<string, string> = {
  visual: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  functional: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  accessibility: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  performance: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  content: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  layout: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
};

export function CreateDefectFromAIModal({
  open,
  onOpenChange,
  defect,
  evidenceId,
  evidenceUrl,
  onSubmit,
}: CreateDefectFromAIModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [severity, setSeverity] = useState<SeverityValue>('major');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachEvidence, setAttachEvidence] = useState(true);

  // Initialize form when defect changes
  useEffect(() => {
    if (open && defect) {
      setTitle(defect.title);
      setSeverity(defect.severity);
      setDescription(generateDescription(defect));
      setAttachEvidence(true);
    }
  }, [open, defect]);

  // Generate markdown description from defect
  const generateDescription = (d: DetectedDefect): string => {
    const lines: string[] = [];
    
    lines.push('## AI-Detected Defect');
    lines.push('');
    lines.push('### Description');
    lines.push(d.description);
    lines.push('');
    
    if (d.location) {
      lines.push('### Location');
      lines.push(d.location);
      lines.push('');
    }
    
    lines.push('### Defect Type');
    lines.push(`- **Type:** ${d.type}`);
    lines.push(`- **Severity:** ${d.severity}`);
    lines.push('');
    
    if (d.suggestion) {
      lines.push('### Suggested Fix');
      lines.push(d.suggestion);
      lines.push('');
    }
    
    lines.push('---');
    lines.push('*This defect was detected by AI analysis of test evidence.*');
    
    return lines.join('\n');
  };

  const handleSubmit = async () => {
    if (!defect || !title.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        severity,
        type: defect.type,
        location: defect.location,
        suggestion: defect.suggestion,
        attachEvidenceId: attachEvidence ? evidenceId : undefined,
      });
      toast.success('Defect created successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create defect');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!defect) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[85vh] flex flex-col"
        aria-describedby="create-defect-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Defect from AI Finding
          </DialogTitle>
          <DialogDescription id="create-defect-description">
            Review and customize the AI-detected defect before creating
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* AI Source Badge */}
            <div 
              className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg"
              role="status"
              aria-label="AI detected defect information"
            >
              <div className="p-2 bg-primary/10 rounded-full">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">AI-Detected Issue</p>
                <p className="text-xs text-muted-foreground">
                  Pre-populated from automated analysis
                </p>
              </div>
              <Badge className={cn('text-xs', TYPE_COLORS[defect.type] || 'bg-muted')}>
                {defect.type}
              </Badge>
            </div>

            {/* Evidence Preview */}
            {evidenceUrl && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Source Evidence
                </Label>
                <div className="relative aspect-video w-full max-w-xs rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={evidenceUrl}
                    alt="Evidence screenshot"
                    className="w-full h-full object-cover"
                  />
                  {attachEvidence && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Attached
                      </Badge>
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachEvidence}
                    onChange={(e) => setAttachEvidence(e.target.checked)}
                    className="rounded border-input"
                    aria-describedby="attach-evidence-description"
                  />
                  <span id="attach-evidence-description">
                    Attach evidence to defect
                  </span>
                </label>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="defect-title">Title</Label>
              <Input
                id="defect-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Defect title..."
                aria-required="true"
              />
            </div>

            {/* Severity Pills */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Severity</legend>
              <div 
                className="flex flex-wrap gap-2" 
                role="radiogroup" 
                aria-label="Defect severity"
              >
                {SEVERITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = severity === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSeverity(option.value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                        isSelected
                          ? option.color
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {SEVERITY_OPTIONS.find((o) => o.value === severity)?.description}
              </p>
            </fieldset>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="defect-description">Description (Markdown)</Label>
              <Textarea
                id="defect-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                aria-describedby="description-hint"
              />
              <p id="description-hint" className="text-xs text-muted-foreground">
                Supports markdown formatting. AI suggestion is included.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Bug className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            Create Defect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
