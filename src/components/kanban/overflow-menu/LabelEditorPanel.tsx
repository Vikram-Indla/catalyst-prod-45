/**
 * LabelEditorPanel — Inline label editor for kanban overflow menu.
 * Reuses same data pattern as EditableLabels (ph_issues.labels string[]).
 * Supports search, toggle, create new, and remove.
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, Search, Plus } from 'lucide-react';
import type { KanbanThemeTokens } from '../kanban-tokens';

const LABEL_COLORS = ['#4C9AFF', '#00B8D9', '#36B37E', '#FFAB00', '#FF5630', '#6554C0', '#FF7452', '#57D9A3', '#FFC400', '#998DD9', '#79E2F2', '#FF8F73'];
function getLabelColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

interface LabelEditorPanelProps {
  issueId: string;
  issueKey: string;
  currentLabels: string[];
  tk: KanbanThemeTokens;
  onClose: () => void;
  onLabelsUpdated: (newLabels: string[]) => void;
}

export function LabelEditorPanel({ issueId, issueKey, currentLabels, tk, onClose, onLabelsUpdated }: LabelEditorPanelProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Fetch all unique labels across the project
  const { data: allLabels = [] } = useQuery({
    queryKey: ['ph-all-labels'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ph_issues')
        .select('labels').is('deleted_at', null).not('labels', 'is', null);
      if (error) throw error;
      const labelSet = new Set<string>();
      (data ?? []).forEach(row => {
        if (Array.isArray(row.labels)) {
          (row.labels as string[]).forEach(l => { if (typeof l === 'string' && l.trim()) labelSet.add(l.trim()); });
        }
      });
      return Array.from(labelSet).sort((a, b) => a.localeCompare(b));
    },
    staleTime: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: async (labels: string[]) => {
      const { error } = await supabase.from('ph_issues').update({ labels: labels as any }).eq('id', issueId);
      if (error) throw error;
      return labels;
    },
    onSuccess: (labels) => {
      onLabelsUpdated(labels);
      qc.invalidateQueries({ queryKey: ['ph-all-labels'] });
      qc.invalidateQueries({ queryKey: ['kanban-issues'] });
    },
  });

  const toggleLabel = (label: string) => {
    const next = currentLabels.includes(label)
      ? currentLabels.filter(l => l !== label)
      : [...currentLabels, label];
    updateMutation.mutate(next);
  };

  const addNewLabel = () => {
    const trimmed = search.trim();
    if (!trimmed || currentLabels.includes(trimmed)) return;
    updateMutation.mutate([...currentLabels, trimmed]);
    setSearch('');
  };

  const q = search.trim().toLowerCase();
  const filtered = q ? allLabels.filter(l => l.toLowerCase().includes(q)) : allLabels;
  const canCreate = q && !allLabels.some(l => l.toLowerCase() === q);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute', left: '100%', top: 0, zIndex: 10000,
        width: 260, maxHeight: 400, display: 'flex', flexDirection: 'column',
        background: tk.surfaceBg, border: `1px solid ${tk.border}`,
        borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
        overflow: 'hidden',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Search / create input */}
      <div style={{ padding: '8px 8px 4px', borderBottom: `1px solid ${tk.borderSubtle}` }}>
        <div style={{ position: 'relative' }}>
          <Search size={12} color={tk.textDisabled} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewLabel(); } }}
            placeholder="Search or create label"
            style={{
              width: '100%', height: 28, paddingLeft: 26, paddingRight: 8,
              border: `1px solid ${tk.inputBorder}`, borderRadius: 3,
              fontSize: 12, color: tk.textPrimary, background: tk.inputBg,
              outline: 'none', fontFamily: 'var(--ds-font-family-body)',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Label list */}
      <div style={{ overflowY: 'auto', maxHeight: 300, padding: '4px 0' }}>
        {/* Create new option */}
        {canCreate && (
          <button
            onClick={addNewLabel}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '7px 12px', border: 'none',
              background: 'transparent', cursor: 'pointer',
              fontSize: 12, color: tk.selectedAccent, fontWeight: 500,
              fontFamily: 'var(--ds-font-family-body)', textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = tk.surfaceHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Plus size={12} />
            <span>Create "{search.trim()}"</span>
          </button>
        )}

        {filtered.map(label => {
          const isAssigned = currentLabels.includes(label);
          const color = getLabelColor(label);
          return (
            <button
              key={label}
              onClick={() => toggleLabel(label)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '6px 12px', border: 'none',
                background: isAssigned ? tk.dropHighlight : 'transparent',
                cursor: 'pointer', fontSize: 12,
                color: tk.textPrimary, fontFamily: 'var(--ds-font-family-body)',
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (!isAssigned) e.currentTarget.style.background = tk.surfaceHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = isAssigned ? tk.dropHighlight : 'transparent'; }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: 2,
                background: color, flexShrink: 0,
              }} />
              <span className="flex-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              {isAssigned && <Check size={12} color={tk.selectedAccent} />}
            </button>
          );
        })}

        {filtered.length === 0 && !canCreate && (
          <div style={{ padding: '12px 12px', fontSize: 12, color: tk.textDisabled }}>No labels found</div>
        )}
      </div>

      {/* Current labels summary */}
      {currentLabels.length > 0 && (
        <div style={{ padding: '6px 8px', borderTop: `1px solid ${tk.borderSubtle}`, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {currentLabels.map(label => {
            const color = getLabelColor(label);
            return (
              <span key={label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                height: 20, padding: '0 6px', background: tk.chipBg,
                border: `1px solid ${color}40`, borderRadius: 3,
                fontSize: 10, fontWeight: 500, color: tk.textPrimary,
              }}>
                {label}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLabel(label); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: tk.textMuted,
                    padding: 0, display: 'flex', alignItems: 'center', lineHeight: 1,
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
