/**
 * ThemeItemLinker — Popover to link unlinked work items to a theme
 */
import { useState, useRef, useEffect } from 'react';
import { Search, Link2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import toast from 'react-hot-toast';

interface ThemeItemLinkerProps {
  themeId: string;
  themeName: string;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

interface UnlinkedItem {
  issue_key: string;
  summary: string;
  issue_type: string;
}

export function ThemeItemLinker({ themeId, themeName, isOpen, onClose, anchorRef }: ThemeItemLinkerProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [linking, setLinking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['workhub', 'unlinked-items', themeId],
    queryFn: async () => {
      // Paginated scan for unlinked items
      const allItems: UnlinkedItem[] = [];
      let page = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('wh_issues')
          .select('issue_key, summary, issue_type')
          .is('theme_id', null)
          .order('issue_key')
          .range(page * batchSize, (page + 1) * batchSize - 1);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        allItems.push(...(data as any[]));
        hasMore = data.length === batchSize;
        page++;
      }
      return allItems;
    },
    enabled: isOpen,
    staleTime: 10_000,
  });

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose, anchorRef]);

  useEffect(() => {
    if (isOpen) { setSearch(''); setSelected(new Set()); }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = (items ?? []).filter(i =>
    i.issue_key.toLowerCase().includes(search.toLowerCase()) ||
    i.summary.toLowerCase().includes(search.toLowerCase())
  );

  const toggleItem = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleLink = async () => {
    if (selected.size === 0) return;
    setLinking(true);
    try {
      const keys = Array.from(selected);
      for (let i = 0; i < keys.length; i += 200) {
        const batch = keys.slice(i, i + 200);
        const { error } = await supabase
          .from('wh_issues')
          .update({ theme_id: themeId } as any)
          .in('issue_key', batch);
        if (error) throw new Error(error.message);
      }
      toast.success(`${selected.size} items linked to ${themeName}`);
      qc.invalidateQueries({ queryKey: ['workhub'] });
      onClose();
    } catch (e: any) {
      toast.error(`Link failed: ${e.message}`);
    } finally {
      setLinking(false);
    }
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: '100%', right: 0, marginTop: 4,
        width: 400, maxHeight: 400, background: '#fff',
        border: '1px solid #e2e8f0', borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,.15)', zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--wh-font-sans, Inter, sans-serif)',
      }}
    >
      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#f8fafc', borderRadius: 6, padding: '6px 10px',
        }}>
          <Search size={14} color="#94a3b8" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by key or summary..."
            autoFocus
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 12, width: '100%', color: '#0f172a',
            }}
          />
        </div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {isLoading ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
            Loading items...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
            {search ? 'No matches' : 'No unlinked items'}
          </div>
        ) : (
          filtered.slice(0, 100).map(item => (
            <label
              key={item.issue_key}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', cursor: 'pointer', fontSize: 12,
                background: selected.has(item.issue_key) ? '#f0f9ff' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(item.issue_key)}
                onChange={() => toggleItem(item.issue_key)}
                style={{ accentColor: '#2563eb', flexShrink: 0 }}
              />
              <span style={{
                fontFamily: 'var(--wh-font-mono, monospace)',
                fontWeight: 600, color: '#2563eb', whiteSpace: 'nowrap',
                fontSize: 11,
              }}>
                {item.issue_key}
              </span>
              <span style={{
                padding: '1px 6px', borderRadius: 4,
                fontSize: 10, fontWeight: 600,
                background: '#f1f5f9', color: '#475569',
              }}>
                {item.issue_type}
              </span>
              <span style={{
                color: '#0f172a', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              }}>
                {item.summary}
              </span>
            </label>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid #f1f5f9',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          {selected.size} selected
        </span>
        <button
          onClick={handleLink}
          disabled={selected.size === 0 || linking}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 14px', borderRadius: 6, border: 'none',
            background: selected.size > 0 ? '#2563eb' : '#e2e8f0',
            color: selected.size > 0 ? '#fff' : '#94a3b8',
            fontSize: 12, fontWeight: 600, cursor: selected.size > 0 ? 'pointer' : 'default',
          }}
        >
          <Link2 size={13} />
          {linking ? 'Linking...' : `Link ${selected.size} Selected`}
        </button>
      </div>
    </div>
  );
}
