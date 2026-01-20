// ============================================================
// ResultRecorder - Main container for result recording & evidence
// ============================================================

import { useState, useCallback } from 'react';
import { ArrowLeftRight, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ActualResultInput } from './ActualResultInput';
import { EvidenceUploader } from './EvidenceUploader';
import { EvidenceGallery } from './EvidenceGallery';
import { ComparisonView } from './ComparisonView';
import { useStepEvidence } from '../../hooks/useStepEvidence';

interface ResultRecorderProps {
  executionId: string;
  stepResultId: string | null;
  stepId: string;
  expectedResult?: string;
  actualResult: string;
  onActualResultChange: (value: string) => void;
  disabled?: boolean;
}

export function ResultRecorder({
  executionId,
  stepResultId,
  stepId,
  expectedResult,
  actualResult,
  onActualResultChange,
  disabled = false,
}: ResultRecorderProps) {
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(true);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const { count: evidenceCount } = useStepEvidence(stepResultId);

  const handleUploadComplete = useCallback(() => {
    // Evidence gallery will auto-refresh via real-time subscription
  }, []);

  return (
    <div className="space-y-4">
      {/* Actual Result Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">Actual Result</h4>
          {expectedResult && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCompareOpen(true)}
              className="text-xs gap-1"
            >
              <ArrowLeftRight className="h-3 w-3" />
              Compare
            </Button>
          )}
        </div>
        <ActualResultInput
          value={actualResult}
          onChange={onActualResultChange}
          expectedResult={expectedResult}
          disabled={disabled}
        />
      </div>

      <Separator />

      {/* Evidence Section */}
      <Collapsible open={isEvidenceOpen} onOpenChange={setIsEvidenceOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between px-0 hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              <span className="text-sm font-medium">Evidence</span>
              {evidenceCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({evidenceCount} file{evidenceCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {isEvidenceOpen ? 'Collapse' : 'Expand'}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-4">
          {/* Uploader */}
          {stepResultId && !disabled && (
            <EvidenceUploader
              stepResultId={stepResultId}
              disabled={disabled}
              onUploadComplete={handleUploadComplete}
            />
          )}

          {!stepResultId && !disabled && (
            <p className="text-sm text-muted-foreground">
              Save a result first to attach evidence.
            </p>
          )}

          {/* Gallery */}
          <EvidenceGallery stepResultId={stepResultId} disabled={disabled} />
        </CollapsibleContent>
      </Collapsible>

      {/* Comparison View Dialog */}
      <ComparisonView
        expected={expectedResult || ''}
        actual={actualResult}
        open={isCompareOpen}
        onOpenChange={setIsCompareOpen}
      />
    </div>
  );
}
