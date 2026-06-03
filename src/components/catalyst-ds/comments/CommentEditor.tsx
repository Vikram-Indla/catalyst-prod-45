import * as React from 'react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ads';
import type { CdsUser, CdsQuickReply } from '../types';
import { RichTextEditor } from '@/components/catalyst-detail-views/shared/sections/Description/RichTextEditor';
import { MentionSuggestionPill } from '@/components/catalyst-detail-views/shared/sections/Description/_components/MentionSuggestionPill/MentionSuggestionPill';
import {
  adfToTiptap,
  type AdfDoc,
  type TiptapDoc,
} from '@/components/catalyst-detail-views/shared/sections/Description/utils/adfToTiptap';
import { catyMarkdownToAdf } from '@/components/catalyst-detail-views/shared/sections/Description/utils/catyMarkdownToAdf';
import { isAdfEmpty, adfToPlainText } from '@/components/shared/rich-text/atlaskit/adfHelpers';
import { DisplayView } from '@/components/catalyst-detail-views/shared/sections/Description/_components/DisplayView/DisplayView';
import { useCatyImprove } from '@/components/catalyst-detail-views/improve/catyImproveStore';
import { useCatyImproveStream } from '@/components/catalyst-detail-views/improve/useCatyImproveStream';
import { CatyImproveStrap } from '@/components/catalyst-detail-views/improve/CatyImproveStrap';

/**
 * Same partial-markdown guard as Description.tsx — hides incomplete
 * heading markers and unbalanced inline delimiters mid-stream so the
 * user never sees raw `##` or `**foo` flashes in the editor.
 */
function stripIncompleteTail(md: string): string {
  if (!md) return md;
  const lastNl = md.lastIndexOf('\n');
  const lastLine = lastNl === -1 ? md : md.slice(lastNl + 1);
  const beforeLastInclNl = lastNl === -1 ? '' : md.slice(0, lastNl + 1);
  const trimmed = lastLine.trimEnd();
  if (/^#{1,6}\s*$/.test(trimmed)) return lastNl === -1 ? '' : md.slice(0, lastNl);
  if (/^[-*]\s*$/.test(trimmed)) return lastNl === -1 ? '' : md.slice(0, lastNl);
  if (/^\d+\.\s*$/.test(trimmed)) return lastNl === -1 ? '' : md.slice(0, lastNl);
  const safeEnd = lastBalancedPosition(lastLine);
  return beforeLastInclNl + lastLine.slice(0, safeEnd);
}

function lastBalancedPosition(line: string): number {
  let openBold = false;
  let openItalicStar = false;
  let openItalicUnderscore = false;
  let openCode = false;
  let openLinkLabel = false;
  let openLinkUrl = false;
  let safe = 0;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '*' && next === '*') {
      openBold = !openBold;
      i += 2;
    } else if (ch === '*' && !openBold) {
      openItalicStar = !openItalicStar;
      i++;
    } else if (ch === '_') {
      openItalicUnderscore = !openItalicUnderscore;
      i++;
    } else if (ch === '`') {
      openCode = !openCode;
      i++;
    } else if (ch === '[' && !openLinkLabel && !openLinkUrl) {
      openLinkLabel = true;
      i++;
    } else if (ch === ']' && openLinkLabel) {
      openLinkLabel = false;
      if (line[i + 1] === '(') {
        openLinkUrl = true;
        i += 2;
      } else {
        i++;
      }
    } else if (ch === ')' && openLinkUrl) {
      openLinkUrl = false;
      i++;
    } else {
      i++;
    }
    if (
      !openBold &&
      !openItalicStar &&
      !openItalicUnderscore &&
      !openCode &&
      !openLinkLabel &&
      !openLinkUrl
    ) {
      safe = i;
    }
  }
  return safe;
}

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

    // ── Caty Improve writing ────────────────────────────────────────
    // Mirrors Description.tsx: drives the AI stream directly into the
    // editor (no separate overlay), shows a muted snapshot of the
    // current comment below, and exits the improve session once the
    // user clicks Save / Cancel on the editor itself.
    const catyPayload = useCatyImprove((s) => s.payload);
    const startCatyImprove = useCatyImprove((s) => s.start);
    const stopCatyImprove = useCatyImprove((s) => s.stop);
    // Comment improve sessions are keyed by `<issueKey>:comment` so
    // they don't collide with the issue's description improve session
    // that runs on the same page.
    const commentSessionKey = improveContext?.issueKey
      ? `${improveContext.issueKey}:comment`
      : null;
    const catyActiveForThisEditor =
      catyPayload != null &&
      commentSessionKey != null &&
      catyPayload.issueKey === commentSessionKey;
    const streamPayload = catyActiveForThisEditor ? catyPayload : null;
    const {
      phase: catyPhase,
      text: catyText,
      errorMessage: catyError,
      stop: stopCatyStream,
    } = useCatyImproveStream(streamPayload);

    const [editor, setEditor] = React.useState<Editor | null>(null);
    const [snapshotAdf, setSnapshotAdf] = React.useState<AdfDoc | null>(null);
    const streamLocked =
      catyPhase === 'analyzing' || catyPhase === 'streaming';

    // Lock the editor while the AI is producing output.
    React.useEffect(() => {
      if (!editor) return;
      editor.setEditable(!streamLocked);
    }, [editor, streamLocked]);

    // Clear snapshot whenever the session ends (terminal phase OR
    // store cleared by Save / Cancel).
    React.useEffect(() => {
      if (!catyActiveForThisEditor) setSnapshotAdf(null);
    }, [catyActiveForThisEditor]);
    React.useEffect(() => {
      if (
        catyPhase === 'done' ||
        catyPhase === 'stopped' ||
        catyPhase === 'errored'
      ) {
        setSnapshotAdf(null);
      }
    }, [catyPhase]);

    // Stream-into-editor: parse the visible markdown (with partial
    // syntax stripped) and replace the editor content. Same scroll
    // follow + auto-scroll logic Description.tsx uses.
    React.useEffect(() => {
      if (!editor || !catyActiveForThisEditor) return;
      if (catyPhase === 'idle' || catyPhase === 'errored') return;
      if (!catyText || !catyText.trim()) return;
      const body = editor.view.dom.closest<HTMLElement>(
        '.catalyst-description-editor-body',
      );
      const SCROLL_FOLLOW_THRESHOLD = 24;
      const wasNearBottom = body
        ? body.scrollHeight - body.scrollTop - body.clientHeight <
          SCROLL_FOLLOW_THRESHOLD
        : false;
      const streamingText =
        catyPhase === 'streaming' ? stripIncompleteTail(catyText) : catyText;
      if (!streamingText.trim()) return;
      const adf = catyMarkdownToAdf(streamingText);
      const tiptapDoc = adfToTiptap(adf);
      const emitFinal =
        catyPhase === 'done' || catyPhase === 'stopped';
      editor.commands.setContent(tiptapDoc, emitFinal);
      if (body && catyPhase === 'streaming' && wasNearBottom) {
        body.scrollTop = body.scrollHeight;
      }
    }, [editor, catyActiveForThisEditor, catyPhase, catyText]);

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
        stopCatyImprove();
        onSubmit(adfJson);
        if (!isExistingEdit) setEditing(false);
      },
      [onSubmit, isExistingEdit, stopCatyImprove],
    );

    const handleCancel = React.useCallback(() => {
      if (catyActiveForThisEditor) {
        stopCatyStream();
        stopCatyImprove();
      }
      onCancel?.();
      if (!isExistingEdit) setEditing(false);
    }, [
      onCancel,
      isExistingEdit,
      catyActiveForThisEditor,
      stopCatyStream,
      stopCatyImprove,
    ]);

    const handleImproveClick = React.useCallback(() => {
      if (!improveContext || !commentSessionKey) return;
      if (isCurrentEmpty) return;
      // Capture the editor's current ADF as the snapshot + the AI
      // input. Falls back to the initial comment content for the
      // very first improve before the user has typed.
      const currentAdf: AdfDoc | null = (() => {
        try {
          return currentAdfJson ? (JSON.parse(currentAdfJson) as AdfDoc) : null;
        } catch {
          return null;
        }
      })();
      setSnapshotAdf(currentAdf);
      const plainText = currentAdf
        ? adfToPlainText(currentAdf as unknown)
        : '';
      startCatyImprove({
        issueKey: commentSessionKey,
        issueType: improveContext.issueType,
        issueSummary: improveContext.issueSummary,
        currentDescription: plainText,
        currentAcceptanceCriteria: null,
        attachmentUrls: [],
        improveSubType: 'improve_clarify',
        improveType: 'improve_comment_v1',
      });
    }, [
      improveContext,
      commentSessionKey,
      isCurrentEmpty,
      currentAdfJson,
      startCatyImprove,
    ]);

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
            onEditorReady={setEditor}
            belowEditor={(editor) => (
              <MentionSuggestionPill
                editor={editor}
                workItemId={workItemId}
              />
            )}
            bodyAfterEditor={
              <>
                {streamLocked && snapshotAdf && improveContext && (
                  <div
                    data-testid="caty-comment-snapshot"
                    style={{
                      opacity: 0.5,
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop:
                        '1px dashed var(--ds-border, #DFE1E6)',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    <DisplayView adf={snapshotAdf} />
                  </div>
                )}
                <CatyImproveStrap
                  phase={catyPhase}
                  onStop={stopCatyStream}
                />
              </>
            }
          />
          {catyPhase === 'errored' && catyError && (
            <div
              role="alert"
              style={{
                marginTop: 8,
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--ds-text-danger, #AE2A19)',
                background: 'var(--ds-background-danger, #FFECEB)',
                borderRadius: 4,
              }}
            >
              {catyError}
            </div>
          )}
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
