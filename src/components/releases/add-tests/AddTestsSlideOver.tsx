/**
 * Add Tests to Cycle - Slide-over Panel
 * Main container for the test selection workflow
 */

import React, { useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CATALYST_V5 } from '@/lib/catalyst-colors';

import { TestRepositoryBrowser } from './TestRepositoryBrowser';
import { SelectionSummary } from './SelectionSummary';
import { BulkAssignmentForm } from './BulkAssignmentForm';
import { AddTestsFooter } from './AddTestsFooter';

import { useTestFilters } from '@/hooks/test-cycles/useTestFilters';
import { useTestSelection } from '@/hooks/test-cycles/useTestSelection';
import { useTestRepository } from '@/hooks/test-cycles/useTestRepository';
import { useAddTestsToCycle } from '@/hooks/test-cycles/useAddTestsToCycle';
import type { TestCase } from '@/types/add-tests.types';

interface AddTestsSlideOverProps {
  cycleId: string;
  cycleName: string;
  cycleEndDate?: string;
  projectId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

export function AddTestsSlideOver({
  cycleId,
  cycleName,
  cycleEndDate,
  projectId = 'default-project',
  isOpen,
  onClose,
  onSuccess,
}: AddTestsSlideOverProps) {
  const {
    filters,
    setSearch,
    setModule,
    setTestType,
    setPriority,
    setAutomationStatus,
    setHideAlreadyAdded,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
  } = useTestFilters();

  const {
    selectedIds,
    toggle,
    selectAll,
    clear,
    isSelected,
    count: selectedCount,
    getSelectionStats,
  } = useTestSelection();

  const { data: testCases = [], isLoading } = useTestRepository(projectId, cycleId, filters);
  const addTestsMutation = useAddTestsToCycle();

  // Assignment form state
  const [assigneeId, setAssigneeId] = React.useState<string | null>(null);
  const [priority, setPriorityValue] = React.useState<string | null>(null);
  const [dueDate, setDueDate] = React.useState<string | null>(null);
  const [useSmartAssignment, setUseSmartAssignment] = React.useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        const selectableIds = testCases
          .filter(tc => !tc.alreadyInCycle)
          .map(tc => tc.id);
        selectAll(selectableIds);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, testCases, selectAll]);

  // Clear state on close
  useEffect(() => {
    if (!isOpen) {
      clear();
      clearAllFilters();
      setAssigneeId(null);
      setPriorityValue(null);
      setDueDate(null);
      setUseSmartAssignment(false);
    }
  }, [isOpen, clear, clearAllFilters]);

  const handleAddTests = async () => {
    const testCaseIds = Array.from(selectedIds);
    
    try {
      await addTestsMutation.mutateAsync({
        cycleId,
        testCaseIds,
        assigneeId,
        priority,
        dueDate,
        useSmartAssignment,
      });
      
      onSuccess?.(testCaseIds.length);
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const selectionStats = getSelectionStats(testCases);
  const availableTests = testCases.filter(tc => !tc.alreadyInCycle);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-50 transition-opacity"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
        onClick={onClose}
      />
      
      {/* Slide-over Panel */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col bg-background shadow-xl",
          "transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ 
          width: 'min(900px, 80vw)',
          borderLeft: `1px solid ${CATALYST_V5.slate[200]}`
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: CATALYST_V5.slate[200] }}
        >
          <div>
            <h2 className="text-lg font-semibold" style={{ color: CATALYST_V5.slate[900] }}>
              Add Tests to Cycle
            </h2>
            <p className="text-sm" style={{ color: CATALYST_V5.slate[500] }}>
              {cycleName}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body - Two Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Test Repository Browser (60%) */}
          <div 
            className="flex-[3] flex flex-col border-r overflow-hidden"
            style={{ borderColor: CATALYST_V5.slate[200] }}
          >
            <TestRepositoryBrowser
              testCases={testCases}
              isLoading={isLoading}
              filters={filters}
              onSearchChange={setSearch}
              onModuleChange={setModule}
              onTestTypeChange={setTestType}
              onPriorityChange={setPriority}
              onAutomationStatusChange={setAutomationStatus}
              onHideAlreadyAddedChange={setHideAlreadyAdded}
              onClearFilter={clearFilter}
              onClearAllFilters={clearAllFilters}
              hasActiveFilters={hasActiveFilters}
              selectedIds={selectedIds}
              onToggleSelect={toggle}
              onSelectAll={() => selectAll(availableTests.map(tc => tc.id))}
              isSelected={isSelected}
              availableCount={availableTests.length}
            />
          </div>

          {/* Right Panel - Selection Summary (40%) */}
          <div className="flex-[2] flex flex-col overflow-hidden">
            <SelectionSummary
              selectedTests={selectionStats.selected}
              totalDuration={selectionStats.totalDuration}
              byPriority={selectionStats.byPriority}
              byType={selectionStats.byType}
              onRemove={toggle}
              onClearAll={clear}
            />
            
            <BulkAssignmentForm
              assigneeId={assigneeId}
              onAssigneeChange={setAssigneeId}
              priority={priority}
              onPriorityChange={setPriorityValue}
              dueDate={dueDate}
              onDueDateChange={setDueDate}
              cycleEndDate={cycleEndDate}
              useSmartAssignment={useSmartAssignment}
              onSmartAssignmentChange={setUseSmartAssignment}
            />
          </div>
        </div>

        {/* Footer */}
        <AddTestsFooter
          selectedCount={selectedCount}
          isSubmitting={addTestsMutation.isPending}
          onCancel={onClose}
          onSubmit={handleAddTests}
          dueDate={dueDate}
          cycleEndDate={cycleEndDate}
        />
      </div>
    </>
  );
}
