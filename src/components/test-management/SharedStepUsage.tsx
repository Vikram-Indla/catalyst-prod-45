import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSharedStepUsage } from '@/hooks/useSharedSteps';
import { useNavigate } from 'react-router-dom';
import type { SharedTestStep } from '@/types/sharedSteps.types';

interface SharedStepUsageProps {
  step: SharedTestStep | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  approved: 'bg-green-500',
  deprecated: 'bg-red-500',
};

export const SharedStepUsage: React.FC<SharedStepUsageProps> = ({
  step,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { data: usageDetails = [], isLoading } = useSharedStepUsage(step?.id || '');

  const handleOpenTestCase = (testCaseId: string) => {
    navigate(`/tests/cases/${testCaseId}`);
    onClose();
  };

  if (!step) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Step Usage - {step.title}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            This shared step is used in <Badge variant="secondary">{step.usage_count}</Badge> test case{step.usage_count !== 1 ? 's' : ''}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
          </div>
        ) : usageDetails.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>This step is not currently used in any test cases</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {usageDetails.map((usage) => (
                <div
                  key={`${usage.test_case_id}-${usage.step_order}`}
                  className="flex items-center justify-between gap-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground truncate">
                        {usage.test_case_title}
                      </h4>
                      <Badge
                        variant="secondary"
                        className={`${STATUS_COLORS[usage.test_case_status] || 'bg-gray-500'} text-white`}
                      >
                        {usage.test_case_status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Position: Step {usage.step_order}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenTestCase(usage.test_case_id)}
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
