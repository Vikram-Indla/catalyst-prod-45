import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Tag } from 'lucide-react';

const COLORS = ['var(--ds-text-brand, #2563EB)', '#0D9488', '#7C3AED', 'var(--ds-text-danger, #DC2626)', '#EA580C', 'var(--ds-text-warning, #D97706)', 'var(--ds-text-success, #16A34A)', '#0284C7'];
const MAX_LABELS = 20;

interface LabelsTabProps {
  projectId: string;
}

export function LabelsTab({ projectId }: LabelsTabProps) {
  const queryClient = useQueryClient();
  const queryKey = ['ph-labels', projectId];
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('var(--ds-text-brand, #2563EB)');

  const { data: labels = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_labels')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!projectId,
  });

  const atMax = labels.length >= MAX_LABELS;

  const handleAdd = async () => {
    if (!newName.trim() || atMax) return;
    try {
      const { error } = await supabase
        .from('ph_labels')
        .insert({ project_id: projectId, name: newName.trim(), color: newColor });
      if (error) throw new Error(error.message);
      toast.success('Label added');
      setNewName('');
      queryClient.invalidateQueries({ queryKey });
    } catch (err: any) {
      toast.error(err.message || 'Failed to add label');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('ph_labels').delete().eq('id', id);
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete label');
    }
  };

  const inputStyle: React.CSSProperties = {
    height: 50, padding: '8px 12px', fontSize: 13,
    color: 'var(--fg-1)', border: '1px solid var(--divider)',
    borderRadius: 6, outline: 'none', fontFamily: 'var(--cp-font-body)',
    flex: 1, minWidth: 0,
    transition: 'border-color 150ms, box-shadow 150ms',
  };

  return (
    <div className="ph-card">
      <h3 className="ph-card-title">Labels ({labels.length})</h3>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="ph-skeleton rounded" style={{ height: 32, width: '30%' }} />)}
        </div>
      ) : labels.length === 0 ? (
        <div className="flex flex-col items-center py-8" style={{ color: 'var(--divider)' }}>
          <Tag size={32} strokeWidth={1.25} />
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg-1)', marginTop: 12, fontFamily: 'var(--cp-font-heading)' }}>No labels yet</p>
          <p style={{ fontSize: 14, color: 'var(--fg-3)', marginTop: 4, textAlign: 'center', maxWidth: 320 }}>
            Labels help categorize and filter work items.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {labels.map((l: any) => (
            <div
              key={l.id}
              className="inline-flex items-center gap-2 rounded-full transition-colors hover:opacity-80"
              style={{
                padding: '4px 10px 4px 8px',
                background: `${l.color}12`,
                border: `1px solid ${l.color}30`,
              }}
            >
              <div className="flex-shrink-0 rounded-full" style={{ width: 10, height: 10, background: l.color }} />
              <span style={{ fontSize: 13, color: 'var(--fg-1)', fontWeight: 500 }}>{l.name}</span>
              <button
                onClick={() => handleDelete(l.id)}
                className="flex items-center justify-center rounded-full transition-colors hover:bg-[#FEE2E2]"
                style={{ width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer', marginLeft: 2 }}
              >
                <X size={12} color="var(--fg-4)" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add label */}
      <div className="pt-4" style={{ borderTop: labels.length > 0 ? '1px solid var(--divider)' : 'none' }}>
        <div className="flex items-center gap-2 mb-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Label name..."
            disabled={atMax}
            className="bg-[var(--cp-float)] dark:bg-[var(--ds-surface-raised, #1A1A1A)]"
            style={{ ...inputStyle, opacity: atMax ? 0.5 : 1 }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--cp-blue)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || atMax}
            className="flex-shrink-0 transition-all disabled:opacity-40"
            style={{
              height: 50, padding: '0 14px', fontSize: 13, fontWeight: 500,
              color: 'var(--fg-2)', border: '1px solid var(--divider)', borderRadius: 6,
              background: 'transparent', cursor: !newName.trim() || atMax ? 'default' : 'pointer',
            }}
            onMouseEnter={e => { if (newName.trim() && !atMax) e.currentTarget.style.background = 'var(--bg-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            Add
          </button>
        </div>

        <div className="flex gap-2 mb-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className="rounded-full transition-all"
              style={{
                width: 24, height: 24, background: c, border: 'none', cursor: 'pointer',
                outline: newColor === c ? `2px solid ${c}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>

        {atMax && (
          <p style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 8 }}>Maximum 20 labels reached.</p>
        )}
      </div>
    </div>
  );
}
