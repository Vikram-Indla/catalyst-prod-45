import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentKey: string;
  targetStatus: 'resolved' | 'closed';
  onSubmit: (resolution: {
    resolution_summary: string;
    resolution_type: string;
    root_cause?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

const RESOLUTION_TYPES = [
  { value: 'fix', label: 'Permanent Fix' },
  { value: 'workaround', label: 'Workaround Applied' },
  { value: 'rollback', label: 'Rollback' },
  { value: 'config', label: 'Configuration Change' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'not_an_issue', label: 'Not an Issue' },
  { value: 'wont_fix', label: "Won't Fix" },
];

export function ResolutionModal({
  open,
  onOpenChange,
  incidentKey,
  targetStatus,
  onSubmit,
  isSubmitting,
}: ResolutionModalProps) {
  const [summary, setSummary] = useState('');
  const [resolutionType, setResolutionType] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  const validate = () => {
    const newErrors: Record<string, boolean> = {};
    if (!summary.trim()) newErrors.summary = true;
    if (!resolutionType) newErrors.type = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!validate()) return;
    
    await onSubmit({
      resolution_summary: summary.trim(),
      resolution_type: resolutionType,
      root_cause: rootCause.trim() || undefined,
    });
    
    // Reset form
    setSummary('');
    setResolutionType('');
    setRootCause('');
    setErrors({});
  };
  
  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setErrors({});
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Resolution Required
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 space-y-4">
          <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Before {targetStatus === 'closed' ? 'closing' : 'resolving'} <strong>{incidentKey}</strong>, 
              please provide resolution details for audit and knowledge purposes.
            </p>
          </div>
          
          {/* Resolution Summary */}
          <div className="space-y-1.5">
            <Label 
              htmlFor="summary" 
              className={cn(
                "text-xs font-medium uppercase tracking-wide",
                errors.summary && "text-destructive"
              )}
            >
              Resolution Summary <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                if (errors.summary) setErrors(prev => ({ ...prev, summary: false }));
              }}
              placeholder="Describe how the incident was resolved..."
              className={cn(
                "min-h-[100px] text-sm resize-none",
                errors.summary && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {errors.summary && (
              <p className="text-xs text-destructive">Resolution summary is required</p>
            )}
          </div>
          
          {/* Resolution Type */}
          <div className="space-y-1.5">
            <Label 
              className={cn(
                "text-xs font-medium uppercase tracking-wide",
                errors.type && "text-destructive"
              )}
            >
              Resolution Category <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={resolutionType} 
              onValueChange={(v) => {
                setResolutionType(v);
                if (errors.type) setErrors(prev => ({ ...prev, type: false }));
              }}
            >
              <SelectTrigger 
                className={cn(
                  "h-9 text-sm",
                  errors.type && "border-destructive focus-visible:ring-destructive"
                )}
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value} className="text-sm">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">Resolution category is required</p>
            )}
          </div>
          
          {/* Root Cause (Optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="rootCause" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Root Cause <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="rootCause"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Document root cause if known..."
              className="min-h-[60px] text-sm resize-none"
            />
          </div>
        </div>
        
        <DialogFooter className="px-4 py-3 border-t border-border bg-muted/30">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            size="sm" 
            className="h-8" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              `${targetStatus === 'closed' ? 'Close' : 'Resolve'} Incident`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
