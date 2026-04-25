import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Puzzle } from 'lucide-react';

const MAX_COMPONENTS = 30;

interface ComponentsTabProps {
  projectId: string;
}

export function ComponentsTab({ projectId }: ComponentsTabProps) {
  const queryClient = useQueryClient();
  const queryKey = ['ph-components', projectId];
  const [newName, setNewName] = useState('');

  const { data: components = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_components')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!projectId,
  });

  const atMax = components.length >= MAX_COMPONENTS;

  const handleAdd = async () => {
    if (!newName.trim() || atMax) return;
    try {
      const { error } = await supabase
        .from('ph_components')
        .insert({ project_id: projectId, name: newName.trim() });
      if (error) throw new Error(error.message);
      toast.success('Component added');
      setNewName('');
      queryClient.invalidateQueries({ queryKey });
    } catch (err: any) {
      toast.error(err.message || 'Failed to add component');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('ph_components').delete().eq('id', id);
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete component');
    }
  };

  const inputStyle: React.CSSProperties = {
    height: 50, padding: '8px 12px', fontSize: 13,
    color: 'var(--fg-1)', border: '1px solid var(--divider)',
    borderRadius: 6, outline: 'none', fontFamily: 'var(--ds-font-family-body)',
    flex: 1, minWidth: 0,
    transition: 'border-color 150ms, box-shadow 150ms',
  };

  return (
    <div className="ph-card">
      <h3 className="ph-card-title">Components ({components.length})</h3>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="ph-skeleton rounded" style={{ height: 32, width: '25%' }} />)}
        </div>
      ) : components.length === 0 ? (
        <div className="flex flex-col items-center py-8" style={{ color: 'var(--divider)' }}>
          <Puzzle size={32} strokeWidth={1.25} />
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg-1)', marginTop: 12, fontFamily: 'var(--ds-font-family-heading)' }}>No components yet</p>
          <p style={{ fontSize: 14, color: 'var(--fg-3)', marginTop: 4, textAlign: 'center', maxWidth: 320 }}>
            Components represent areas like Backend, Frontend, API.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {components.map((c: any) => (
            <div
              key={c.id}
              className="inline-flex items-center gap-2 rounded-full transition-colors hover:opacity-80 bg-[var(--cp-bd-zone)] dark:bg-[#1A1A1A]"
              style={{
                padding: '4px 10px 4px 12px',
                border: '1px solid var(--divider)',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--fg-1)', fontWeight: 500 }}>{c.name}</span>
              <button
                onClick={() => handleDelete(c.id)}
                className="flex items-center justify-center rounded-full transition-colors hover:bg-[#FEE2E2]"
                style={{ width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={12} color="var(--fg-4)" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add component */}
      <div className="flex items-center gap-2 pt-4" style={{ borderTop: components.length > 0 ? '1px solid var(--divider)' : 'none' }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Component name..."
          disabled={atMax}
          className="bg-[var(--cp-float)] dark:bg-[#1A1A1A]"
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

      {atMax && (
        <p style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 8 }}>Maximum 30 components reached.</p>
      )}
    </div>
  );
}
