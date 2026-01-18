/**
 * Approve Release Dialog
 * Confirmation dialog with approval checklist
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ReleaseDetail } from '../types';
import { STATUS_LABELS } from '../types';

interface ApprovalChecklistItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  required: boolean;
}

const DEFAULT_CHECKLIST: ApprovalChecklistItem[] = [
  {
    id: 'critical_tests',
    label: 'All critical tests passed',
    description: 'No critical test cases are failing',
    checked: false,
    required: true,
  },
  {
    id: 'no_p1_defects',
    label: 'No P1 defects open',
    description: 'All blocker/critical defects have been resolved',
    checked: false,
    required: true,
  },
  {
    id: 'stakeholder_signoff',
    label: 'Stakeholder sign-off',
    description: 'Business stakeholders have approved the release',
    checked: false,
    required: true,
  },
  {
    id: 'documentation',
    label: 'Documentation updated',
    description: 'Release notes and documentation are complete',
    checked: false,
    required: false,
  },
  {
    id: 'rollback_plan',
    label: 'Rollback plan ready',
    description: 'A rollback procedure is documented and tested',
    checked: false,
    required: false,
  },
];

interface ApproveReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  release: ReleaseDetail;
  onApprove?: () => Promise<void>;
}

export function ApproveReleaseDialog({ open, onOpenChange, release, onApprove }: ApproveReleaseDialogProps) {
  const [checklist, setChecklist] = useState<ApprovalChecklistItem[]>(DEFAULT_CHECKLIST);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const allRequiredChecked = checklist
    .filter(item => item.required)
    .every(item => item.checked);

  const handleApprove = async () => {
    if (!allRequiredChecked) {
      toast.error('Please complete all required checklist items');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onApprove) {
        await onApprove();
      } else {
        // Simulate API call
        await new Promise(r => setTimeout(r, 1000));
      }
      toast.success(`Release ${release.version} approved successfully`, {
        description: 'The release has been marked as approved and is ready for deployment.',
      });
      onOpenChange(false);
      setChecklist(DEFAULT_CHECKLIST); // Reset for next time
    } catch (error) {
      toast.error('Failed to approve release');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-600" />
            Approve Release
          </DialogTitle>
          <DialogDescription>
            Review and confirm the release approval checklist before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Release Info */}
          <div className="p-4 bg-slate-50 rounded-lg border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{release.version}</span>
              <Badge className="bg-blue-100 text-blue-700 border-0">
                {STATUS_LABELS[release.status]}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">{release.name}</p>
            <p className="text-xs text-slate-500">
              Target: {new Date(release.targetDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>

          {/* Approval Checklist */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700">Approval Checklist</h4>
            {checklist.map((item) => (
              <label
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  item.checked 
                    ? 'bg-teal-50 border-teal-200' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${item.checked ? 'text-teal-700' : 'text-slate-700'}`}>
                      {item.label}
                    </span>
                    {item.required && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 text-destructive border-destructive/30">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Warning if not all required checked */}
          {!allRequiredChecked && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Complete all required items to enable approval.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={!allRequiredChecked || isSubmitting}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Approve Release
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
