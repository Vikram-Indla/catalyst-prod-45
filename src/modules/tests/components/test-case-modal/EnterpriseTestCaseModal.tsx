/**
 * Enterprise Test Case Modal - Main Component
 * Full 5-tab authoring workspace
 */

import React, { useState } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTestCaseForm, INITIAL_FORM_DATA } from './useTestCaseForm';
import { DetailsTab } from './DetailsTab';
import { StepsTab } from './StepsTab';
import { DataTab } from './DataTab';
import { LinksTab } from './LinksTab';
import { ReviewTab } from './ReviewTab';
import type { ModalTab } from './types';

const TABS: { id: ModalTab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'steps', label: 'Steps' },
  { id: 'data', label: 'Data' },
  { id: 'links', label: 'Links' },
  { id: 'review', label: 'Review' },
];

interface EnterpriseTestCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: (id: string) => void;
  defaultFolderId?: string | null;
}

export function EnterpriseTestCaseModal({
  open,
  onOpenChange,
  projectId,
  onSuccess,
  defaultFolderId,
}: EnterpriseTestCaseModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('details');

  const {
    formData,
    setFormData,
    validation,
    resetForm,
    createMutation,
    addStep,
    removeStep,
    duplicateStep,
    reorderSteps,
    addVariable,
    removeVariable,
    addDataset,
    removeDataset,
    addLink,
    removeLink,
  } = useTestCaseForm(projectId, onSuccess);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      resetForm();
      if (defaultFolderId) {
        setFormData(prev => ({ ...prev, folderId: defaultFolderId }));
      }
      setActiveTab('details');
    }
  }, [open, defaultFolderId, resetForm, setFormData]);

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleCreate = (andAddAnother = false) => {
    createMutation.mutate(formData, {
      onSuccess: (result) => {
        if (andAddAnother) {
          resetForm();
          setActiveTab('details');
        } else {
          onOpenChange(false);
        }
      },
    });
  };

  const tabErrors = (tab: ModalTab) => 
    validation.errors.filter(e => e.tab === tab && e.severity === 'error').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[1100px] h-[85vh] p-0 bg-surface-1 border-border-default flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border-default shrink-0">
          <DialogTitle className="text-lg font-semibold">Create Test Case</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border-default px-6 shrink-0">
          {TABS.map(tab => {
            const errorCount = tabErrors(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors relative',
                  activeTab === tab.id
                    ? 'border-accent-primary text-accent-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                {tab.label}
                {errorCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-status-error text-white text-[10px] flex items-center justify-center">
                    {errorCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'details' && (
            <DetailsTab
              formData={formData}
              setFormData={setFormData}
              projectId={projectId}
              validation={validation}
            />
          )}
          {activeTab === 'steps' && (
            <StepsTab
              formData={formData}
              setFormData={setFormData}
              projectId={projectId}
              validation={validation}
              addStep={addStep}
              removeStep={removeStep}
              duplicateStep={duplicateStep}
              reorderSteps={reorderSteps}
            />
          )}
          {activeTab === 'data' && (
            <DataTab
              formData={formData}
              setFormData={setFormData}
              projectId={projectId}
              validation={validation}
              addVariable={addVariable}
              removeVariable={removeVariable}
              addDataset={addDataset}
              removeDataset={removeDataset}
            />
          )}
          {activeTab === 'links' && (
            <LinksTab
              formData={formData}
              setFormData={setFormData}
              projectId={projectId}
              validation={validation}
              addLink={addLink}
              removeLink={removeLink}
            />
          )}
          {activeTab === 'review' && (
            <ReviewTab
              formData={formData}
              setFormData={setFormData}
              projectId={projectId}
              validation={validation}
              onNavigateToTab={setActiveTab}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-default bg-surface-2 shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={!validation.isValid || createMutation.isPending}
                  className="gap-1"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Test Case
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-surface-1">
                <DropdownMenuItem onClick={() => handleCreate(false)}>
                  Create & View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreate(true)}>
                  Create & Add Another
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EnterpriseTestCaseModal;
