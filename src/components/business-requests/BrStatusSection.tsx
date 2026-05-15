import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useBRWorkflowStatuses, getBRWorkflowStatus } from '@/hooks/useBRWorkflowStatus';
import { BRStatusEducationalPopover } from './BRStatusEducationalPopover';
import Lozenge from '@atlaskit/lozenge';

interface BrStatusSectionProps {
  currentStatusSlug: string;
  requestId: string;
  onStatusChange?: (newStatusSlug: string, comment: string) => Promise<void>;
  isLoading?: boolean;
}

export function BrStatusSection({
  currentStatusSlug,
  requestId,
  onStatusChange,
  isLoading = false
}: BrStatusSectionProps) {
  const { data: statuses = [], isLoading: statusesLoading } = useBRWorkflowStatuses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStatusSlug, setSelectedStatusSlug] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStatus = getBRWorkflowStatus(statuses, currentStatusSlug);
  const availableTransitions = statuses.filter(s => {
    if (!currentStatus) return false;
    const nextMovements = currentStatus.next_movements || [];
    const backwardRoutes = currentStatus.backward_routes || [];
    const allValid = [...nextMovements, ...backwardRoutes];
    return allValid.includes(s.slug);
  });

  const appearanceMap: Record<string, any> = {
    todo: 'default',
    in_progress: 'inprogress',
    done: 'success'
  };

  const handleMove = async () => {
    if (!selectedStatusSlug || !onStatusChange) return;

    setIsSubmitting(true);
    try {
      await onStatusChange(selectedStatusSlug, comment);
      setIsDialogOpen(false);
      setSelectedStatusSlug(null);
      setComment('');
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (statusesLoading) {
    return <div className="h-20 animate-pulse bg-muted rounded" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-sm font-medium text-muted-foreground mb-2">Current Status</div>
          <div className="flex items-center gap-2">
            {currentStatus && (
              <>
                <Lozenge
                  appearance={appearanceMap[currentStatus.category] || 'default'}
                  isBold
                >
                  {currentStatus.name}
                </Lozenge>
                <BRStatusEducationalPopover status={currentStatus} />
              </>
            )}
          </div>
        </div>

        {availableTransitions.length > 0 && onStatusChange && (
          <Button
            appearance="primary"
            onClick={() => setIsDialogOpen(true)}
            isDisabled={statusesLoading || isLoading || isSubmitting}
          >
            Move Status
          </Button>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Next Status</label>
              <Select
                options={availableTransitions.map(s => ({
                  label: s.name,
                  value: s.slug,
                  status: s
                }))}
                value={selectedStatusSlug ? { label: selectedStatusSlug, value: selectedStatusSlug } : null}
                onChange={(option: any) => setSelectedStatusSlug(option?.value || null)}
                placeholder="Select a status..."
              />
            </div>

            {selectedStatusSlug && (
              <div className="p-3 rounded-lg bg-muted">
                {(() => {
                  const targetStatus = getBRWorkflowStatus(statuses, selectedStatusSlug);
                  return (
                    <>
                      <div className="text-sm font-medium mb-2">{targetStatus?.name}</div>
                      {targetStatus?.exit_criteria && (
                        <div className="text-xs text-muted-foreground mb-2">
                          <span className="font-medium">Entry criteria:</span> {targetStatus.exit_criteria}
                        </div>
                      )}
                      {targetStatus?.expected_outputs && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Expected outcome:</span> {targetStatus.expected_outputs}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            <div>
              <label className="text-sm font-medium block mb-2">Comment (required)</label>
              <Textfield
                value={comment}
                onChange={(e: any) => setComment(e.target.value)}
                placeholder="Explain the reason for this status change..."
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                appearance="default"
                onClick={() => setIsDialogOpen(false)}
                isDisabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={handleMove}
                isDisabled={!selectedStatusSlug || !comment.trim() || isSubmitting}
                isLoading={isSubmitting}
              >
                Move Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
