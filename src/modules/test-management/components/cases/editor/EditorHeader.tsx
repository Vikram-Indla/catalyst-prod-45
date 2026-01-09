/**
 * Editor Header Component - Pixel Perfect Match
 * Matches test-case-editor design exactly
 */

import React from 'react';
import {
  ChevronLeft,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CaseStatus } from '../../../api/types';

interface EditorHeaderProps {
  caseKey?: string;
  status: CaseStatus;
  folderName?: string;
  qualityScore?: number;
  executionResults?: ('pass' | 'fail')[];
  collaborators?: { id: string; name: string; initials: string; color: string; isOnline: boolean }[];
  isDirty: boolean;
  isSaving: boolean;
  onBack: () => void;
  onSave: () => void;
  onClone?: () => void;
  onClose: () => void;
  disabled?: boolean;
}

const STATUS_STYLES: Record<CaseStatus, string> = {
  draft: 'bg-[#dc2626] text-white',
  ready: 'bg-[#0d9488] text-white',
  approved: 'bg-[#059669] text-white',
  needs_update: 'bg-[#d97706] text-white',
  deprecated: 'bg-[#6b7280] text-white',
};

export function EditorHeader({
  caseKey,
  status,
  folderName,
  isDirty,
  isSaving,
  onBack,
  onSave,
  onClose,
  disabled,
}: EditorHeaderProps) {
  const isNew = !caseKey || caseKey === 'NEW';

  return (
    <header
      className="flex items-center justify-between px-4 border-b bg-white shrink-0"
      style={{ height: '56px', borderColor: '#e5e5e5' }}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Back button */}
        <button
          onClick={onBack}
          className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* NEW badge - blue */}
        {isNew && (
          <Badge
            className="px-2.5 py-0.5 font-semibold rounded bg-[#2563eb] text-white border-0"
            style={{ fontSize: '11px' }}
          >
            NEW
          </Badge>
        )}

        {/* Status badge - color varies */}
        <Badge
          className={cn(
            'px-2.5 py-0.5 font-semibold rounded uppercase border-0',
            STATUS_STYLES[status]
          )}
          style={{ fontSize: '11px' }}
        >
          {status === 'needs_update' ? 'NEEDS UPDATE' : status.toUpperCase()}
        </Badge>

        {/* Folder path breadcrumb */}
        <span className="text-sm text-neutral-700">{folderName || 'Root'}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Save button - green with +5 badge */}
        <Button
          onClick={onSave}
          disabled={disabled || isSaving}
          className="h-9 px-4 gap-2 text-white"
          style={{
            background: '#059669',
            borderRadius: '6px',
          }}
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Saving...' : 'Saved'}</span>
          {isDirty && (
            <span
              className="ml-1 px-1.5 py-0.5 rounded text-white"
              style={{ 
                fontSize: '10px', 
                background: 'rgba(255,255,255,0.2)',
              }}
            >
              +5
            </span>
          )}
        </Button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-neutral-100 text-neutral-400"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
