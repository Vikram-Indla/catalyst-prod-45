/**
 * BrDescriptionSection — collapsed-until-clicked rich-text description.
 *
 * Read view: renders the existing description as ADF via the canonical
 * `EpicDescriptionRenderer` (or a plain-text fallback when the value
 * isn't ADF-shaped).
 *
 * Edit view: lazily mounts `@atlaskit/editor-core` via the canonical
 * `EpicDescriptionEditor` (`appearance="comment"` so users get the
 * built-in Save / Cancel buttons that match Jira chrome). Saving writes
 * the serialized ADF JSON string back to `business_requests.description`
 * via the parent's `onUpdate` callback.
 *
 * The collapse-until-clicked pattern matters: the Atlaskit editor bundle
 * is ~500 KB and its own focus-on-mount otherwise steals focus from
 * sibling fields (CLAUDE.md "create-issue modal cycle 1" lesson).
 */
import { useState, Suspense, lazy } from 'react';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import type { BusinessRequest } from '@/types/business-request';

const EpicDescriptionEditor = lazy(
  () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionEditor'),
);

const EpicDescriptionRenderer = lazy(() =>
  import('@/components/shared/rich-text/atlaskit/EpicDescriptionRenderer').then((m) => ({
    default:
      (m as Record<string, unknown>).default
        ?? (m as Record<string, unknown>).EpicDescriptionRenderer,
  })) as Promise<{ default: React.ComponentType<{ adf?: unknown; fallbackText?: string | null }> }>,
);

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
}

export function BrDescriptionSection({ request, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);

  if (!request) return null;

  const description = request.description;
  const hasContent = !!description && description.trim().length > 0;

  // Heuristic: ADF JSON string starts with `{"type":"doc"`. Otherwise treat
  // as plain text (the renderer's fallbackText branch handles it).
  let initialAdf: unknown = null;
  if (hasContent) {
    try {
      const parsed = JSON.parse(description!);
      if (parsed && typeof parsed === 'object' && (parsed as { type?: string }).type === 'doc') {
        initialAdf = parsed;
      }
    } catch {
      // Plain-text — leave initialAdf null so the editor starts empty
      // BUT the renderer falls back to plain text on read view.
    }
  }

  return (
    <section
      data-cv-section="br-description"
      style={{ marginBottom: 16 }}
      aria-label="Description"
    >
      <div
        style={{
          fontSize: 11,
          color: token('color.text.subtle', '#6B6E76'),
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: 6,
          letterSpacing: '0.04em',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        Description
      </div>
      {editing ? (
        <Suspense
          fallback={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 160,
              }}
            >
              <Spinner size="medium" />
            </div>
          }
        >
          <EpicDescriptionEditor
            workItemId={request.id}
            initialContent={initialAdf}
            placeholder="Describe what this business request covers..."
            appearance="comment"
            onSave={async (adfJson: string) => {
              await onUpdate('description', adfJson);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </Suspense>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          data-testid="br-view--description-expand"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: hasContent ? '8px 12px' : '12px',
            minHeight: hasContent ? 60 : 80,
            background: 'transparent',
            border: hasContent
              ? `1px solid ${token('color.border', '#DFE1E6')}`
              : `1px dashed ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            color: hasContent
              ? token('color.text', '#292A2E')
              : token('color.text.subtlest', '#8590A2'),
            fontSize: 14,
            fontFamily: 'var(--cp-font-body)',
            cursor: 'text',
            lineHeight: '20px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = token(
              'color.background.neutral.hovered',
              'rgba(9,30,66,0.04)',
            );
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {hasContent ? (
            initialAdf ? (
              <Suspense fallback={<span>Loading…</span>}>
                <EpicDescriptionRenderer adf={initialAdf} fallbackText={description} />
              </Suspense>
            ) : (
              <span style={{ whiteSpace: 'pre-wrap' }}>{description}</span>
            )
          ) : (
            'Describe what this business request covers, why it is needed, and the current gap or pain point it addresses…'
          )}
        </button>
      )}
    </section>
  );
}

export default BrDescriptionSection;
