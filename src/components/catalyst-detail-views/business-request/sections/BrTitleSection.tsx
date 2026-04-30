/**
 * BrTitleSection — editable Business Request title using Atlaskit InlineEdit.
 *
 * Mirrors `CatalystTitleEditor`'s pattern (Phase C 2026-04-18) — InlineEdit
 * wrapping a heading-styled read view + Atlaskit Textfield edit view —
 * but operates on the BR domain shape (`request.title` / `request_key`)
 * rather than the Catalyst-issue shape (`summary` / `issue_key`).
 *
 * Saves to `business_requests.title` via the parent's `onUpdate` callback.
 */
import InlineEdit from '@atlaskit/inline-edit';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import type { BusinessRequest } from '@/types/business-request';

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
}

export function BrTitleSection({ request, onUpdate }: Props) {
  if (!request) return null;

  const value = request.title || '';

  return (
    <section
      data-cv-section="br-title"
      style={{ marginBottom: 12 }}
      aria-label="Business Request title"
    >
      <div className="cv-title-edit-hide-label">
        <InlineEdit<string>
          label="Business Request title"
          defaultValue={value}
          editView={({ errorMessage: _err, ...fieldProps }) => (
            <Textfield {...fieldProps} autoFocus />
          )}
          readView={() => (
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                lineHeight: '28px',
                fontWeight: 653,
                // Cycle 7 dark-mode fix: token('color.text') resolves to its
                // hardcoded fallback hex regardless of theme (CLAUDE.md Phase 2
                // lesson). --cp-text-primary IS Catalyst-CSS-flipped in dark.
                color: 'var(--cp-text-primary, #292A2E)',
                fontFamily: 'var(--cp-font-body)',
                letterSpacing: '-0.005em',
                wordBreak: 'break-word',
              }}
            >
              {value || 'Untitled'}
            </h1>
          )}
          onConfirm={(next) => {
            const trimmed = (next ?? '').trim();
            if (!trimmed || trimmed === value) return;
            void onUpdate('title', trimmed);
          }}
          keepEditViewOpenOnBlur={false}
        />
      </div>
    </section>
  );
}

export default BrTitleSection;
