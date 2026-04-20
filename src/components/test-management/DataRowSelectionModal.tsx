/**
 * DataRowSelectionModal — Select data rows for data-driven test execution
 * Allows users to choose which test data rows to execute
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lozenge } from '@/components/ads';
import { Loader2, Database, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataRowSelection } from '@/hooks/test-management/useCreateRunWithDataRows';

interface DataRowSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: DataRowSelection[];
  columnOrder: string[];
  testCaseTitle: string;
  isLoading?: boolean;
  onConfirm: (selectedRows: DataRowSelection[]) => void;
}

export function DataRowSelectionModal({
  open,
  onOpenChange,
  rows,
  columnOrder,
  testCaseTitle,
  isLoading = false,
  onConfirm,
}: DataRowSelectionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      // Default: select all rows
      setSelectedIds(new Set(rows.map(r => r.id)));
    }
  }, [open, rows]);

  const handleToggle = (rowId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map(r => r.id)));
    }
  };

  const handleConfirm = () => {
    const selectedRows = rows.filter(r => selectedIds.has(r.id));
    onConfirm(selectedRows);
  };

  // Get preview columns (first 3)
  const previewColumns = useMemo(() => {
    return columnOrder.slice(0, 3);
  }, [columnOrder]);

  // Format row preview — safely handle non-string values
  const formatRowPreview = (row: DataRowSelection) => {
    return previewColumns
      .map(col => {
        const rawValue = row.row_data[col];
        if (rawValue === null || rawValue === undefined) return null;
        // Normalize to string
        const value = String(rawValue);
        if (!value) return null;
        const truncated = value.length > 20 ? value.substring(0, 20) + '…' : value;
        return `${col}=${truncated}`;
      })
      .filter(Boolean)
      .join(' · ');
  };

  const allSelected = selectedIds.size === rows.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < rows.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Select Data Rows to Execute
          </DialogTitle>
          <DialogDescription>
            Choose the datasets to run this test case with. Each selected row will create a separate execution.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Test Case Name */}
          <div className="mb-4 px-3 py-2 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Test Case</p>
            <p className="font-medium text-sm truncate">{testCaseTitle}</p>
          </div>

          {/* Select All Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                className={cn(someSelected && "data-[state=checked]:bg-primary/50")}
              />
              <span className="text-sm font-medium">
                {allSelected ? 'Deselect all' : 'Select all'}
              </span>
            </div>
            <Lozenge appearance="inprogress">
              {selectedIds.size} of {rows.length} selected
            </Lozenge>
          </div>

          {/* Row List */}
          <ScrollArea className="h-[280px] mt-2">
            <div className="space-y-1">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                    selectedIds.has(row.id)
                      ? "bg-primary/5 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                  onClick={() => handleToggle(row.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(row.id)}
                    onCheckedChange={() => handleToggle(row.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">
                        <Lozenge appearance="default">
                          Row {row.row_order + 1}
                        </Lozenge>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {formatRowPreview(row) || 'No data'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Database className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No test data rows available</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Execution ({selectedIds.size} {selectedIds.size === 1 ? 'run' : 'runs'})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
