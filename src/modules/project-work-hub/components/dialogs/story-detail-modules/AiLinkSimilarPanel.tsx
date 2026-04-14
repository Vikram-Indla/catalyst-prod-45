/**
 * AiLinkSimilarPanel — "Link similar work items" AI suggestion panel
 * Jira-parity collapsible panel with checkbox suggestions, link-type dropdown,
 * feedback controls, and bulk linking.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ThumbsUp, ThumbsDown, Info, Loader2, RefreshCw } from 'lucide-react';
import { IssueIcon } from './shared-components';
import { LINK_TYPE_OPTIONS } from './constants';

interface AiSuggestion {
  issue_key: string;
  summary: string;
  issue_type: string | null;
  status: string | null;
  status_category: string | null;
  score?: number;
  reason?: string;
}

interface AiLinkSimilarPanelProps {
  issueKey: string;
  existingLinkedKeys: string[];
  onLinked: () => void;
}

/* ── Link-type dropdown (bottom-right, Jira parity) ── */
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

  // Map internal value to display label
  const displayLabel = `Link as ${value}`;

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
        {displayLabel}
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
      onClick={() => onChange(!checked)}
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
  const [expanded, setExpanded] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [linkType, setLinkType] = useState('relates to');
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [linkedThisSession, setLinkedThisSession] = useState<Set<string>>(new Set());

  // Fetch AI suggestions — uses text similarity via pg search
  const { data: suggestions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['aiSimilarItems', issueKey],
    queryFn: async () => {
      // Get current issue summary for similarity matching
      const { data: current } = await supabase.from('ph_issues')
        .select('summary, issue_type, project_key, labels')
        .eq('issue_key', issueKey)
        .is('jira_removed_at', null)
        .single();

      if (!current?.summary) return [];

      // Extract key terms from summary for search
      const terms = current.summary
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 5);

      if (!terms.length) return [];

      // Search for similar issues using ilike on key terms
      const orClauses = terms.map((t: string) => `summary.ilike.%${t}%`).join(',');

      const { data: candidates } = await supabase.from('ph_issues')
        .select('issue_key, summary, issue_type, status, status_category')
        .or(orClauses)
        .is('jira_removed_at', null)
        .neq('issue_key', issueKey)
        .limit(20);

      return (candidates ?? []) as AiSuggestion[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: expanded,
  });

  // Filter out already-linked, dismissed, and linked-this-session
  const filteredSuggestions = useMemo(() => {
    const excludeSet = new Set([
      ...existingLinkedKeys,
      ...dismissedKeys,
      ...linkedThisSession,
    ]);
    return suggestions.filter(s => !excludeSet.has(s.issue_key));
  }, [suggestions, existingLinkedKeys, dismissedKeys, linkedThisSession]);

  const allSelected = filteredSuggestions.length > 0 && filteredSuggestions.every(s => selectedKeys.has(s.issue_key));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredSuggestions.map(s => s.issue_key)));
    }
  };

  const toggleOne = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Bulk link mutation
  const linkMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const keys = Array.from(selectedKeys);
      const results: { key: string; ok: boolean; error?: string }[] = [];
      for (const targetKey of keys) {
        const { error } = await supabase.from('ph_issue_links').insert({
          source_id: issueKey,
          target_id: targetKey,
          link_type: linkType,
          created_by: user.id,
        } as any);
        results.push({ key: targetKey, ok: !error, error: error?.message });
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
      onLinked();
      queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueKey] });
    },
  });

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px', border: '1px solid #DFE1E6', borderRadius: 8,
          cursor: 'pointer', background: '#FAFBFC', marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#6B778C" strokeWidth="1.5" fill="none"/></svg>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#172B4D' }}>Link similar work items</span>
        </div>
        <ChevronDown size={16} color="#6B778C" />
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #DFE1E6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(false)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px', cursor: 'pointer', background: '#FAFBFC',
          borderBottom: '1px solid #F4F5F7',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#6B778C" strokeWidth="1.5" fill="none"/></svg>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#172B4D' }}>Link similar work items</span>
        </div>
        <ChevronDown size={16} color="#6B778C" style={{ transform: 'rotate(180deg)' }} />
      </div>

      {/* Body */}
      <div style={{ padding: '0 12px 12px' }}>
        {/* Loading */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Loader2 size={20} className="animate-spin" color="#6B778C" />
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
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

        {/* Empty */}
        {!isLoading && !isError && filteredSuggestions.length === 0 && (
          <div style={{ padding: '12px 0', fontSize: 13, color: '#6B778C', fontStyle: 'italic' }}>
            No similar work items found.
          </div>
        )}

        {/* Suggestions list */}
        {!isLoading && filteredSuggestions.length > 0 && (
          <>
            {/* Select all / Deselect all */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 0 6px', borderBottom: '1px solid #F4F5F7',
              }}
            >
              <Checkbox checked={allSelected} onChange={toggleAll} />
              <span style={{ fontSize: 14, fontWeight: 500, color: '#172B4D' }}>
                {allSelected ? 'Deselect all' : 'Select all'}
              </span>
            </div>

            {/* Suggestion rows */}
            {filteredSuggestions.map(s => (
              <div
                key={s.issue_key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 0', borderBottom: '1px solid #F4F5F7',
                  cursor: 'pointer',
                }}
                onClick={() => toggleOne(s.issue_key)}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Checkbox checked={selectedKeys.has(s.issue_key)} onChange={() => toggleOne(s.issue_key)} />
                <IssueIcon type={s.issue_type || 'task'} size={16} />
                <span style={{ fontSize: 13, color: '#172B4D' }}>
                  <span style={{ fontWeight: 600 }}>{s.issue_key}:</span>{' '}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.summary}
                  </span>
                </span>
              </div>
            ))}
          </>
        )}

        {/* Footer: disclaimer + feedback + link action */}
        {!isLoading && filteredSuggestions.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 10, marginTop: 4,
          }}>
            {/* Left: disclaimer + feedback */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Info size={14} color="#6B778C" />
                <span style={{ fontSize: 12, color: '#6B778C' }}>Uses AI. Verify results.</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFeedback('up'); }}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer', padding: 2,
                  color: feedback === 'up' ? '#0052CC' : '#6B778C',
                }}
                title="Helpful"
              >
                <ThumbsUp size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setFeedback('down'); }}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer', padding: 2,
                  color: feedback === 'down' ? '#FF5630' : '#6B778C',
                }}
                title="Not helpful"
              >
                <ThumbsDown size={14} />
              </button>
            </div>

            {/* Right: link action */}
            <LinkAsDropdown value={linkType} onChange={setLinkType} />
          </div>
        )}

        {/* Link button (when items selected) */}
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
              {linkMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                `Link ${selectedKeys.size} item${selectedKeys.size > 1 ? 's' : ''}`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
