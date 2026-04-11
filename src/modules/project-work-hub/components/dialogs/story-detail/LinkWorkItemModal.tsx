/**
 * LinkWorkItemModal — Modal for linking work items with custom dropdown
 */
import React, { useState, useCallback, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { V, LINK_TYPES } from './tokens';
import { CustomDropdown } from './CustomDropdown';
import { IssueTypeIcon } from './IssueTypeIcon';
import { StatusLozenge } from './StatusLozenge';

export function LinkWorkItemModal({ isOpen, onClose, issueId, onLinked }: {
  isOpen: boolean; onClose: () => void; issueId: string; onLinked: () => void;
}) {
  const [linkType, setLinkType] = useState('relates_to');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, status_category, issue_type')
        .or(`summary.ilike.%${q}%,issue_key.ilike.%${q}%`)
        .neq('id', issueId)
        .is('deleted_at', null)
        .limit(10);
      setResults(data ?? []);
    }, 300);
  }, [issueId]);

  const handleLink = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ph_issue_links').insert({
      source_id: issueId,
      target_id: selected.id,
      link_type: linkType,
      created_by: user?.id,
    });
    setSaving(false);
    onLinked();
    onClose();
    setSearch(''); setResults([]); setSelected(null);
    toast.success('Issue linked');
  }, [selected, issueId, linkType, onLinked, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.4)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 520, maxWidth: 'calc(100vw - 48px)', background: V.white,
        borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', maxHeight: '70vh',
        animation: 'sdm-confirm-in 150ms ease-out both',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `0.75px solid ${V.border}`,
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: V.textPrimary, fontFamily: 'Sora, sans-serif' }}>Link work item</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: V.textMuted }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, flex: 1, overflow: 'auto' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: V.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Link type</label>
          <CustomDropdown value={linkType} onChange={setLinkType} options={LINK_TYPES} />

          <label style={{ fontSize: 11, fontWeight: 600, color: V.textMuted, display: 'block', marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Search for work item</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: V.textMuted }} />
            <input
              autoFocus value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by key or title..."
              style={{
                width: '100%', padding: '8px 12px 8px 30px', fontSize: 13,
                border: `0.75px solid ${V.border}`, borderRadius: 4,
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {results.map(r => {
              const isSelected = selected?.id === r.id;
              return (
                <div
                  key={r.id} onClick={() => setSelected(r)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', cursor: 'pointer', borderRadius: 4,
                    background: isSelected ? V.selectedRow : 'transparent',
                    borderBottom: `0.75px solid ${V.insetBg}`,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = V.hoverRow; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <IssueTypeIcon type={r.issue_type} size={14} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: V.linkBlue, flexShrink: 0 }}>{r.issue_key}</span>
                  <span style={{ flex: 1, fontSize: 13, color: V.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.summary}</span>
                  <StatusLozenge status={r.status || 'To Do'} category={r.status_category} />
                </div>
              );
            })}
            {search.length >= 2 && results.length === 0 && (
              <div style={{ fontSize: 13, color: V.textMuted, textAlign: 'center', padding: 16 }}>No results found</div>
            )}
          </div>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '12px 20px', borderTop: `0.75px solid ${V.border}`,
        }}>
          <button onClick={onClose} style={{
            padding: '6px 16px', fontSize: 13, border: `0.75px solid ${V.border}`,
            borderRadius: 6, background: V.white, color: V.textPrimary, cursor: 'pointer',
          }}>Cancel</button>
          <button
            onClick={handleLink} disabled={!selected || saving}
            style={{
              padding: '6px 16px', fontSize: 13, fontWeight: 600,
              border: 'none', borderRadius: 6, cursor: selected ? 'pointer' : 'not-allowed',
              background: selected ? V.primaryBlue : V.textDisabled, color: '#fff', opacity: saving ? 0.6 : 1,
            }}
          >Link</button>
        </div>
      </div>
    </div>
  );
}
