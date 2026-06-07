import React, { useCallback, useState } from 'react';
import Spinner from '@atlaskit/spinner';
import EditorUndoIcon from '@atlaskit/icon/glyph/editor/undo';
import { useTranslation } from '@/hooks/useTranslation';
import { containsArabic } from '@/lib/detectArabic';

interface Props {
  issueKey: string | null;
  original: string;
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
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--ds-text-information, #0747A6)',
          }}
        >
          <Spinner size="xsmall" />
          <span>Translating…</span>
        </span>
      ) : showing === 'translated' ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--ds-text-success, #006644)',
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.7 }}>AR → EN</span>
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <EditorUndoIcon label="" size="small" />
            Show original
          </button>
        </span>
      ) : (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleTranslate}
          style={{
            background: 'transparent',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 3,
            color: 'var(--ds-text-subtle, #44546F)',
            cursor: 'pointer',
            padding: '2px 8px',
            fontSize: 11,
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 12, opacity: 0.7 }}>🌐</span>
          Translate to English
        </button>
      )}
    </span>
  );
}

export default BizArabicTranslateLink;
