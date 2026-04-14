/**
 * AiLinkSimilarPanel — "Link similar work items" AI suggestion panel
 * Collapsed by default: shows "Link similar work items" + "Show N result" button.
 * Expands to show checkbox list, select/deselect all, feedback, link-type dropdown.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { ChevronDown, ThumbsUp, ThumbsDown, Info, Loader2, RefreshCw } from 'lucide-react';
import { IssueIcon } from './shared-components';
import { LINK_TYPE_OPTIONS } from './constants';

interface AiSuggestion {
  issue_key: string;
  summary: string;
  issue_type: string | null;
  status: string | null;
  status_category: string | null;
}

interface AiLinkSimilarPanelProps {
  issueKey: string;
  existingLinkedKeys: string[];
  onLinked: () => void;
}

/* ── Link-type dropdown (bottom-right, opens upward) ── */
function LinkAsDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          height: 32, padding: '0 10px 0 12px',
          border: '1px solid #DFE1E6', borderRadius: 3,
          background: '#fff', cursor: 'pointer', fontSize: 13,
          fontFamily: 'inherit', color: '#172B4D', whiteSpace: 'nowrap',
        }}
      >
        Link as {value}
        <ChevronDown size={14} color={open ? '#0052CC' : '#6B778C'} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 4px)', right: 0,
          minWidth: 200, background: '#fff', border: '1px solid #DFE1E6',
          borderRadius: 4, boxShadow: '0 4px 8px rgba(9,30,66,.25)',
          zIndex: 70, maxHeight: 320, overflowY: 'auto',
        }}>
          {LINK_TYPE_OPTIONS.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', height: 36, padding: '0 12px',
                cursor: 'pointer', fontSize: 14, color: '#172B4D',
                background: opt === value ? '#DEEBFF' : 'transparent',
              }}
              onMouseEnter={e => { if (opt !== value) (e.currentTarget).style.background = '#F4F5F7'; }}
              onMouseLeave={e => { if (opt !== value) (e.currentTarget).style.background = 'transparent'; }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Checkbox ── */
function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      style={{
        width: 18, height: 18, borderRadius: 3, border: checked ? 'none' : '2px solid #C1C7D0',
        background: checked ? '#0052CC' : '#fff', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0,
      }}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

export function AiLinkSimilarPanel({ issueKey, existingLinkedKeys, onLinked }: AiLinkSimilarPanelProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [linkType, setLinkType] = useState('related');
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [linkedThisSession, setLinkedThisSession] = useState<Set<string>>(new Set());

  const { data: suggestions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['aiSimilarItems', issueKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-similar-items', {
        body: { issueKey, existingLinkedKeys },
      });

      if (error) throw error;

      // Handle rate-limit / payment errors
      if (data?.error) throw new Error(data.error);

      return (data?.suggestions ?? []) as AiSuggestion[];
    },
    staleTime: 10 * 60 * 1000, // 10 min — AI results are expensive
    retry: 1,
  });

  const filteredSuggestions = useMemo(() => {
    const excludeSet = new Set([...existingLinkedKeys, ...dismissedKeys, ...linkedThisSession]);
    return suggestions.filter(s => !excludeSet.has(s.issue_key));
  }, [suggestions, existingLinkedKeys, dismissedKeys, linkedThisSession]);

  const count = filteredSuggestions.length;
  const allSelected = count > 0 && filteredSuggestions.every(s => selectedKeys.has(s.issue_key));

  const toggleAll = () => {
    if (allSelected) setSelectedKeys(new Set());
    else setSelectedKeys(new Set(filteredSuggestions.map(s => s.issue_key)));
  };

  const toggleOne = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const linkMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const results: { key: string; ok: boolean }[] = [];
      for (const targetKey of Array.from(selectedKeys)) {
        const { error } = await supabase.from('ph_issue_links').insert({
          source_id: issueKey,
          target_id: targetKey,
          link_type: linkType,
          created_by: user.id,
        } as any);
        results.push({ key: targetKey, ok: !error });
      }
      return results;
    },
    onSuccess: (results) => {
      const successKeys = results.filter(r => r.ok).map(r => r.key);
      setLinkedThisSession(prev => new Set([...prev, ...successKeys]));
      setSelectedKeys(prev => {
        const next = new Set(prev);
        successKeys.forEach(k => next.delete(k));
        return next;
      });
      const failedKeys = results.filter(r => !r.ok).map(r => r.key);
      if (successKeys.length) toast.success(`Linked ${successKeys.length} similar item${successKeys.length > 1 ? 's' : ''}`);
      if (failedKeys.length) toast.error(`Failed to link: ${failedKeys.join(', ')}`);
      onLinked();
      queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueKey] });
    },
  });

  /* ── COLLAPSED STATE ── */
  if (!expanded) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', border: '1px solid #DFE1E6', borderRadius: 8,
        background: '#FAFBFC', marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#6B778C" strokeWidth="1.5" fill="none"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#172B4D' }}>Link similar work items</span>
        </div>
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" color="#6B778C" />
        ) : count > 0 ? (
          <button
            onClick={() => setExpanded(true)}
            style={{
              height: 28, padding: '0 12px', border: '1px solid #DFE1E6', borderRadius: 3,
              background: '#fff', cursor: 'pointer', fontSize: 13, color: '#172B4D',
              fontFamily: 'inherit', fontWeight: 500, whiteSpace: 'nowrap',
            }}
          >
            Show {count} result{count !== 1 ? 's' : ''}
          </button>
        ) : (
          <span style={{ fontSize: 12, color: '#6B778C', fontStyle: 'italic' }}>No results found.</span>
        )}
      </div>
    );
  }

  /* ── EXPANDED STATE ── */
  return (
    <div style={{ border: '1px solid #DFE1E6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      {/* Header — click to collapse */}
      <div
        onClick={() => setExpanded(false)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px', cursor: 'pointer', background: '#FAFBFC',
          borderBottom: '1px solid #F4F5F7',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#6B778C" strokeWidth="1.5" fill="none"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#172B4D' }}>Link similar work items</span>
        </div>
        <ChevronDown size={16} color="#6B778C" style={{ transform: 'rotate(180deg)' }} />
      </div>

      {/* Content */}
      <div style={{ padding: '0 12px 12px' }}>
        {/* Error */}
        {isError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
            <span style={{ fontSize: 13, color: '#FF5630' }}>Failed to load suggestions</span>
            <button onClick={() => refetch()} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              border: '1px solid #DFE1E6', borderRadius: 3, background: '#fff',
              padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: '#172B4D',
            }}>
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Empty after filter */}
        {!isError && count === 0 && (
          <div style={{ padding: '12px 0', fontSize: 13, color: '#6B778C', fontStyle: 'italic' }}>
            No similar work items found.
          </div>
        )}

        {/* Suggestions */}
        {count > 0 && (
          <>
            {/* Select all / Deselect all */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 0 6px', borderBottom: '1px solid #F4F5F7',
            }}>
              <Checkbox checked={allSelected} onChange={toggleAll} />
              <span style={{ fontSize: 14, fontWeight: 500, color: '#172B4D' }}>
                {allSelected ? 'Deselect all' : 'Select all'}
              </span>
            </div>

            {/* Rows */}
            {filteredSuggestions.map(s => (
              <div
                key={s.issue_key}
                onClick={() => toggleOne(s.issue_key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 0', borderBottom: '1px solid #F4F5F7',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Checkbox checked={selectedKeys.has(s.issue_key)} onChange={() => toggleOne(s.issue_key)} />
                <IssueIcon type={s.issue_type || 'task'} size={16} />
                <span style={{ fontSize: 13, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 600 }}>{s.issue_key}:</span> {s.summary}
                </span>
              </div>
            ))}

            {/* Footer: disclaimer + feedback | link-type dropdown */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingTop: 10, marginTop: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Info size={14} color="#6B778C" />
                  <span style={{ fontSize: 12, color: '#6B778C' }}>Uses AI. Verify results.</span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setFeedback('up'); }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: feedback === 'up' ? '#0052CC' : '#6B778C' }}
                  title="Helpful"
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setFeedback('down'); }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: feedback === 'down' ? '#FF5630' : '#6B778C' }}
                  title="Not helpful"
                >
                  <ThumbsDown size={14} />
                </button>
              </div>
              <LinkAsDropdown value={linkType} onChange={setLinkType} />
            </div>

            {/* Link button when items selected */}
            {selectedKeys.size > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                <button
                  onClick={() => linkMutation.mutate()}
                  disabled={linkMutation.isPending}
                  style={{
                    height: 32, padding: '0 16px', border: 'none', borderRadius: 3,
                    background: '#0052CC', color: '#fff', fontSize: 14, fontWeight: 500,
                    cursor: linkMutation.isPending ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: linkMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {linkMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : `Link ${selectedKeys.size} item${selectedKeys.size > 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
