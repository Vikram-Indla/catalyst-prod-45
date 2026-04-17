/**
 * DescriptionPopover — Atlaskit/ADF inline description editor for a subtask row.
 *
 * Wraps AtlaskitEditor (appearance="comment") in a Radix Popover. Round-trips
 * ADF via ph_issues.description_adf, mirrors plain text to description_text
 * for search. Empty docs are persisted as NULL to keep the row indicator clean.
 *
 * Save/Cancel are wired via AtlaskitEditor's comment-mode handlers. Escape
 * closes without saving. The trigger indicator reflects whether the subtask
 * currently has non-empty content.
 */
import React, { useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AtlaskitEditor, { type AtlaskitEditorRef } from '@/components/shared/AtlaskitEditor';
import type { ADFEntity } from '@atlaskit/adf-utils/types';
import { createEmptyADF, isADFEmpty, parseADF } from '@/utils/adf';
import { useSubtaskDescription } from './hooks/useSubtaskDescription';

interface DescriptionPopoverProps {
  subtaskId: string;
  subtaskKey: string;
  parentKey: string;
  readOnly?: boolean;
}

export function DescriptionPopover({ subtaskId, subtaskKey, parentKey, readOnly }: DescriptionPopoverProps) {
  const [open, setOpen] = useState(false);
  const editorRef = useRef<AtlaskitEditorRef>(null);
  const { query, save } = useSubtaskDescription(open ? subtaskId : null, parentKey);

  const stored: ADFEntity | null = (() => {
    const raw = query.data?.description_adf;
    if (!raw) return null;
    if (typeof raw === 'string') return parseADF(raw);
    return raw as ADFEntity;
  })();

  const hasContent = !!(stored && !isADFEmpty(stored));

  const handleSave = (adf: ADFEntity) => {
    save.mutate(adf, {
      onSuccess: () => setOpen(false),
    });
  };

  const handleCancel = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`sp-desc-trigger ${hasContent ? 'sp-desc-trigger--filled' : ''}`}
          onClick={(e) => e.stopPropagation()}
          aria-label={hasContent ? `Edit description for ${subtaskKey}` : `Add description to ${subtaskKey}`}
          aria-haspopup="dialog"
          disabled={readOnly}
          title={hasContent ? 'Edit description' : 'Add description'}
        >
          <FileText size={14} aria-hidden />
          {hasContent && <span className="sp-desc-trigger-dot" aria-hidden />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="sp-desc-popover"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      >
        <div className="sp-desc-popover-title" role="heading" aria-level={2}>
          Description · {subtaskKey}
        </div>
        {query.isLoading ? (
          <div className="sp-desc-loading">Loading…</div>
        ) : (
          <AtlaskitEditor
            ref={editorRef}
            appearance="comment"
            defaultValue={stored ?? createEmptyADF()}
            placeholder="Add a description…"
            onSave={handleSave}
            onCancel={handleCancel}
            disabled={readOnly || save.isPending}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

export default DescriptionPopover;
