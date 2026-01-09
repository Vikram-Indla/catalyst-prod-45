/**
 * Expanded Test Steps - Full-width, min 350px height for high-volume QA
 * Optimized for 10-20 steps per test case
 */

import React from 'react';
import { Plus, GripVertical, Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface TestStep {
  id: string;
  stepNumber: number;
  action: string;
  testData?: string;
  expectedResult: string;
}

interface ExpandedTestStepsProps {
  steps: TestStep[];
  onStepsChange: (steps: TestStep[]) => void;
  onAddStep: () => void;
  minHeight?: number;
}

export function ExpandedTestSteps({
  steps,
  onStepsChange,
  onAddStep,
  minHeight = 350,
}: ExpandedTestStepsProps) {
  const handleStepChange = (index: number, field: keyof TestStep, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    onStepsChange(newSteps);
  };

  const handleDeleteStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Renumber steps
    const renumbered = newSteps.map((step, i) => ({ ...step, stepNumber: i + 1 }));
    onStepsChange(renumbered);
  };

  const handleDuplicateStep = (index: number) => {
    const newSteps = [...steps];
    const duplicated = {
      ...steps[index],
      id: `step-${Date.now()}`,
      stepNumber: steps.length + 1,
    };
    newSteps.splice(index + 1, 0, duplicated);
    // Renumber steps
    const renumbered = newSteps.map((step, i) => ({ ...step, stepNumber: i + 1 }));
    onStepsChange(renumbered);
  };

  // Handle keyboard shortcuts within steps
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      handleDuplicateStep(index);
    }
    if (e.altKey && e.key === 'n') {
      e.preventDefault();
      onAddStep();
    }
  };

  if (steps.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-[var(--bg-1)]/50"
        style={{ minHeight: `${minHeight}px`, borderColor: 'var(--stroke-1)' }}
      >
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg-0)] border mb-3" style={{ borderColor: 'var(--stroke-1)' }}>
            <Plus className="h-5 w-5 text-[var(--text-3)]" />
          </div>
          <h4 className="text-sm font-medium text-[var(--text-1)] mb-1">No test steps yet</h4>
          <p className="text-xs text-[var(--text-3)] mb-4 max-w-xs">
            Add steps to define the test execution flow. Use Alt+N to quickly add steps.
          </p>
          <Button
            onClick={onAddStep}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add First Step
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-3 overflow-y-auto pr-1"
      style={{ minHeight: `${minHeight}px`, maxHeight: 'calc(100vh - 480px)' }}
    >
      {/* Table header */}
      <div
        className="grid gap-2 px-2 text-xs font-semibold text-[var(--text-2)] uppercase tracking-wide sticky top-0 bg-[var(--bg-1)] py-2 z-10"
        style={{ 
          gridTemplateColumns: '32px 40px 1fr 200px 1fr 72px',
          letterSpacing: '0.5px',
          fontSize: '10px'
        }}
      >
        <span></span>
        <span>#</span>
        <span>Action / Description</span>
        <span>Test Data</span>
        <span>Expected Result</span>
        <span></span>
      </div>

      {/* Steps */}
      {steps.map((step, index) => (
        <div
          key={step.id}
          className="grid gap-2 items-start group rounded-lg p-2 hover:bg-[var(--row-hover)] transition-colors"
          style={{ gridTemplateColumns: '32px 40px 1fr 200px 1fr 72px' }}
          onKeyDown={(e) => handleKeyDown(e, index)}
        >
          {/* Drag handle */}
          <button className="p-1 rounded hover:bg-[var(--bg-0)] text-[var(--text-4)] cursor-grab">
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Step number */}
          <div
            className="flex items-center justify-center w-7 h-7 rounded-full bg-[#dbeafe] text-[#2563eb] font-semibold text-xs"
          >
            {step.stepNumber}
          </div>

          {/* Action */}
          <div>
            <Textarea
              value={step.action}
              onChange={(e) => handleStepChange(index, 'action', e.target.value)}
              placeholder="e.g., Click the 'Submit' button..."
              className="min-h-[70px] text-sm resize-y border-2 border-gray-200 rounded-lg bg-white shadow-sm hover:border-gray-300 focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe] focus:outline-none transition-all"
              style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-1)' }}
            />
          </div>

          {/* Test Data */}
          <div>
            <Textarea
              value={step.testData || ''}
              onChange={(e) => handleStepChange(index, 'testData', e.target.value)}
              placeholder="e.g., username: admin@test.com"
              className="min-h-[70px] text-sm resize-y border-2 border-gray-200 rounded-lg bg-white shadow-sm hover:border-gray-300 focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe] focus:outline-none transition-all"
              style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-1)' }}
            />
          </div>

          {/* Expected Result */}
          <div>
            <Textarea
              value={step.expectedResult}
              onChange={(e) => handleStepChange(index, 'expectedResult', e.target.value)}
              placeholder="e.g., Dashboard loads within 2s..."
              className="min-h-[70px] text-sm resize-y border-2 border-gray-200 rounded-lg bg-white shadow-sm hover:border-gray-300 focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe] focus:outline-none transition-all"
              style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-1)' }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleDuplicateStep(index)}
              className="p-1.5 rounded hover:bg-[var(--bg-0)] text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors"
              title="Duplicate (Ctrl+D)"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteStep(index)}
              className="p-1.5 rounded hover:bg-[#fee2e2] text-[var(--text-4)] hover:text-[#dc2626] transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Add step button */}
      <button
        onClick={onAddStep}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 border-dashed text-[var(--text-4)] hover:text-[#2563eb] hover:border-[#2563eb] transition-all group"
        style={{ borderColor: 'var(--stroke-1)' }}
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm font-medium">Add Step</span>
        <span className="text-xs text-[var(--text-4)] group-hover:text-[var(--text-3)]">(Alt+N)</span>
      </button>
    </div>
  );
}

export default ExpandedTestSteps;
