/**
 * StepCard - Single focused step with action, expected result, and verdict buttons
 */

import { Camera, Paperclip, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StepDisplay, Evidence } from '../../stores/executionStore';
import { ResultButtons } from './ResultButtons';
import { EvidencePills } from './EvidencePills';

interface StepCardProps {
  step: StepDisplay;
  evidence: Evidence[];
  hasNote: boolean;
  onPass: () => void;
  onFail: () => void;
  onBlocked: () => void;
  onAddNote: () => void;
  onAddEvidence: () => void;
  onRemoveEvidence: (id: string) => void;
}

export function StepCard({
  step,
  evidence,
  hasNote,
  onPass,
  onFail,
  onBlocked,
  onAddNote,
  onAddEvidence,
  onRemoveEvidence,
}: StepCardProps) {
  const getStatusBorderColor = () => {
    switch (step.status) {
      case 'passed':
        return 'border-green-300';
      case 'failed':
        return 'border-red-300';
      case 'blocked':
        return 'border-amber-300';
      case 'skipped':
        return 'border-slate-300';
      default:
        return 'border-border';
    }
  };
  
  return (
    <div
      className={cn(
        'bg-background rounded-2xl border-2 shadow-lg overflow-hidden transition-colors duration-300',
        getStatusBorderColor()
      )}
    >
      {/* Step Header */}
      <div className="bg-muted/50 px-6 py-4 border-b flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <span className="text-sm font-bold text-primary-foreground">{step.number}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Current Step</span>
          <h3 className="font-semibold text-foreground">{step.title || `Step ${step.number}`}</h3>
        </div>
      </div>
      
      {/* Step Content */}
      <div className="p-6 space-y-6">
        {/* Action Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ▶ ACTION
            </span>
          </div>
          <p className="text-foreground leading-relaxed">{step.action}</p>
        </div>
        
        {/* Expected Result Section */}
        <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
              ✓ EXPECTED RESULT
            </span>
          </div>
          <p className="text-teal-900 dark:text-teal-100 leading-relaxed">{step.expected}</p>
        </div>
        
        {/* Attachment Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onAddEvidence}>
            <Camera className="w-4 h-4 mr-2" />
            Screenshot
          </Button>
          <Button variant="outline" size="sm" onClick={onAddEvidence}>
            <Paperclip className="w-4 h-4 mr-2" />
            Attach
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddNote}
            className={cn(hasNote && 'border-primary text-primary')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Note
          </Button>
        </div>
        
        {/* Evidence Pills */}
        {evidence.length > 0 && (
          <EvidencePills evidence={evidence} onRemove={onRemoveEvidence} />
        )}
        
        {/* Result Buttons */}
        <ResultButtons
          currentStatus={step.status}
          onPass={onPass}
          onFail={onFail}
          onBlocked={onBlocked}
        />
      </div>
    </div>
  );
}
