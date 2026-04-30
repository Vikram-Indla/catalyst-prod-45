/**
 * BrArabicTitleSection — Arabic title (RTL) + bidirectional Translate.
 *
 * Cycle 1 stub. Cycle 2 will:
 *  - Wire to `business_requests.arabic_title` via `onUpdate`
 *  - Render an @atlaskit/textfield with `dir="rtl"` + Atlaskit InlineEdit
 *  - Reuse a shared `TranslateButton` (extracted from
 *    CreateBusinessRequestModal in cycle 2) calling
 *    `supabase.functions.invoke('ai-improve-story', { improve_type:
 *    'translate_text', direction: 'en_to_ar' | 'ar_to_en' })`
 */
import type { BusinessRequest } from '@/types/business-request';

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
}

export function BrArabicTitleSection({ request, onUpdate: _onUpdate }: Props) {
  if (!request) return null;
  return (
    <section
      data-cv-section="br-arabic-title"
      style={{ marginBottom: 16 }}
      aria-label="Arabic title"
    >
      <div
        style={{
          fontSize: 11,
          color: '#6B6E76',
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: 4,
          letterSpacing: '0.04em',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        Arabic title <span style={{ textTransform: 'none', color: '#8590A2' }}>(cycle 2 stub)</span>
      </div>
      <div
        style={{
          direction: 'rtl',
          textAlign: 'right',
          fontSize: 14,
          fontFamily: 'var(--cp-font-body)',
          color: '#292A2E',
          padding: '4px 0',
        }}
      >
        {request.arabic_title || '—'}
      </div>
    </section>
  );
}

export default BrArabicTitleSection;
