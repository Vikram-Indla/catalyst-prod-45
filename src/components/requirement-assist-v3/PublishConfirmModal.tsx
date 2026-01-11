// ============================================================
// PUBLISH CONFIRMATION MODAL
// Shows user WHERE and WHAT they're publishing
// ============================================================

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Upload } from 'lucide-react';
import { WorkItem } from '@/stores/requirementAssistStore';

interface PublishConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedItems: WorkItem[];
  programName: string;
  projectName: string;
  isPublishing: boolean;
}

export function PublishConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  selectedItems,
  programName,
  projectName,
  isPublishing,
}: PublishConfirmModalProps) {
  // Count by type (exclude PRD)
  const publishableItems = selectedItems.filter(item => item.itemType !== 'prd' && !item.isPublished);
  const counts = {
    epics: publishableItems.filter(i => i.itemType === 'epic').length,
    features: publishableItems.filter(i => i.itemType === 'feature').length,
    stories: publishableItems.filter(i => i.itemType === 'story').length,
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Publish to Backlog
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-slate-600">
            You are about to publish <strong className="text-slate-900">{publishableItems.length}</strong> items to:
          </p>

          <div className="bg-slate-50 p-4 rounded-lg space-y-2 border border-slate-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Program:</span>
              <span className="font-medium text-slate-900">{programName || 'Not selected'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Project:</span>
              <span className="font-medium text-slate-900">{projectName || 'Not selected'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Target:</span>
              <span className="font-medium text-slate-900">Product Backlog</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {counts.epics > 0 && (
              <span className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg text-sm font-medium">
                {counts.epics} Epic{counts.epics > 1 ? 's' : ''}
              </span>
            )}
            {counts.features > 0 && (
              <span className="px-2.5 py-1 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium">
                {counts.features} Feature{counts.features > 1 ? 's' : ''}
              </span>
            )}
            {counts.stories > 0 && (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                {counts.stories} Stor{counts.stories > 1 ? 'ies' : 'y'}
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              This action cannot be undone. Items will be permanently added to the backlog.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isPublishing || publishableItems.length === 0}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600"
          >
            {isPublishing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Publishing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Publish {publishableItems.length} Items
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
