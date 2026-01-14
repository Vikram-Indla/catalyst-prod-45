/**
 * Smart Assignment Modal
 * Main container for intelligent test distribution
 */

import React, { useEffect } from 'react';
import { X, Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CATALYST_V5 } from '@/lib/catalyst-colors';

import { AssignmentPreview } from './AssignmentPreview';
import { FactorWeights } from './FactorWeights';
import { DistributionChart } from './DistributionChart';

import { useSmartAssignment } from '@/hooks/test-cycles/useSmartAssignment';
import { useApplyAssignment } from '@/hooks/test-cycles/useApplyAssignment';

interface SmartAssignmentModalProps {
  cycleId: string;
  testCaseIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onApply?: (count: number) => void;
}

export function SmartAssignmentModal({
  cycleId,
  testCaseIds,
  isOpen,
  onClose,
  onApply,
}: SmartAssignmentModalProps) {
  const {
    team,
    tests,
    assignments,
    weights,
    setWeights,
    updateWeight,
    moveTest,
    isCalculating,
    hasManualAdjustments,
    distributionScore,
    distributionSummary,
  } = useSmartAssignment(cycleId, testCaseIds);

  const applyMutation = useApplyAssignment();

  const handleApply = async () => {
    try {
      await applyMutation.mutateAsync({ cycleId, assignments });
      onApply?.(assignments.length);
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-[1000px] max-h-[90vh] overflow-hidden flex flex-col p-0"
        style={{ backgroundColor: 'white' }}
      >
        {/* Header */}
        <DialogHeader 
          className="px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: CATALYST_V5.slate[200] }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: CATALYST_V5.primaryLighter }}
              >
                <Wand2 className="h-5 w-5" style={{ color: CATALYST_V5.primary }} />
              </div>
              <div>
                <DialogTitle 
                  className="text-lg font-semibold"
                  style={{ color: CATALYST_V5.slate[900] }}
                >
                  Smart Assignment
                </DialogTitle>
                <p className="text-sm" style={{ color: CATALYST_V5.slate[500] }}>
                  Distributing {tests.length} tests to {team.length} team members
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body - Two Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Preview (60%) */}
          <div 
            className="flex-[3] flex flex-col overflow-hidden border-r"
            style={{ borderColor: CATALYST_V5.slate[200] }}
          >
            {isCalculating ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <Loader2 
                  className="h-8 w-8 animate-spin" 
                  style={{ color: CATALYST_V5.primary }} 
                />
                <p 
                  className="text-sm font-medium"
                  style={{ color: CATALYST_V5.slate[600] }}
                >
                  Calculating optimal distribution...
                </p>
              </div>
            ) : (
              <AssignmentPreview
                team={team}
                distributionSummary={distributionSummary}
                distributionScore={distributionScore}
                hasManualAdjustments={hasManualAdjustments}
                onMoveTest={moveTest}
              />
            )}
          </div>

          {/* Right Panel - Configuration (40%) */}
          <div className="flex-[2] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {/* Distribution Chart */}
              <DistributionChart
                distributionSummary={distributionSummary}
                distributionScore={distributionScore}
              />
              
              {/* Factor Weights */}
              <FactorWeights
                weights={weights}
                onWeightsChange={setWeights}
                onWeightUpdate={updateWeight}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0"
          style={{ borderColor: CATALYST_V5.slate[200] }}
        >
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={applyMutation.isPending}
            style={{ color: CATALYST_V5.slate[600] }}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            {hasManualAdjustments && (
              <span 
                className="text-xs px-2 py-1 rounded"
                style={{ 
                  backgroundColor: CATALYST_V5.primaryLight,
                  color: CATALYST_V5.primary,
                }}
              >
                Modified
              </span>
            )}
            
            <Button
              onClick={handleApply}
              disabled={applyMutation.isPending || assignments.length === 0}
              style={{
                backgroundColor: CATALYST_V5.primary,
                color: 'white',
              }}
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                `Apply Assignment (${assignments.length} tests)`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
