/**
 * MentionPicker — popover anchored at the editor caret listing matching
 * Catalyst users. Selection inserts a mention chip into the editor.
 *
 * Data source: Supabase `profiles` table, filtered by full_name ilike.
 * Limited to 8 results to keep the popover compact.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MentionUser {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
}

interface Props {
  query: string;
  coords: { left: number; top: number; bottom: number };
  onSelect: (user: MentionUser) => void;
  onDismiss: () => void;
}

export function MentionPicker({ query, coords, onSelect, onDismiss }: Props) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name', { ascending: true })
        .limit(8);
      if (query) q.ilike('full_name', `%${query}%`);
      const { data, error } = await q;
      if (cancelled || error) return;
      setUsers((data ?? []) as MentionUser[]);
      setActiveIdx(0);
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => (users.length === 0 ? 0 : (i + 1) % users.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => (users.length === 0 ? 0 : (i - 1 + users.length) % users.length));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        const u = users[activeIdx];
        if (u) {
          e.preventDefault();
          onSelect(u);
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [users, activeIdx, onSelect, onDismiss]);

  if (users.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Mention picker"
      style={{
        position: 'fixed',
        left: coords.left,
        top: coords.bottom + 4,
        zIndex: 2147483600,
        minWidth: 240,
        maxWidth: 320,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4,
        boxShadow: '0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)',
        padding: 4,
      }}
    >
      {users.map((u, i) => (
        <button
          key={u.id}
          type="button"
          role="option"
          aria-selected={i === activeIdx}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(u)}
          onMouseEnter={() => setActiveIdx(i)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            border: 'none',
            borderRadius: 3,
            background:
              i === activeIdx
                ? 'var(--ds-background-selected, #E9F2FE)'
                : 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {u.avatar_url ? (
            <img
              src={u.avatar_url}
              alt=""
              width={24}
              height={24}
              style={{ borderRadius: '50%' }}
            />
          ) : (
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--ds-background-neutral, #F1F2F4)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ds-text-subtle, #44546F)',
              }}
            >
              {(u.full_name ?? '?').charAt(0).toUpperCase()}
            </span>
          )}
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 14, color: 'var(--ds-text, #292A2E)' }}>
              {u.full_name}
            </span>
            {u.email && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--ds-text-subtlest, #6B778C)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {u.email}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

export type { MentionUser };
