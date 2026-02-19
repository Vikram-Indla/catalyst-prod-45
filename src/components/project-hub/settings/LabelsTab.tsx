import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Tag } from 'lucide-react';

const COLORS = ['#2563EB', '#0D9488', '#7C3AED', '#DC2626', '#EA580C', '#D97706', '#16A34A', '#0284C7'];
const MAX_LABELS = 20;

interface LabelsTabProps {
  projectId: string;
}

export function LabelsTab({ projectId }: LabelsTabProps) {
  const queryClient = useQueryClient();
  const queryKey = ['ph-labels', projectId];
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#2563EB');

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
        Labels ({labels.length})
      </h3>

      {isLoading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>Loading...</div>
      ) : labels.length === 0 ? (
        <div className="flex flex-col items-center py-6" style={{ color: '#94A3B8' }}>
          <Tag size={28} strokeWidth={1.5} />
          <p style={{ fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            No labels yet. Add your first label to organize work items.
          </p>
        </div>
      ) : (
        <div className="space-y-0.5 mb-4">
          {labels.map((l: any) => (
            <div key={l.id} className="flex items-center gap-3 px-3 rounded-lg hover:bg-[#F8FAFC] transition-colors" style={{ height: 40 }}>
              <div className="flex-shrink-0 rounded-full" style={{ width: 12, height: 12, background: l.color }} />
              <span className="flex-1 truncate" style={{ fontSize: 14, color: '#0F172A' }}>{l.name}</span>
              <button
                onClick={() => handleDelete(l.id)}
                className="flex items-center justify-center rounded transition-colors hover:bg-[#FEE2E2] group"
                style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={14} color="#94A3B8" className="group-hover:!text-[#DC2626]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add label */}
      <div className="pt-4" style={{ borderTop: labels.length > 0 ? '1px solid #E2E8F0' : 'none' }}>
        <div className="flex items-center gap-2 mb-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Label name..."
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
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>Maximum 20 labels reached.</p>
        )}
      </div>
    </div>
  );
}
