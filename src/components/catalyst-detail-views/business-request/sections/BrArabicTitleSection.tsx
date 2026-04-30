/**
 * BrArabicTitleSection — Arabic title (RTL) + bidirectional Translate.
 *
 * Real implementation as of cycle 2:
 *  - Atlaskit InlineEdit + Textfield with `direction: rtl`
 *  - Translate button (shared `BrTranslateButton`) calling
 *    `ai-improve-story` edge function with `improve_type: 'translate_text'`
 *  - Bidirectional: button next to Arabic field translates Arabic → English;
 *    a complement button is also rendered next to the English title (the
 *    main `BrTitleSection`) — that's wired in cycle 2b. For now, only the
 *    AR → EN direction lives in this section so users can re-translate
 *    after editing the Arabic copy.
 *  - Saves to `business_requests.arabic_title` via parent's `onUpdate`
 *
 * RTL styling: scoped via testId so it doesn't bleed onto other Textfields
 * (per CreateBusinessRequestModal's pattern).
 */
import { useCallback } from 'react';
import InlineEdit from '@atlaskit/inline-edit';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { flag } from '@/components/shared/JiraTable/flags';
import { BrTranslateButton, useBrTranslate } from '@/components/business-requests/shared';
import type { BusinessRequest } from '@/types/business-request';

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
}

export function BrArabicTitleSection({ request, onUpdate }: Props) {
  const { translate, translating } = useBrTranslate();

  const handleTranslateToEnglish = useCallback(async () => {
    if (!request?.arabic_title?.trim()) return;
    const result = await translate(request.arabic_title, 'ar_to_en');
    if (result) {
      void onUpdate('title', result);
      flag.success('Translated', 'English title updated from Arabic');
    } else {
      flag.warning('Translation unavailable', 'Please edit the English title manually');
    }
  }, [request?.arabic_title, translate, onUpdate]);

  if (!request) return null;

  const value = request.arabic_title || '';

  return (
    <section
      data-cv-section="br-arabic-title"
      style={{ marginBottom: 16 }}
      aria-label="Arabic title"
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
        Arabic title
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <InlineEdit<string>
            label="Arabic title"
            defaultValue={value}
            editView={({ errorMessage: _err, ...fieldProps }) => (
              <Textfield
                {...fieldProps}
                autoFocus
                placeholder="اسم طلب الأعمال"
                testId="br-view--arabic-title-input"
              />
            )}
            readView={() => (
              <div
                dir="rtl"
                style={{
                  textAlign: 'right',
                  fontSize: 14,
                  fontFamily: 'var(--cp-font-body)',
                  color: token('color.text', '#292A2E'),
                  padding: '6px 8px',
                  minHeight: 32,
                  cursor: 'text',
                  borderRadius: 3,
                }}
              >
                {value || (
                  <span style={{ color: token('color.text.subtlest', '#8590A2') }}>
                    Click to add Arabic title
                  </span>
                )}
              </div>
            )}
            onConfirm={(next) => {
              const trimmed = (next ?? '').trim();
              if (trimmed === value) return;
              void onUpdate('arabic_title', trimmed || null);
            }}
            keepEditViewOpenOnBlur={false}
          />
          {/* Scoped RTL on the inner input — same pattern as CreateBusinessRequestModal. */}
          <style>{`
            [data-testid="br-view--arabic-title-input"] {
              direction: rtl;
              text-align: right;
              font-size: 15px;
            }
          `}</style>
        </div>
        <BrTranslateButton
          loading={translating === 'ar_to_en'}
          label="Translate Arabic → English"
          onClick={handleTranslateToEnglish}
        />
      </div>
    </section>
  );
}

export default BrArabicTitleSection;
