/**
 * EmojiPicker — full panel with search, categories, frequently-used row.
 *
 * Two render modes via the `mode` prop:
 *   - 'inline' (from : typeahead): compact, no category sidebar, filtered
 *     by the inline query string passed from the parent.
 *   - 'panel'  (from toolbar emoji button): full panel with search input
 *     auto-focused, category headers, frequently used row.
 *
 * Position is controlled by the parent via the `coords` prop.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ALL_EMOJIS,
  EMOJI_CATEGORIES,
  readFrequentlyUsed,
  recordEmojiUsed,
  type EmojiEntry,
} from '../../data/unicodeEmojis';

interface Props {
  mode: 'inline' | 'panel';
  /** Query text typed after `:` when mode === 'inline'. */
  inlineQuery?: string;
  coords: { left: number; top: number; bottom: number } | { anchor: HTMLElement };
  onSelect: (emoji: EmojiEntry) => void;
  onDismiss: () => void;
}

function matchEmojis(query: string): EmojiEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_EMOJIS.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.shortName.toLowerCase().includes(q),
  ).slice(0, 32);
}

function resolveCoords(c: Props['coords']): { left: number; top: number } {
  if ('anchor' in c) {
    const r = c.anchor.getBoundingClientRect();
    return { left: r.left, top: r.bottom + 4 };
  }
  return { left: c.left, top: c.bottom + 4 };
}

export function EmojiPicker({ mode, inlineQuery = '', coords, onSelect, onDismiss }: Props) {
  const [search, setSearch] = useState('');
  const [frequent] = useState<EmojiEntry[]>(() => readFrequentlyUsed());
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (mode === 'panel') inputRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onDismiss]);

  const activeQuery = mode === 'inline' ? inlineQuery : search;
  const filtered = useMemo(() => matchEmojis(activeQuery), [activeQuery]);

  const { left, top } = resolveCoords(coords);

  const pickEmoji = (e: EmojiEntry) => {
    recordEmojiUsed(e.shortName);
    onSelect(e);
  };

  return (
    <div
      role="dialog"
      aria-label="Emoji picker"
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 2147483600,
        width: mode === 'panel' ? 320 : 280,
        maxHeight: 360,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4,
        boxShadow: '0 4px 8px -2px var(--ds-shadow-raised, rgba(9,30,66,0.25)), 0 0 1px var(--ds-shadow-raised, rgba(9,30,66,0.31))',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {mode === 'panel' && (
        <div style={{ padding: 8, borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search emoji"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: 'var(--ds-font-size-400)',
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 3,
              background: 'var(--ds-surface, #FFFFFF)',
              color: 'var(--ds-text, #292A2E)',
              outline: 'none',
            }}
          />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {activeQuery ? (
          filtered.length === 0 ? (
            <div
              style={{
                fontSize: 'var(--ds-font-size-200)',
                color: 'var(--ds-text-subtlest, #6B778C)',
                padding: 12,
                textAlign: 'center',
              }}
            >
              No emoji match
            </div>
          ) : (
            <EmojiGrid emojis={filtered} onPick={pickEmoji} />
          )
        ) : (
          <>
            {mode === 'panel' && frequent.length > 0 && (
              <EmojiSection title="Frequently used" emojis={frequent} onPick={pickEmoji} />
            )}
            {mode === 'panel' &&
              EMOJI_CATEGORIES.map((c) => (
                <EmojiSection
                  key={c.id}
                  title={c.label}
                  emojis={c.emojis}
                  onPick={pickEmoji}
                />
              ))}
            {mode === 'inline' && (
              <div
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  color: 'var(--ds-text-subtlest, #6B778C)',
                  padding: 12,
                  textAlign: 'center',
                }}
              >
                Type to search for an emoji
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmojiSection({
  title,
  emojis,
  onPick,
}: {
  title: string;
  emojis: EmojiEntry[];
  onPick: (e: EmojiEntry) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 600,
          color: 'var(--ds-text-subtle, #44546F)',
          marginBottom: 6,
          textTransform: 'none',
        }}
      >
        {title}
      </div>
      <EmojiGrid emojis={emojis} onPick={onPick} />
    </div>
  );
}

function EmojiGrid({
  emojis,
  onPick,
}: {
  emojis: EmojiEntry[];
  onPick: (e: EmojiEntry) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 2,
      }}
    >
      {emojis.map((e) => (
        <button
          key={e.shortName}
          type="button"
          title={`:${e.shortName}:`}
          aria-label={e.name}
          onMouseDown={(ev) => ev.preventDefault()}
          onClick={() => onPick(e)}
          style={{
            width: 30,
            height: 30,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 'var(--ds-font-size-600)',
          }}
          onMouseEnter={(ev) => {
            ev.currentTarget.style.background =
              'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
          }}
          onMouseLeave={(ev) => {
            ev.currentTarget.style.background = 'transparent';
          }}
        >
          {e.char}
        </button>
      ))}
    </div>
  );
}
