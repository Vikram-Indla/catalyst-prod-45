/**
 * WikiTranslateBar — hover-reveal Arabic↔English translation for a Wiki
 * page (CAT-DOCS-NOTION-20260704-001). Signature CatyPulse icon, RTL-aware
 * read-only overlay, inline retry on failure. Translation is a VIEW —
 * page content is never modified.
 */
import { useCallback, useState } from 'react';
import type { Block } from '@blocknote/core';
import { supabase } from '@/integrations/supabase/client';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import { X } from '@/lib/atlaskit-icons';
import { blocksToText } from './editor/blocksToText';
import { isArabicDominant } from '@/lib/detectArabic';

type Target = 'en' | 'ar';

const LABEL: Record<Target, string> = {
  en: 'Translate to English',
  ar: 'الترجمة إلى العربية',
};

export interface WikiTranslateBarProps {
  title: string;
  /** Returns the page's current blocks (pending edits included). */
  getBlocks: () => Block[];
}

export function WikiTranslateBar({ title, getBlocks }: WikiTranslateBarProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<Target | null>(null);
  const [translated, setTranslated] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [lastTarget, setLastTarget] = useState<Target>('en');

  const run = useCallback(
    async (target: Target) => {
      setLastTarget(target);
      setLoading(target);
      setError(false);
      setOpen(true);
      const source = `${title}\n\n${blocksToText(getBlocks())}`.trim();
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('ai-translate-field', {
          body: { text: source, target },
        });
        const out = (data as { translated?: string } | null)?.translated;
        if (fnErr || !out) {
          setError(true);
          setTranslated(null);
        } else {
          setTranslated(out);
        }
      } catch {
        setError(true);
        setTranslated(null);
      } finally {
        setLoading(null);
      }
    },
    [title, getBlocks],
  );

  // Offer ONLY the language the page is not already in: an English page shows
  // "الترجمة إلى العربية"; an Arabic page shows "Translate to English" (Vikram
  // 2026-07-06 — same-language button is redundant, never hidden behind hover).
  const pageIsArabic = isArabicDominant(`${title}\n\n${blocksToText(getBlocks())}`);
  const offered: Target[] = pageIsArabic ? ['en'] : ['ar'];

  return (
    <div className="wiki-translate wiki-no-print">
      <div className="wiki-translate__triggers" role="group" aria-label="Translate page" style={{ display: 'flex', gap: 4 }}>
        {offered.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => run(t)}
            disabled={loading !== null}
            aria-label={LABEL[t]}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 8px',
              border: '1px solid var(--ds-border)',
              borderRadius: 6,
              background: 'var(--ds-surface)',
              color: 'var(--ds-text-subtle)',
              font: 'var(--ds-font-body-small)',
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            <CatyPulseIcon size={14} />
            {loading === t ? 'Translating…' : LABEL[t]}
          </button>
        ))}
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Translation"
          dir="auto"
          style={{
            marginTop: 8,
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--ds-border)',
            background: 'var(--ds-surface-raised)',
            boxShadow: 'var(--ds-shadow-overlay)',
            unicodeBidi: 'plaintext',
            position: 'relative',
          }}
        >
          <button
            type="button"
            aria-label="Close translation"
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              top: 8,
              insetInlineEnd: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--ds-icon-subtle)',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
            }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
          {error ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--ds-text-danger)', font: 'var(--ds-font-body-small)' }}>
                Translation failed.
              </span>
              <button
                type="button"
                onClick={() => run(lastTarget)}
                style={{
                  border: '1px solid var(--ds-border)',
                  borderRadius: 4,
                  background: 'transparent',
                  color: 'var(--ds-text)',
                  font: 'var(--ds-font-body-small)',
                  padding: '3px 10px',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <p style={{ margin: 0, color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)' }}>Translating…</p>
          ) : (
            <div
              style={{
                whiteSpace: 'pre-wrap',
                color: 'var(--ds-text)',
                font: 'var(--ds-font-body)',
                paddingInlineEnd: 20,
              }}
            >
              {translated}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WikiTranslateBar;
