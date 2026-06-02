/**
 * BizArabicTranslateLink — per-row inline "Translate to English" affordance
 * for Arabic-content BR rows in the product backlog table.
 *
 * 2026-06-01 (catalyst-clone F7): mirrors the BrTitleSection view affordance
 * but does NOT persist translations to the DB — translation is per-row,
 * per-session display only. Page reload reverts to the original Arabic.
 *
 * Why not just use TitleTranslateWrapper? The Work cell's summary is
 * already inline-editable via makeSummaryInlineEditCell — two interaction
 * models on the same text would conflict. This component renders the
 * translate link beneath the summary as a separate affordance.
 */
import React, { useCallback, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { containsArabic } from '@/lib/detectArabic';

interface Props {
  /** BR request key (e.g. "MDT-221") — used as the translation cache key. */
  issueKey: string | null;
  /** The original Arabic summary text. */
  original: string;
  /** Optional callback fired when the user toggles translation state. */
  onChange?: (display: string) => void;
}

export function BizArabicTranslateLink({ issueKey, original, onChange }: Props) {
  const { translate, isTranslating } = useTranslation();
  const [translated, setTranslated] = useState<string | null>(null);
  const [showing, setShowing] = useState<'original' | 'translated'>('original');

  const handleTranslate = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isTranslating) return;
    if (translated) {
      // Already translated, just swap display
      setShowing('translated');
      onChange?.(translated);
      return;
    }
    const result = await translate(original, {
      issueKey: issueKey ?? '',
      field: 'summary',
      target: 'en',
    });
    if (result) {
      setTranslated(result);
      setShowing('translated');
      onChange?.(result);
    }
  }, [isTranslating, translated, translate, original, issueKey, onChange]);

  const handleRevert = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowing('original');
    onChange?.(original);
  }, [original, onChange]);

  if (!containsArabic(original)) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        marginLeft: 8,
      }}
    >
      {isTranslating ? (
        <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>Translating…</span>
      ) : showing === 'translated' ? (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleRevert}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ds-link, #0052CC)',
            cursor: 'pointer',
            padding: 0,
            fontSize: 11,
            fontFamily: 'inherit',
          }}
        >
          ↩ Show original
        </button>
      ) : (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleTranslate}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ds-link, #0052CC)',
            cursor: 'pointer',
            padding: 0,
            fontSize: 11,
            fontFamily: 'inherit',
          }}
        >
          Translate to English
        </button>
      )}
    </span>
  );
}

export default BizArabicTranslateLink;
