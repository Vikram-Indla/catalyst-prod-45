import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Box } from 'lucide-react';

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
    height: 36, padding: '0 12px', fontSize: 13,
    color: '#0F172A', background: '#FFFFFF', border: '1px solid #E2E8F0',
    borderRadius: 6, outline: 'none', fontFamily: "'Inter', sans-serif",
    flex: 1, minWidth: 0,
  };

  return (
    <div
      className="rounded-xl"
      style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '20px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif", marginBottom: 16 }}>
        Components ({components.length})
      </h3>

      {isLoading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>Loading...</div>
      ) : components.length === 0 ? (
        <div className="flex flex-col items-center py-6" style={{ color: '#94A3B8' }}>
          <Box size={28} strokeWidth={1.5} />
          <p style={{ fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            No components yet. Add components like Backend, Frontend, API.
          </p>
        </div>
      ) : (
        <div className="space-y-0.5 mb-4">
          {components.map((c: any) => (
            <div key={c.id} className="flex items-center gap-3 px-3 rounded-lg hover:bg-[#F8FAFC] transition-colors" style={{ height: 40 }}>
              <span className="flex-1 truncate" style={{ fontSize: 14, color: '#0F172A' }}>{c.name}</span>
              <button
                onClick={() => handleDelete(c.id)}
                className="flex items-center justify-center rounded transition-colors hover:bg-[#FEE2E2] group"
                style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={14} color="#94A3B8" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add component */}
      <div className="flex items-center gap-2 pt-4" style={{ borderTop: components.length > 0 ? '1px solid #E2E8F0' : 'none' }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Component name..."
          disabled={atMax}
          style={{ ...inputStyle, opacity: atMax ? 0.5 : 1 }}
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim() || atMax}
          className="flex-shrink-0 hover:bg-[#F8FAFC] transition-colors disabled:opacity-40"
          style={{
            height: 36, padding: '0 14px', fontSize: 13, fontWeight: 500,
            color: '#334155', border: '1px solid #E2E8F0', borderRadius: 6,
            background: 'transparent', cursor: !newName.trim() || atMax ? 'default' : 'pointer',
          }}
        >
          Add
        </button>
      </div>

      {atMax && (
        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>Maximum 30 components reached.</p>
      )}
    </div>
  );
}
