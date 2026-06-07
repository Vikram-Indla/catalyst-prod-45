import React, { useCallback } from 'react';
import Spinner from '@atlaskit/spinner';
import EditorUndoIcon from '@atlaskit/icon/glyph/editor/undo';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
        toast.error('Translation failed');
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
          <Spinner size="small" />
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
          <span className="ttw-translate-chip__globe" aria-hidden="true" style={{display:"inline-flex"}}><svg width="14" height="14" viewBox="0 0 512 512" fill="none" style={{flexShrink:0}}><rect width="512" height="512" rx="129.62" fill="#1868DB"/><path d="M421.802 200.297V93.9736H259.279L233.457 127.39L210.674 93.9736H154.474C39.037 223.992 106.375 363.833 154.474 417.501H421.802V309.659H279.025L236.495 374.972C170.878 271.686 209.155 173.97 236.495 138.022L279.025 200.297H421.802Z" fill="white"/></svg></span>
          {translateLabel}
          <span className="ttw-translate-chip__arrow" aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}
