/**
 * DescriptionTranslateBar — 3-state CATY translate affordance for description fields.
 *
 * States:
 *   idle        → "Translate to Arabic / English" link
 *   translating → "✦ CATY is translating" + 5-bar waveform  (conic border fires on parent)
 *   done        → "✦ CATY translated · ↩ Show original"
 *
 * Reuses CSS classes from title-translate.css — no additional styles needed.
 */
import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { containsArabic } from '@/lib/detectArabic';
import { useTranslation } from '@/hooks/useTranslation';

export interface DescriptionTranslateBarProps {
  /** Plain-text source of the description (from adfToPlainText). */
  plainText: string;
  /** Jira issue key — used for cache. Pass '' to skip caching. */
  issueKey: string;
  /**
   * Cache/routing field name.
   * Defaults to 'description'. Pass 'comment:<id>' for comment translation.
   */
  field?: string;
  /** Whether we are currently showing a translated version. */
  isTranslated: boolean;
  /** Called with the translated string when translation succeeds. */
  onTranslated: (text: string) => void;
  /** Called when the user clicks "Show original". */
  onRevert: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function DescriptionTranslateBar({
  plainText,
  issueKey,
  field = 'description',
  isTranslated,
  onTranslated,
  onRevert,
  className,
  style,
}: DescriptionTranslateBarProps) {
  const { translate, isTranslating } = useTranslation();

  const isArabic = containsArabic(plainText);
  const target: 'ar' | 'en' = isArabic ? 'en' : 'ar';

  const handleTranslate = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!plainText.trim() || isTranslating) return;
      const result = await translate(plainText, {
        issueKey,
        field,
        target,
      });
      if (result) {
        onTranslated(result);
      } else {
        toast.error('Translation failed');
      }
    },
    [plainText, isTranslating, translate, issueKey, field, target, onTranslated],
  );

  const handleRevert = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRevert();
    },
    [onRevert],
  );

  if (!plainText.trim()) return null;

  return (
    <div className={cn('ttw-action-row', className)} style={{ marginTop: 8, ...style }}>
      {isTranslating ? (
        <span
          className="ttw-caty-translating"
          aria-live="polite"
          aria-label="CATY is translating"
        >
          <span className="ttw-sparkle" aria-hidden="true">✦</span>
          <span>CATY is translating</span>
          <span className="ttw-waveform" aria-hidden="true">
            <span /><span /><span /><span /><span />
          </span>
        </span>
      ) : isTranslated ? (
        <span className="ttw-translated-state">
          <span className="ttw-sparkle" aria-hidden="true">✦</span>
          <span>CATY translated</span>
          <span className="ttw-sep" aria-hidden="true">·</span>
          <button
            type="button"
            className="ttw-revert-btn"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleRevert}
            aria-label="Show original description"
          >
            ↩ Show original
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="ttw-translate-btn"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleTranslate}
          disabled={isTranslating}
          aria-label={
            target === 'ar' ? 'Translate description to Arabic' : 'Translate description to English'
          }
        >
          {target === 'ar' ? 'Translate to Arabic' : 'Translate to English'}
        </button>
      )}
    </div>
  );
}
