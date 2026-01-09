/**
 * Test Case Editor Header - Pixel perfect from design
 */

import React from 'react';
import { ChevronLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface TestCaseEditorHeaderProps {
  isNew?: boolean;
  status: 'draft' | 'ready' | 'approved' | 'deprecated';
  folderPath?: string;
  isSaving?: boolean;
  hasChanges?: boolean;
  onSave?: () => void;
  onClose?: () => void;
}

export function TestCaseEditorHeader({
  isNew = true,
  status,
  folderPath = 'Root',
  isSaving,
  hasChanges,
  onSave,
  onClose,
}: TestCaseEditorHeaderProps) {
  const navigate = useNavigate();

  const statusColors = {
    draft: 'bg-sem-danger text-white',
    ready: 'bg-brand-teal text-white',
    approved: 'bg-sem-success text-white',
    deprecated: 'bg-sem-warning text-white',
  };

  return (
    <header
      className="flex items-center justify-between px-4 border-b bg-[var(--bg-0)]"
      style={{ height: '56px', borderColor: 'var(--stroke-1)' }}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose || (() => navigate(-1))}
          className="p-1.5 rounded hover:bg-[var(--row-hover)] text-[var(--text-3)] transition-colors"
          style={{ transitionDuration: '150ms' }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* NEW badge */}
        {isNew && (
          <Badge
            className="px-2.5 py-0.5 font-semibold rounded bg-brand-primary text-white"
            style={{ fontSize: '11px' }}
          >
            NEW
          </Badge>
        )}

        {/* Status badge */}
        <Badge
          className={`px-2.5 py-0.5 font-semibold rounded uppercase ${statusColors[status]}`}
          style={{ fontSize: '11px' }}
        >
          {status}
        </Badge>

        {/* Folder path */}
        <span className="text-sm text-[var(--text-2)]">{folderPath}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="h-9 px-4 bg-sem-success hover:bg-[#047857] text-white gap-2 transition-colors"
          style={{ 
            borderRadius: '6px',
            backgroundColor: 'var(--sem-success)',
            boxShadow: '0 4px 14px -2px rgba(5, 150, 105, 0.25)',
            transitionDuration: '150ms'
          }}
        >
          <Save className="h-4 w-4" />
          Saved
          {hasChanges && (
            <span
              className="ml-1 px-1.5 py-0.5 rounded bg-white/20"
              style={{ fontSize: '10px' }}
            >
              +5
            </span>
          )}
        </Button>
        <button
          onClick={onClose || (() => navigate(-1))}
          className="p-2 rounded hover:bg-[var(--row-hover)] text-[var(--text-4)] transition-colors"
          style={{ transitionDuration: '150ms' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default TestCaseEditorHeader;
