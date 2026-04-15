/**
 * ParentPickerPanel — Inline parent picker for kanban overflow menu.
 * Reuses the same data pattern as AddParentPicker (ph_issues epics query).
 * Prevents self-parenting and shows recent + searchable full list.
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, X } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { KanbanThemeTokens } from '../kanban-tokens';

interface ParentPickerPanelProps {
  issueId: string;
  issueKey: string;
  issueType: string;
  currentParentKey: string | null;
  projectKey: string;
  tk: KanbanThemeTokens;
  onClose: () => void;
  onParentChange: (newParentKey: string | null) => void;
}

export function ParentPickerPanel({
  issueId, issueKey, issueType, currentParentKey, projectKey, tk, onClose, onParentChange,
}: ParentPickerPanelProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Determine valid parent types based on issue type
  // Stories → Epics, Epics → none (top-level), Subtasks → Stories/Epics
  const validParentTypes = issueType === 'Story'
    ? ['Epic', 'epic', 'Feature', 'feature']
    : issueType === 'Epic'
      ? [] // Epics don't have parents in standard Jira hierarchy
      : ['Epic', 'epic', 'Story', 'story', 'Feature', 'feature'];

  const { data: candidates = [] } = useQuery({
    queryKey: ['kanban-parent-candidates', projectKey, validParentTypes.join(',')],
    enabled: validParentTypes.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status_category')
        .eq('project_key', projectKey)
        .in('issue_type', validParentTypes)
        .is('deleted_at', null)
        .order('jira_updated_at', { ascending: false })
        .limit(100);
      return (data || []).filter((e: any) => e.issue_key !== issueKey);
    },
    staleTime: 60000,
  });

  const q = search.trim().toLowerCase();
  const filtered = q
    ? candidates.filter((e: any) => e.issue_key?.toLowerCase().includes(q) || e.summary?.toLowerCase().includes(q))
    : candidates;

  if (validParentTypes.length === 0) {
    return (
      <div
        ref={panelRef}
        style={{
          position: 'absolute', left: '100%', top: 0, zIndex: 10000,
          width: 260, background: tk.surfaceBg, border: `1px solid ${tk.border}`,
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
          padding: '16px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 13, color: tk.textMuted }}>
          Epics are top-level items and cannot have parents.
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute', left: '100%', top: 0, zIndex: 10000,
        width: 320, maxHeight: 420, display: 'flex', flexDirection: 'column',
        background: tk.surfaceBg, border: `1px solid ${tk.border}`,
        borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
        overflow: 'hidden',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        padding: '10px 12px 6px', fontSize: 12, fontWeight: 700,
        color: tk.textMuted, textTransform: 'uppercase', letterSpacing: '0.03em',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>Change parent</span>
        {currentParentKey && (
          <span style={{ fontSize: 10, fontWeight: 500, color: tk.textSecondary, textTransform: 'none' }}>
            Current: {currentParentKey}
          </span>
        )}
      </div>

      {/* Search */}
      <div style={{ padding: '4px 8px 6px', borderBottom: `1px solid ${tk.borderSubtle}` }}>
        <div style={{ position: 'relative' }}>
          <Search size={12} color={tk.textDisabled} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search epics"
            style={{
              width: '100%', height: 28, paddingLeft: 26, paddingRight: 8,
              border: `1px solid ${tk.inputBorder}`, borderRadius: 3,
              fontSize: 12, color: tk.textPrimary, background: tk.inputBg,
              outline: 'none', fontFamily: "'Inter', sans-serif",
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Remove parent */}
      {currentParentKey && (
        <button
          onClick={() => { onParentChange(null); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '8px 12px', border: 'none',
            background: 'transparent', cursor: 'pointer',
            fontSize: 12, color: '#DE350B', fontWeight: 500,
            fontFamily: "'Inter', sans-serif", textAlign: 'left',
            borderBottom: `1px solid ${tk.borderSubtle}`,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = tk.surfaceHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <X size={12} />
          Remove parent
        </button>
      )}

      {/* Epic list */}
      <div style={{ overflowY: 'auto', maxHeight: 300, padding: '4px 0' }}>
        {filtered.map((epic: any) => {
          const isCurrent = epic.issue_key === currentParentKey;
          return (
            <button
              key={epic.id}
              onClick={() => {
                if (!isCurrent) onParentChange(epic.issue_key);
                onClose();
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 12px', border: 'none',
                background: isCurrent ? tk.dropHighlight : 'transparent',
                cursor: isCurrent ? 'default' : 'pointer',
                fontSize: 12, color: tk.textPrimary,
                fontFamily: "'Inter', sans-serif", textAlign: 'left',
              }}
              onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = tk.surfaceHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? tk.dropHighlight : 'transparent'; }}
            >
              <JiraIssueTypeIcon type={epic.issue_type ?? 'epic'} size={14} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: tk.textMuted, flexShrink: 0,
              }}>{epic.issue_key}</span>
              <span style={{
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{epic.summary}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: '12px', fontSize: 12, color: tk.textDisabled }}>No epics found</div>
        )}
      </div>
    </div>
  );
}
