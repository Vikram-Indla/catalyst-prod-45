/**
 * Test Case Toolbar - Phase 1 Spec Compliant
 * New Test Case button, AI Generate button (purple), bulk actions bar
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Plus,
  Sparkles,
  Trash2,
  ArrowRight,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TestCaseStatus } from '../types';

interface TestCaseToolbarProps {
  selectedCount: number;
  onNewTestCase: () => void;
  onAIGenerate: () => void;
  onBulkDelete: () => void;
  onBulkMove: () => void;
  onBulkStatus: (status: TestCaseStatus) => void;
  onClearSelection: () => void;
}

export function TestCaseToolbar({
  selectedCount,
  onNewTestCase,
  onAIGenerate,
  onBulkDelete,
  onBulkMove,
  onBulkStatus,
  onClearSelection,
}: TestCaseToolbarProps) {
  const hasBulkSelection = selectedCount > 0;

  return (
    <div
      className="flex items-center justify-between px-4 border-b bg-[var(--bg-0)]"
      style={{
        height: '52px',
        borderColor: 'var(--stroke-1)',
      }}
    >
      {/* Left - Buttons or Bulk Actions */}
      {hasBulkSelection ? (
        <div className="flex items-center gap-3">
          {/* Selection count */}
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-1)]">
            <span
              className="flex items-center justify-center rounded-full bg-[#2563eb] text-white"
              style={{ width: '24px', height: '24px', fontSize: '12px' }}
            >
              {selectedCount}
            </span>
            <span>selected</span>
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex items-center gap-1 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkMove}
              className="h-8"
            >
              <ArrowRight className="h-4 w-4 mr-1.5" />
              Move
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkStatus('approved')}
              className="h-8"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkDelete}
              className="h-8 text-[#dc2626] border-[#dc2626] hover:bg-[rgba(220,38,38,0.1)]"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          </div>

          {/* Cancel */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 ml-2"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {/* New Test Case Button - Primary Blue */}
          <Button
            onClick={onNewTestCase}
            className="h-9 bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
            style={{ borderRadius: '6px' }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Test Case
          </Button>

          {/* AI Generate Button - Purple with glow */}
          <Button
            onClick={onAIGenerate}
            className="h-9 text-white"
            style={{
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
            }}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            AI Generate
          </Button>
        </div>
      )}

      {/* Right - Could add filters here */}
      <div className="flex items-center gap-2">
        {/* Placeholder for filters */}
      </div>
    </div>
  );
}

export default TestCaseToolbar;
