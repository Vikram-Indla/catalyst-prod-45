import React, { useCallback } from 'react';
import EditorUndoIcon from '@atlaskit/icon/glyph/editor/undo';
import { cn } from '@/lib/utils';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import { flag } from '@/components/shared/JiraTable/flags';
import { containsArabic } from '@/lib/detectArabic';
import { useTranslation } from '@/hooks/useTranslation';
import './title-translate.css';

export interface DescriptionTranslateBarProps {
  plainText: string;
  issueKey: string;
  isTranslated: boolean;
  onTranslated: (text: string) => void;
  onRevert: () => void;
  className?: string;
}

export function DescriptionTranslateBar({
  plainText,
  issueKey,
  isTranslated,
  onTranslated,
  onRevert,
  className,
}: DescriptionTranslateBarProps) {
  const { translate, isTranslating } = useTranslation();

  const isArabic = containsArabic(plainText);
  const target: 'ar' | 'en' = isArabic ? 'en' : 'ar';
  const langLabel = target === 'ar' ? 'EN → AR' : 'AR → EN';
  const translateLabel = target === 'ar' ? 'Translate to Arabic' : 'Translate to English';

  const handleTranslate = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!plainText.trim() || isTranslating) return;
      const result = await translate(plainText, {
        issueKey,
        field: 'description',
        target,
      });
      if (result) {
        onTranslated(result);
      } else {
        flag.error('Translation failed');
      }
    },
    [plainText, isTranslating, translate, issueKey, target, onTranslated],
  );

  const handleRevert = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRevert();
    },
    [onRevert],
  );

  if (!plainText.trim()) return null;
  if (!isArabic && !isTranslated) return null;

  return (
    <div className={cn('ttw-action-row', className)} style={{ marginTop: 8 }}>
      {isTranslating ? (
        <span
          className="ttw-translating-chip"
          aria-live="polite"
          aria-label="Translating"
        >
          <span className="ttw-caty-pulse"><CatyPulseIcon size={16} /></span>
          <span>Translating…</span>
        </span>
      ) : !isTranslated ? (
        <button
          type="button"
          className="ttw-translate-chip"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleTranslate}
          disabled={isTranslating}
          aria-label={translateLabel}
        >
          <CatyPulseIcon size={14} />
          {translateLabel}
          <span className="ttw-translate-chip__arrow" aria-hidden="true">→</span>
        </button>
      ) : null}
    </div>
  );
}
