import React, { useCallback, useRef, useState } from 'react';
import Tooltip from '@atlaskit/tooltip';
import EditorUndoIcon from '@atlaskit/icon/glyph/editor/undo';
import { useTranslation } from '@/hooks/useTranslation';
import { containsArabic } from '@/lib/detectArabic';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import './title-translate.css';

interface Props {
  issueKey: string | null;
  original: string;
  onChange?: (display: string) => void;
}

export function BizArabicTranslateLink({ issueKey, original, onChange }: Props) {
  const { translate, isTranslating } = useTranslation();
  const [translated, setTranslated] = useState<string | null>(null);
  const [showing, setShowing] = useState<'original' | 'translated'>('original');
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

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
      ref={containerRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
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
            color: 'var(--ds-text-information)',
          }}
        >
          <span className="ttw-caty-pulse"><CatyPulseIcon size={14} /></span>
          <span>Translating…</span>
        </span>
      ) : showing === 'translated' ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--ds-text-success)',
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
              color: 'var(--ds-link)',
              cursor: 'pointer',
              padding: 0,
              fontSize: 11,
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0,
            }}
          >
            <EditorUndoIcon label="" size="small" />
            Show original
          </button>
        </span>
      ) : (
        <Tooltip content="Translate to English" position="top">
          <button
            type="button"
            aria-label="Translate to English"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleTranslate}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: 3,
              color: 'var(--ds-text-subtlest)',
              cursor: 'pointer',
              padding: '0px 4px',
              fontSize: 12,
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              width: 22,
              height: 20,
              flexShrink: 0,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.12s ease',
            }}
          >
            <CatyPulseIcon size={14} />
          </button>
        </Tooltip>
      )}
    </span>
  );
}

export default BizArabicTranslateLink;
