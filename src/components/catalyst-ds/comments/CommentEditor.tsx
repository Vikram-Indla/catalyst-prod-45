import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ads';
import type { CdsUser, CdsQuickReply } from '../types';
import { RichTextEditor } from '@/components/catalyst-detail-views/shared/sections/Description/RichTextEditor';
import { MentionSuggestionPill } from '@/components/catalyst-detail-views/shared/sections/Description/_components/MentionSuggestionPill/MentionSuggestionPill';
import type { AdfDoc } from '@/components/catalyst-detail-views/shared/sections/Description/utils/adfToTiptap';
import { isAdfEmpty, adfToPlainText } from '@/components/shared/rich-text/atlaskit/adfHelpers';
import { CatyStreamingOverlay } from '@/components/catalyst-detail-views/improve/CatyStreamingOverlay';

export interface CommentImproveContext {
  issueKey: string;
  issueType: string | null;
  issueSummary: string | null;
}

export interface CommentEditorProps {
  currentUser?: CdsUser;
  onSubmit: (content: string) => void | Promise<void>;
  onCancel?: () => void;
  mentionableUsers?: CdsUser[];
  quickReplies?: CdsQuickReply[];
  placeholder?: string;
  defaultValue?: string;
  isSubmitting?: boolean;
  shortcutHint?: string;
  autoFocus?: boolean;
  className?: string;
  workItemId?: string;
  improveContext?: CommentImproveContext;
}

function looksLikeAdf(value: string): boolean {
  const v = value.trim();
  if (!v.startsWith('{')) return false;
  try {
    const parsed = JSON.parse(v);
    return parsed && parsed.type === 'doc';
  } catch {
    return false;
  }
}

function markdownToAdf(text: string): {
  type: 'doc';
  version: number;
  content: unknown[];
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { type: 'doc', version: 1, content: [{ type: 'paragraph' }] };
  }
  const content: unknown[] = [];
  const lines = trimmed.split('\n');
  let paragraph: unknown[] = [];

  const flush = () => {
    if (paragraph.length > 0) {
      content.push({ type: 'paragraph', content: paragraph });
      paragraph = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine;
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      flush();
      const alt = imgMatch[1] ?? '';
      const url = imgMatch[2] ?? '';
      content.push({
        type: 'mediaSingle',
        attrs: { layout: 'center', width: 500, widthType: 'pixel' },
        content: [
          {
            type: 'media',
            attrs: { type: 'external', url, alt },
          },
        ],
      });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    if (paragraph.length > 0) {
      paragraph.push({ type: 'hardBreak' });
    }
    paragraph.push({ type: 'text', text: line });
  }
  flush();

  if (content.length === 0) content.push({ type: 'paragraph' });
  return { type: 'doc', version: 1, content };
}

function toInitialContent(defaultValue: string): unknown {
  if (!defaultValue) return null;
  if (looksLikeAdf(defaultValue)) {
    try {
      return JSON.parse(defaultValue);
    } catch {
      return null;
    }
  }
  return markdownToAdf(defaultValue);
}

const CommentEditor = React.forwardRef<HTMLDivElement, CommentEditorProps>(
  (
    {
      currentUser,
      onSubmit,
      onCancel,
      placeholder = 'Add a comment...',
      defaultValue = '',
      className,
      workItemId,
      shortcutHint,
      autoFocus,
      improveContext,
    },
    ref,
  ) => {
    const isExistingEdit = defaultValue.length > 0 || !!autoFocus;
    const [editing, setEditing] = React.useState(isExistingEdit);

    const initialContent = React.useMemo(
      () => toInitialContent(defaultValue),
      [defaultValue],
    );

    const [currentAdfJson, setCurrentAdfJson] = React.useState<string>(() =>
      initialContent ? JSON.stringify(initialContent) : '',
    );
    const [improving, setImproving] = React.useState(false);

    const isCurrentEmpty = React.useMemo(() => {
      if (!currentAdfJson) return true;
      try {
        return isAdfEmpty(JSON.parse(currentAdfJson));
      } catch {
        return currentAdfJson.trim().length === 0;
      }
    }, [currentAdfJson]);

    const handleSave = React.useCallback(
      (adfJson: string) => {
        let isEmpty = true;
        try {
          isEmpty = isAdfEmpty(JSON.parse(adfJson));
        } catch {
          isEmpty = !adfJson || adfJson.trim().length === 0;
        }
        if (isEmpty) return;
        onSubmit(adfJson);
        if (!isExistingEdit) setEditing(false);
      },
      [onSubmit, isExistingEdit],
    );

    const handleCancel = React.useCallback(() => {
      onCancel?.();
      if (!isExistingEdit) setEditing(false);
    }, [onCancel, isExistingEdit]);

    const handleImproveClick = React.useCallback(() => {
      if (!improveContext) return;
      if (isCurrentEmpty) return;
      setImproving(true);
    }, [improveContext, isCurrentEmpty]);

    const handleImproveApply = React.useCallback(
      (_fullMd: string, parts: { description: string }) => {
        const adfDoc = markdownToAdf(parts.description ?? _fullMd ?? '');
        const adfJson = JSON.stringify(adfDoc);
        setImproving(false);
        onSubmit(adfJson);
        if (!isExistingEdit) setEditing(false);
      },
      [onSubmit, isExistingEdit],
    );

    const handleImproveCancel = React.useCallback(() => {
      setImproving(false);
    }, []);

    const currentPlainText = React.useMemo(() => {
      if (!currentAdfJson) return '';
      try {
        return adfToPlainText(JSON.parse(currentAdfJson));
      } catch {
        return '';
      }
    }, [currentAdfJson]);

    if (!editing) {
      return (
        <div ref={ref} className={cn('flex gap-3', className)}>
          {currentUser && (
            <span className="shrink-0 mt-1">
              <Avatar
                src={currentUser.avatarUrl}
                name={currentUser.name}
                size="small"
              />
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
              'flex-1 min-w-0 text-left rounded-md border px-3 py-2.5',
              'border-[var(--ds-border,#DFE1E6)] bg-[var(--ds-surface-sunken,#FAFBFC)]',
              'text-[14px] text-[var(--ds-text-subtlest,#6B778C)]',
              'hover:bg-[var(--ds-background-neutral-subtle-hovered,#F1F2F4)]',
              'transition-colors duration-100',
              'cursor-text',
            )}
          >
            {placeholder}
          </button>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('flex gap-3', className)}>
        {currentUser && (
          <span className="shrink-0 mt-1">
            <Avatar
              src={currentUser.avatarUrl}
              name={currentUser.name}
              size="small"
            />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <RichTextEditor
            initialAdf={(initialContent as AdfDoc | null) ?? null}
            onSave={handleSave}
            onCancel={handleCancel}
            onChange={(json) => {
              try {
                setCurrentAdfJson(JSON.stringify(json));
              } catch {
                /* shouldn't happen — JSON.stringify on a PM JSON */
              }
            }}
            // Intentionally NOT passing `placeholder` here so the editor
            // falls back to its canonical default
            // ("Type /ai to Ask Caty or @ to mention and notify someone").
            // The `placeholder` prop on CommentEditor controls the
            // COLLAPSED-state button label only.
            // ~2 rows tall in its initial state so the comment composer
            // doesn't dominate the page when empty. The Description
            // editor uses the default (220) for a taller starting box.
            minHeight={80}
            onImproveClick={improveContext ? handleImproveClick : undefined}
            improveLabel="Improve writing"
            belowEditor={(editor) => (
              <MentionSuggestionPill
                editor={editor}
                workItemId={workItemId}
              />
            )}
            bodyOverlay={
              improving && improveContext ? (
                <CatyStreamingOverlay
                  key={`${improveContext.issueKey}-comment`}
                  issueKey={improveContext.issueKey}
                  issueType={improveContext.issueType}
                  issueSummary={improveContext.issueSummary}
                  currentDescription={currentPlainText}
                  currentAcceptanceCriteria={null}
                  attachmentUrls={[]}
                  improveSubType="improve_clarify"
                  improveType="improve_comment_v1"
                  onApply={handleImproveApply}
                  onCancel={handleImproveCancel}
                />
              ) : undefined
            }
          />
          {shortcutHint && !isExistingEdit && (
            <p
              className={cn(
                'text-[12px] mt-1.5',
                'text-[var(--ds-text-subtlest,#6B778C)]',
                'dark:text-[var(--ds-text-subtlest,#878787)]',
              )}
            >
              {shortcutHint.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                part.startsWith('**') ? (
                  <span
                    key={i}
                    className="font-semibold text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)]"
                  >
                    {part.replace(/\*\*/g, '')}
                  </span>
                ) : (
                  <React.Fragment key={i}>{part}</React.Fragment>
                ),
              )}
            </p>
          )}
        </div>
      </div>
    );
  },
);
CommentEditor.displayName = 'CommentEditor';

export { CommentEditor };
