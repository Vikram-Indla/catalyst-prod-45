/**
 * LinkWorkItemModal — Link a work item to other issues.
 * Uses real Catalyst data: ph_issue_links table, ph_issues search.
 * Jira-parity link types from LinkedIssuesSection.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, X, ChevronDown, Link as LinkIcon, Loader2 } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { KanbanThemeTokens } from '../kanban-tokens';
import type { BoardIssue } from '../kanban-types';

/* Canonical Jira link types (matches LinkedIssuesSection) */
const JIRA_LINK_TYPES = [
  'is blocked by', 'blocks', 'is BRD of', 'BRD',
  'is cloned by', 'clones', 'is duplicated by', 'duplicates',
  'is implemented by', 'implements', 'relates to',
];

interface LinkWorkItemModalProps {
  issue: BoardIssue;
  tk: KanbanThemeTokens;
  onClose: () => void;
  onLinked: () => void;
}

export function LinkWorkItemModal({ issue, tk, onClose, onLinked }: LinkWorkItemModalProps) {
  const [linkType, setLinkType] = useState(JIRA_LINK_TYPES[0]);
  const [ltOpen, setLtOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ key: string; summary: string; issueType: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const ltRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close link type dropdown on outside click
  useEffect(() => {
    if (!ltOpen) return;
    const h = (e: MouseEvent) => { if (ltRef.current && !ltRef.current.contains(e.target as Node)) setLtOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ltOpen]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  // Fetch existing links to prevent duplicates
  const { data: existingLinks = new Set<string>() } = useQuery({
    queryKey: ['ph-existing-links', issue.issueKey],
    queryFn: async () => {
      const { data } = await supabase.from('ph_issue_links')
        .select('source_id, target_id')
        .or(`source_id.eq.${issue.issueKey},target_id.eq.${issue.issueKey}`);
      const set = new Set<string>();
      (data || []).forEach((r: any) => {
        if (r.source_id !== issue.issueKey) set.add(r.source_id);
        if (r.target_id !== issue.issueKey) set.add(r.target_id);
      });
      return set;
    },
    staleTime: 10000,
  });

  // Search issues
  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ['link-search', search],
    queryFn: async () => {
      const q = search.trim();
      if (!q) {
        const { data } = await supabase.from('ph_issues')
          .select('issue_key, summary, issue_type, status')
          .is('deleted_at', null)
          .order('jira_updated_at', { ascending: false })
          .limit(8);
        return data ?? [];
      }
      const { data } = await supabase.from('ph_issues')
        .select('issue_key, summary, issue_type, status')
        .is('deleted_at', null)
        .or(`issue_key.ilike.%${q}%,summary.ilike.%${q}%`)
        .limit(10);
      return data ?? [];
    },
  });

  // Filter out self, already selected, and already linked
  const filtered = searchResults.filter((r: any) =>
    r.issue_key !== issue.issueKey &&
    !selected.some(s => s.key === r.issue_key) &&
    !existingLinks.has(r.issue_key)
  );

  const handleSelect = (r: any) => {
    setSelected(prev => [...prev, { key: r.issue_key, summary: r.summary, issueType: r.issue_type }]);
    setSearch('');
    inputRef.current?.focus();
  };

  const removeSelected = (key: string) => {
    setSelected(prev => prev.filter(s => s.key !== key));
  };

  const handleLink = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const item of selected) {
        const { error: insertErr } = await supabase.from('ph_issue_links').insert({
          source_id: issue.issueKey,
          target_id: item.key,
          link_type: linkType,
          created_by: user.id,
        } as any);
        if (insertErr) {
          // Skip duplicate constraint violations
          if (insertErr.code === '23505' || insertErr.message?.includes('unique_link')) continue;
          throw insertErr;
        }
      }

      onLinked();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to link work items');
    } finally {
      setSaving(false);
    }
  };

  const textP = tk.textPrimary;
  const textM = tk.textMuted;
  const border = tk.border;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 560, maxHeight: '80vh', background: tk.surfaceBg,
        borderRadius: 8, border: `1px solid ${border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LinkIcon size={16} color={textM} />
            <span style={{ fontSize: 15, fontWeight: 600, color: textP, fontFamily: "'Sora', sans-serif" }}>
              Link {issue.issueKey}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textM, padding: 4, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {/* Link type selector */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: textM, letterSpacing: '0.03em', marginBottom: 4 }}>
              Link type
            </div>
            <div ref={ltRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setLtOpen(o => !o)}
                style={{
                  height: 32, padding: '0 12px', width: '100%',
                  border: `1px solid ${tk.inputBorder}`, borderRadius: 4,
                  fontSize: 13, color: textP, background: tk.inputBg,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <span style={{ flex: 1, textAlign: 'left' }}>{linkType}</span>
                <ChevronDown size={14} color={textM} />
              </button>
              {ltOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 2px)', left: 0, width: '100%',
                  background: tk.surfaceBg, border: `1px solid ${border}`, borderRadius: 4,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 10,
                  maxHeight: 240, overflowY: 'auto',
                }}>
                  {JIRA_LINK_TYPES.map(lt => (
                    <button
                      key={lt}
                      onClick={() => { setLinkType(lt); setLtOpen(false); }}
                      style={{
                        width: '100%', height: 32, padding: '0 12px', border: 'none',
                        background: lt === linkType ? tk.dropHighlight : 'transparent',
                        cursor: 'pointer', fontSize: 13, color: textP, textAlign: 'left',
                        fontFamily: "'Inter', sans-serif",
                      }}
                      onMouseEnter={e => { if (lt !== linkType) e.currentTarget.style.background = tk.surfaceHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = lt === linkType ? tk.dropHighlight : 'transparent'; }}
                    >
                      {lt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search input with selected chips */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: textM, letterSpacing: '0.03em', marginBottom: 4 }}>
              Work item
            </div>
            <div style={{
              minHeight: 36, display: 'flex', flexWrap: 'wrap', alignItems: 'center',
              gap: 4, padding: '4px 8px',
              border: `2px solid ${tk.selectedAccent}`, borderRadius: 4, background: tk.inputBg,
              cursor: 'text', position: 'relative',
            }}
              onClick={() => inputRef.current?.focus()}
            >
              {selected.map(item => (
                <span key={item.key} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  height: 24, padding: '0 8px', background: tk.chipBg,
                  borderRadius: 3, fontSize: 12, fontWeight: 500, color: textP,
                }}>
                  <JiraIssueTypeIcon type={item.issueType} size={12} />
                  {item.key}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSelected(item.key); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: textM, padding: 0, display: 'flex' }}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={selected.length > 0 ? '' : 'Search by key or summary'}
                style={{
                  flex: 1, minWidth: 100, height: 28, border: 'none',
                  fontSize: 13, color: textP, background: 'transparent',
                  outline: 'none', fontFamily: "'Inter', sans-serif",
                }}
              />
              {isFetching && <Loader2 size={14} color={textM} className="animate-spin" />}
            </div>

            {/* Search results dropdown */}
            {(search.trim() || filtered.length > 0) && (
              <div style={{
                maxHeight: 200, overflowY: 'auto',
                border: `1px solid ${border}`, borderTop: 'none',
                borderRadius: '0 0 4px 4px', background: tk.surfaceBg,
              }}>
                {filtered.map((r: any) => (
                  <button
                    key={r.issue_key}
                    onClick={() => handleSelect(r)}
                    style={{
                      width: '100%', padding: '8px 12px', border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 13, color: textP, textAlign: 'left',
                      fontFamily: "'Inter', sans-serif",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = tk.surfaceHover; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <JiraIssueTypeIcon type={r.issue_type ?? 'Task'} size={14} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: textM, flexShrink: 0 }}>
                      {r.issue_key}
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.summary}
                    </span>
                  </button>
                ))}
                {filtered.length === 0 && search.trim() && !isFetching && (
                  <div style={{ padding: 12, fontSize: 12, color: textM }}>No matching items</div>
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '8px 12px', background: '#FFEBE6', borderRadius: 4,
              fontSize: 12, color: '#DE350B',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            onClick={onClose}
            style={{
              height: 32, padding: '0 16px', border: `1px solid ${border}`,
              borderRadius: 4, background: 'transparent', cursor: 'pointer',
              fontSize: 13, color: tk.textSecondary, fontFamily: "'Inter', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleLink}
            disabled={selected.length === 0 || saving}
            style={{
              height: 32, padding: '0 16px', border: 'none',
              borderRadius: 4, background: selected.length > 0 ? '#2563EB' : tk.chipBg,
              cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: 13, color: '#FFFFFF', fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              opacity: saving ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <LinkIcon size={14} />
            {saving ? 'Linking…' : `Link${selected.length > 1 ? ` (${selected.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
