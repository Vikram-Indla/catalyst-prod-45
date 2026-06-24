/**
 * BrDescriptionSection — Business Request description.
 *
 * Read view: canonical Tiptap `DisplayView` (same surface used by every
 * issue type — line-numbered code blocks, Prism syntax highlighting,
 * mentions, tables, images).
 *
 * Edit view: canonical Tiptap `RichTextEditor` (same surface used by
 * the issue Description and the comment composer). Saving writes the
 * serialised ADF JSON string back to `business_requests.description`
 * via the parent's `onUpdate` callback.
 *
 * Click-to-edit + collapse-until-clicked are kept here at the section
 * level because `Description` (the issue-bound wrapper) saves to
 * `ph_issues`; business_requests is a different table so this section
 * owns the save mutation through its `onUpdate` prop.
 */
import { useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import type { BusinessRequest } from '@/types/business-request';
import type { BusinessRequestHealth } from '@/types/date-pulse';
import { RichTextEditor } from '@/components/catalyst-detail-views/shared/sections/Description/RichTextEditor';
import { DisplayView } from '@/components/catalyst-detail-views/shared/sections/Description/_components/DisplayView/DisplayView';
import type { AdfDoc } from '@/components/catalyst-detail-views/shared/sections/Description/utils/adfToTiptap';
import { BrHealthStatusIndicator } from '@/components/business-request/BrHealthStatusIndicator';

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
  health?: BusinessRequestHealth | null;
}

export function BrDescriptionSection({ request, onUpdate, health }: Props) {
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Description column is a string: either serialised ADF or plain text.
  // The ADF heuristic matches the previous implementation: starts with
  // `{"type":"doc"…`. Anything else gets wrapped in a single-paragraph
  // ADF doc so the Tiptap editor opens with the user's text preserved.
  const description = request?.description ?? '';
  const hasContent = description.trim().length > 0;

  const initialAdf: AdfDoc | null = useMemo(() => {
    if (!hasContent) return null;
    try {
      const parsed = JSON.parse(description);
      if (
        parsed &&
        typeof parsed === 'object' &&
        (parsed as { type?: string }).type === 'doc'
      ) {
        return parsed as AdfDoc;
      }
    } catch {
      /* not JSON — fall through to plain-text wrap */
    }
    return {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: description }] },
      ],
    } as AdfDoc;
  }, [description, hasContent]);

  if (!request) return null;

  return (
    <section
      data-cv-section="br-description"
      style={{ marginBottom: 16 }}
      aria-label="Description"
    >
      {health && <BrHealthStatusIndicator health={health} />}
      <h2
        style={{
          margin: '0 0 8px 0',
          fontSize: 14,
          fontWeight: 500,
          lineHeight: '20px',
          color: token('color.text.subtle', 'var(--ds-text-subtle, #44546F)'),
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        Description
      </h2>
      {editing ? (
        <RichTextEditor
          initialAdf={initialAdf}
          isSaving={isSaving}
          onSave={async (adfJson) => {
            setIsSaving(true);
            try {
              await onUpdate('description', adfJson);
              setEditing(false);
            } finally {
              setIsSaving(false);
            }
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          data-testid="br-view--description-expand"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: hasContent ? '8px 0' : '8px 0',
            minHeight: hasContent ? 60 : 80,
            background: 'transparent',
            border: 'none',
            borderRadius: 3,
            color: hasContent
              ? token('color.text', 'var(--ds-text, #172B4D)')
              : token('color.text.subtlest', 'var(--ds-text-disabled, #8590A2)'),
            fontSize: 14,
            fontFamily: 'var(--cp-font-body)',
            cursor: 'text',
            lineHeight: '20px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = token(
              'color.background.neutral.hovered',
              'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.04))',
            );
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {hasContent ? (
            <DisplayView adf={initialAdf} />
          ) : (
            'Describe what this business request covers, why it is needed, and the current gap or pain point it addresses…'
          )}
        </button>
      )}
    </section>
  );
}

export default BrDescriptionSection;
