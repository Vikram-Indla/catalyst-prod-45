/**
 * Compact Header - Inline Priority, Type, Status, Title for high-volume QA
 * Optimized for 200 cases/day workflow
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Save, Loader2, FolderOpen, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Status = 'draft' | 'ready' | 'approved' | 'deprecated';
type Priority = 'P1' | 'P2' | 'P3' | 'P4';
type TestType = 'functional' | 'regression' | 'smoke' | 'integration' | 'e2e';

interface CompactHeaderProps {
  isNew?: boolean;
  testCaseKey?: string;
  title: string;
  onTitleChange: (title: string) => void;
  status: Status;
  onStatusChange: (status: Status) => void;
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
  testType: TestType;
  onTestTypeChange: (type: TestType) => void;
  folderPath?: string;
  isSaving?: boolean;
  hasChanges?: boolean;
  onSave?: () => void;
  onSaveAndNew?: () => void;
  onClose?: () => void;
}

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-[#f5f5f5] text-[#737373] border border-[#e5e5e5]' },
  ready: { label: 'Ready', className: 'bg-[#ccfbf1] text-[#0d9488]' },
  approved: { label: 'Approved', className: 'bg-[#d1fae5] text-[#059669]' },
  deprecated: { label: 'Deprecated', className: 'bg-[#e5e5e5] text-[#525252]' },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  P1: { label: 'P1', className: 'bg-[#fee2e2] text-[#dc2626]' },
  P2: { label: 'P2', className: 'bg-[#fef3c7] text-[#d97706]' },
  P3: { label: 'P3', className: 'bg-[#dbeafe] text-[#2563eb]' },
  P4: { label: 'P4', className: 'bg-[#f5f5f5] text-[#737373]' },
};

const TYPE_CONFIG: Record<TestType, string> = {
  functional: 'Functional',
  regression: 'Regression',
  smoke: 'Smoke',
  integration: 'Integration',
  e2e: 'E2E',
};

export function CompactHeader({
  isNew = true,
  testCaseKey,
  title,
  onTitleChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  testType,
  onTestTypeChange,
  folderPath = 'Root',
  isSaving,
  hasChanges,
  onSave,
  onSaveAndNew,
  onClose,
}: CompactHeaderProps) {
  const navigate = useNavigate();
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onSaveAndNew?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onSaveAndNew]);

  return (
    <header
      className="flex items-center justify-between px-3 border-b bg-[var(--bg-0)] shrink-0"
      style={{ height: '48px', borderColor: 'var(--stroke-1)' }}
    >
      {/* Left side */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Back button */}
        <button
          onClick={onClose || (() => navigate(-1))}
          className="p-1.5 rounded hover:bg-[var(--row-hover)] text-[var(--text-3)] transition-colors shrink-0"
          style={{ transitionDuration: '150ms' }}
          title="Back (Esc)"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Test Case Key or NEW badge */}
        {isNew ? (
          <Badge
            className="px-2 py-0.5 font-semibold rounded bg-brand-primary text-white shrink-0"
            style={{ fontSize: '10px' }}
          >
            NEW
          </Badge>
        ) : testCaseKey ? (
          <Badge
            className="px-2 py-0.5 font-mono rounded bg-[#dbeafe] text-[#2563eb] shrink-0"
            style={{ fontSize: '11px' }}
          >
            {testCaseKey}
          </Badge>
        ) : null}

        {/* Status dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0">
              <Badge
                className={`px-2 py-0.5 font-semibold rounded uppercase cursor-pointer hover:opacity-80 transition-opacity ${STATUS_CONFIG[status].className}`}
                style={{ fontSize: '10px' }}
              >
                {STATUS_CONFIG[status].label}
                <ChevronDown className="h-3 w-3 ml-1 inline" />
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => (
              <DropdownMenuItem key={s} onClick={() => onStatusChange(s)}>
                <Badge className={`${STATUS_CONFIG[s].className} text-xs`}>
                  {STATUS_CONFIG[s].label}
                </Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0">
              <Badge
                className={`px-2 py-0.5 font-semibold rounded cursor-pointer hover:opacity-80 transition-opacity ${PRIORITY_CONFIG[priority].className}`}
                style={{ fontSize: '10px' }}
              >
                {PRIORITY_CONFIG[priority].label}
                <ChevronDown className="h-3 w-3 ml-1 inline" />
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
              <DropdownMenuItem key={p} onClick={() => onPriorityChange(p)}>
                <Badge className={`${PRIORITY_CONFIG[p].className} text-xs`}>
                  {p} - {p === 'P1' ? 'Critical' : p === 'P2' ? 'High' : p === 'P3' ? 'Medium' : 'Low'}
                </Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Type dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0">
              <Badge
                className="px-2 py-0.5 font-medium rounded cursor-pointer hover:opacity-80 transition-opacity bg-[#f5f5f5] text-[#525252] border border-[#e5e5e5]"
                style={{ fontSize: '10px' }}
              >
                {TYPE_CONFIG[testType]}
                <ChevronDown className="h-3 w-3 ml-1 inline" />
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(Object.keys(TYPE_CONFIG) as TestType[]).map((t) => (
              <DropdownMenuItem key={t} onClick={() => onTestTypeChange(t)}>
                {TYPE_CONFIG[t]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="h-4 w-px bg-[var(--stroke-1)] mx-1 shrink-0" />

        {/* Title input - expandable */}
        <input
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter test case title..."
          className="flex-1 min-w-0 px-2 py-1 text-sm font-medium bg-transparent border-0 focus:outline-none focus:ring-0 text-[var(--text-1)] placeholder:text-[var(--text-4)]"
          style={{ fontSize: '14px' }}
        />

        {/* Folder indicator */}
        <div className="flex items-center gap-1 text-xs text-[var(--text-3)] shrink-0">
          <FolderOpen className="h-3 w-3" />
          <span className="max-w-24 truncate">{folderPath}</span>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2 shrink-0 ml-3">
        {/* Save indicator */}
        {hasChanges && (
          <span className="text-xs text-[var(--text-4)]">Unsaved</span>
        )}

        {/* Save and New button */}
        <Button
          onClick={onSaveAndNew}
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          title="Save & New (Ctrl+Enter)"
        >
          Save & New
        </Button>

        {/* Save button */}
        <Button
          onClick={onSave}
          disabled={isSaving}
          size="sm"
          className="h-7 px-3 text-white gap-1.5"
          style={{
            backgroundColor: '#059669',
            boxShadow: '0 2px 8px -2px rgba(5, 150, 105, 0.3)',
          }}
          title="Save (Ctrl+S)"
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          Save
        </Button>

        {/* Close button */}
        <button
          onClick={onClose || (() => navigate(-1))}
          className="p-1.5 rounded hover:bg-[var(--row-hover)] text-[var(--text-4)] transition-colors"
          style={{ transitionDuration: '150ms' }}
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

export default CompactHeader;
