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
import { useState, useEffect } from 'react';
import InlineEdit from '@atlaskit/inline-edit';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { TitleTranslateWrapper } from '@/components/shared/title-translate/TitleTranslateWrapper';
import type { BusinessRequest } from '@/types/business-request';

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
}

export function BrTitleSection({ request, onUpdate }: Props) {
  const [localTitle, setLocalTitle] = useState(request?.title ?? '');

  // Sync when a different BR is opened or an external DB update arrives
  useEffect(() => {
    setLocalTitle(request?.title ?? '');
  }, [request?.title]);

  if (!request) return null;

  const handleValueChange = (next: string) => {
    setLocalTitle(next);          // immediate visual update — no DB round-trip wait
    void onUpdate('title', next);
  };

  return (
    <section
      data-cv-section="br-title"
      style={{ marginBottom: 12 }}
      aria-label="Business Request title"
    >
      <div className="cv-title-edit-hide-label">
        <InlineEdit<string>
          key={request.id ?? request.request_key}
          label="Business Request title"
          defaultValue={localTitle}
          editView={({ errorMessage: _err, ...fieldProps }) => (
            <Textfield {...fieldProps} autoFocus />
          )}
          readView={() => (
            <TitleTranslateWrapper
              value={localTitle}
              issueKey={request.request_key ?? ''}
              field="summary"
              onValueChange={handleValueChange}
            >
              {({ dir }) => (
                <div dir={dir}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 24,
                      lineHeight: '28px',
                      fontWeight: 653,
                      color: token('color.text', '#292A2E'),
                      fontFamily: 'var(--cp-font-body)',
                      letterSpacing: '-0.005em',
                      wordBreak: 'break-word',
                    }}
                  >
                    {localTitle || 'Untitled'}
                  </h1>
                </div>
              )}
            </TitleTranslateWrapper>
          )}
          onConfirm={(next) => {
            const trimmed = (next ?? '').trim();
            if (!trimmed || trimmed === localTitle) return;
            setLocalTitle(trimmed);
            void onUpdate('title', trimmed);
          }}
          keepEditViewOpenOnBlur={false}
        />
      </div>
    </section>
  );
}

export default BrTitleSection;
