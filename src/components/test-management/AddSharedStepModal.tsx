import React, { useState } from 'react';
import { Search, Plus, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSharedSteps, useAddSharedStepToTestCase } from '@/hooks/useSharedSteps';
import { useToast } from '@/hooks/use-toast';
import type { SharedTestStep } from '@/types/sharedSteps.types';

interface AddSharedStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCaseId: string;
  currentStepCount: number;
}

export const AddSharedStepModal: React.FC<AddSharedStepModalProps> = ({
  isOpen,
  onClose,
  testCaseId,
  currentStepCount,
}) => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedStep, setSelectedStep] = useState<SharedTestStep | null>(null);
  
  const { data: sharedSteps = [], isLoading } = useSharedSteps({ 
    search,
    sort: 'usage_desc',
    limit: 50,
  });
  
  const addMutation = useAddSharedStepToTestCase();

  const handleAdd = async () => {
    if (!selectedStep) return;

    try {
      await addMutation.mutateAsync({
        testCaseId,
        sharedStepId: selectedStep.id,
        stepOrder: currentStepCount + 1,
      });

      toast({
        title: 'Success',
        description: 'Shared step added to test case',
      });

      handleClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add shared step',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setSelectedStep(null);
    setSearch('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Shared Step to Test Case</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shared steps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
            </div>
          ) : sharedSteps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'No shared steps found' : 'No shared steps available'}
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {sharedSteps.map((step) => (
                  <div
                    key={step.id}
                    onClick={() => setSelectedStep(step)}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-colors
                      ${selectedStep?.id === step.id 
                        ? 'border-brand-gold bg-brand-gold/10' 
                        : 'border-border hover:border-brand-gold/50 hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground mb-1">{step.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {step.description}
                        </p>
                        {step.expected_result && (
                          <p className="text-xs text-muted-foreground mt-2">
                            <span className="font-medium">Expected:</span> {step.expected_result}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {step.usage_count} uses
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={addMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedStep || addMutation.isPending}
            className="bg-brand-gold text-white hover:bg-brand-gold-hover"
          >
            {addMutation.isPending ? (
              <>Adding...</>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Selected Step
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
