import { useState } from 'react';
import { AlertTriangle, FileText, Layers, Square, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Incident } from '@/types/incident';

interface ConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
  onConvert: (type: string, justification: string, sendToCommittee: boolean) => void;
}

type ConvertTarget = 'story' | 'feature' | 'epic';

const CONVERT_OPTIONS: { value: ConvertTarget; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'story', 
    label: 'Story', 
    icon: <FileText className="h-4 w-4" />,
    description: 'For small, well-defined work items'
  },
  { 
    value: 'feature', 
    label: 'Feature', 
    icon: <Layers className="h-4 w-4" />,
    description: 'For larger work requiring multiple stories'
  },
  { 
    value: 'epic', 
    label: 'Epic', 
    icon: <Square className="h-4 w-4" />,
    description: 'For significant initiatives spanning releases'
  },
];

export function ConversionDialog({ 
  open, 
  onOpenChange, 
  incident,
  onConvert 
}: ConversionDialogProps) {
  const [convertType, setConvertType] = useState<ConvertTarget>('story');
  const [justification, setJustification] = useState('');
  const [sendToCommittee, setSendToCommittee] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConvert = async () => {
    if (!justification.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onConvert(convertType, justification, sendToCommittee);
      onOpenChange(false);
      setJustification('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = justification.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-brand-primary" />
            Convert Incident
          </DialogTitle>
          <DialogDescription>
            Convert <span className="font-mono font-semibold text-foreground">{incident.incident_key}</span> to a work item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Convert Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Convert to</label>
            <div className="grid grid-cols-3 gap-3">
              {CONVERT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setConvertType(option.value)}
                  className={cn(
                    "relative flex flex-col items-center p-3 rounded-lg border-2 transition-all",
                    convertType === option.value
                      ? "border-brand-primary bg-brand-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  {convertType === option.value && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div className={cn(
                    "p-2 rounded-full mb-2",
                    convertType === option.value ? "bg-brand-primary/10 text-brand-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {option.icon}
                  </div>
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-[10px] text-muted-foreground text-center mt-1">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Justification <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why this incident should be converted to a work item. Include business impact, technical requirements, and expected outcomes..."
              className="min-h-[120px] text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {justification.length < 10 
                ? `Minimum 10 characters required (${10 - justification.length} more)` 
                : `${justification.length} characters`}
            </p>
          </div>

          {/* CAP Committee Option */}
          <div className={cn(
            "flex items-start gap-3 p-3 rounded-lg border",
            sendToCommittee ? "bg-yellow-50 border-yellow-200" : "bg-muted/50 border-border"
          )}>
            <Checkbox
              id="send-to-committee"
              checked={sendToCommittee}
              onCheckedChange={(checked) => setSendToCommittee(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <label 
                htmlFor="send-to-committee" 
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Send to CAP Committee before conversion
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                L3 incidents require committee approval before conversion. The incident will be reviewed by designated approvers.
              </p>
              {sendToCommittee && (
                <Badge variant="outline" className="mt-2 text-[10px] bg-yellow-100 text-yellow-800 border-yellow-300">
                  Recommended for L3
                </Badge>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</span>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Work Item:</span>
                <Badge variant="outline" className="text-xs capitalize">{convertType}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Title:</span>
                <span className="text-xs text-foreground">{incident.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Linked:</span>
                <span className="text-xs font-mono text-brand-primary">{incident.incident_key}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleConvert} 
            disabled={!canSubmit || isSubmitting}
            className="bg-brand-primary text-white hover:bg-brand-primary/90"
          >
            {isSubmitting ? 'Converting...' : sendToCommittee ? 'Send to Committee' : 'Convert Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
