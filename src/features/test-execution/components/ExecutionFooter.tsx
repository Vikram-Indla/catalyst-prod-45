/**
 * ExecutionFooter - Bottom bar with skip and navigation
 */

import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExecutionFooterProps {
  canGoPrev: boolean;
  canGoNext: boolean;
  onSkip: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function ExecutionFooter({
  canGoPrev,
  canGoNext,
  onSkip,
  onPrev,
  onNext,
}: ExecutionFooterProps) {
  return (
    <footer className="bg-background border-t px-6 py-4">
      <div className="flex items-center justify-between max-w-[900px] mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-muted-foreground hover:text-foreground"
        >
          <SkipForward className="w-4 h-4 mr-2" />
          Skip this step
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!canGoNext}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </footer>
  );
}
