/**
 * Bulk Operations Panel
 * Module 5A-2: Unified interface for batch export, update, and delete
 */

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { BatchExport } from '../export';
import { BatchUpdate } from '../update';
import { BatchDelete } from '../delete';

export type BulkOperationType = 'export' | 'update' | 'delete';

interface BulkOperationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  selectedTestCaseIds: string[];
  initialTab?: BulkOperationType;
  onComplete?: () => void;
}

export function BulkOperationsPanel({
  open,
  onOpenChange,
  projectId,
  selectedTestCaseIds,
  initialTab = 'export',
  onComplete,
}: BulkOperationsPanelProps) {
  const [activeTab, setActiveTab] = useState<BulkOperationType>(initialTab);
  const [completedOperations, setCompletedOperations] = useState<Set<BulkOperationType>>(new Set());

  const count = selectedTestCaseIds.length;

  const handleOperationComplete = (operation: BulkOperationType) => {
    setCompletedOperations((prev) => new Set([...prev, operation]));
    onComplete?.();
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setCompletedOperations(new Set());
    }, 300);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SheetTitle>Bulk Operations</SheetTitle>
              <Badge variant="secondary" className="font-mono">
                {count} selected
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as BulkOperationType)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid grid-cols-3 mx-6 mt-4">
            <TabsTrigger value="export" className="gap-2">
              <Download className="h-4 w-4" />
              Export
              {completedOperations.has('export') && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="update" className="gap-2">
              <Edit3 className="h-4 w-4" />
              Update
              {completedOperations.has('update') && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="delete" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
              {completedOperations.has('delete') && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              )}
            </TabsTrigger>
          </TabsList>

          {count === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No test cases selected. Select test cases from the list to perform bulk operations.
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-6">
                <TabsContent value="export" className="mt-0">
                  <ExportTabContent
                    projectId={projectId}
                    selectedIds={selectedTestCaseIds}
                    onComplete={() => handleOperationComplete('export')}
                  />
                </TabsContent>

                <TabsContent value="update" className="mt-0">
                  <UpdateTabContent
                    projectId={projectId}
                    selectedIds={selectedTestCaseIds}
                    onComplete={() => handleOperationComplete('update')}
                  />
                </TabsContent>

                <TabsContent value="delete" className="mt-0">
                  <DeleteTabContent
                    projectId={projectId}
                    selectedIds={selectedTestCaseIds}
                    onComplete={() => handleOperationComplete('delete')}
                    onClose={handleClose}
                  />
                </TabsContent>
              </div>
            </ScrollArea>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Tab Content Wrappers
// ============================================================

function ExportTabContent({
  projectId,
  onComplete,
}: {
  projectId: string;
  selectedIds: string[];
  onComplete: () => void;
}) {
  return (
    <div className="space-y-4">
      <BatchExport
        projectId={projectId}
        onClose={onComplete}
      />
    </div>
  );
}

function UpdateTabContent({
  projectId,
  selectedIds,
  onComplete,
}: {
  projectId: string;
  selectedIds: string[];
  onComplete: () => void;
}) {
  return (
    <div className="space-y-4">
      <BatchUpdate
        projectId={projectId}
        selectedTestCaseIds={selectedIds}
        onClose={onComplete}
      />
    </div>
  );
}

function DeleteTabContent({
  projectId,
  selectedIds,
  onComplete,
  onClose,
}: {
  projectId: string;
  selectedIds: string[];
  onComplete: () => void;
  onClose: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(true);

  return (
    <BatchDelete
      projectId={projectId}
      selectedTestCaseIds={selectedIds}
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          onComplete();
          onClose();
        }
      }}
    />
  );
}
