/**
 * Test Step Row - For adding/editing test steps
 * Updated for high-volume QA workflow
 */

import React from 'react';
import { Plus, GripVertical, Trash2, Copy, Paperclip } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface TestStep {
  id: string;
  stepNumber: number;
  action: string;
  testData?: string;
  expectedResult: string;
  attachments?: { name: string; type: string }[];
}

interface TestStepRowProps {
  isEmpty?: boolean;
  onAdd?: () => void;
  step?: TestStep;
  index?: number;
  onChange?: (field: keyof TestStep, value: string) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onAddAttachment?: () => void;
}

export function TestStepRow({ 
  isEmpty = true, 
  onAdd,
  step,
  index = 0,
  onChange,
  onDelete,
  onDuplicate,
  onAddAttachment,
}: TestStepRowProps) {
  if (isEmpty || !step) {
    return (
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-lg border-2 border-dashed text-[var(--text-4)] hover:text-[#2563eb] hover:border-[#2563eb] hover:bg-[#dbeafe]/10 transition-all"
        style={{ borderColor: 'var(--stroke-1)', borderRadius: '8px', transitionDuration: '150ms' }}
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm font-medium">Add Test Step</span>
        <span className="text-xs text-[var(--text-4)]">(Alt+N)</span>
      </button>
    );
  }

  return (
    <div
      className="grid gap-2 items-start group rounded-lg p-2 hover:bg-[var(--row-hover)] transition-colors"
      style={{ gridTemplateColumns: '32px 40px 1fr 180px 1fr 72px' }}
    >
      {/* Drag handle */}
      <button className="p-1 rounded hover:bg-[var(--bg-0)] text-[var(--text-4)] cursor-grab">
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Step number */}
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#dbeafe] text-[#2563eb] font-semibold text-xs">
        {step.stepNumber}
      </div>

      {/* Action */}
      <Textarea
        value={step.action}
        onChange={(e) => onChange?.('action', e.target.value)}
        placeholder="Enter action to perform..."
        className="min-h-[60px] text-sm resize-none border-[var(--stroke-1)] focus:border-[#2563eb] focus:ring-1 focus:ring-[#dbeafe] bg-[var(--bg-0)]"
        style={{ fontSize: '13px', lineHeight: '1.5' }}
      />

      {/* Test Data */}
      <Textarea
        value={step.testData || ''}
        onChange={(e) => onChange?.('testData', e.target.value)}
        placeholder="Test data..."
        className="min-h-[60px] text-sm resize-none border-[var(--stroke-1)] focus:border-[#2563eb] focus:ring-1 focus:ring-[#dbeafe] bg-[var(--bg-0)]"
        style={{ fontSize: '13px', lineHeight: '1.5' }}
      />

      {/* Expected Result */}
      <Textarea
        value={step.expectedResult}
        onChange={(e) => onChange?.('expectedResult', e.target.value)}
        placeholder="Expected result..."
        className="min-h-[60px] text-sm resize-none border-[var(--stroke-1)] focus:border-[#2563eb] focus:ring-1 focus:ring-[#dbeafe] bg-[var(--bg-0)]"
        style={{ fontSize: '13px', lineHeight: '1.5' }}
      />

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onAddAttachment}
          className="p-1.5 rounded hover:bg-[var(--bg-0)] text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors"
          title="Add Attachment"
        >
          <Paperclip className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDuplicate}
          className="p-1.5 rounded hover:bg-[var(--bg-0)] text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors"
          title="Duplicate (Ctrl+D)"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-[#fee2e2] text-[var(--text-4)] hover:text-[#dc2626] transition-colors"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default TestStepRow;
