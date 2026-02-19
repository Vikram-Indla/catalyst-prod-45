import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CATEGORIES = ['To Do', 'In Progress', 'Done', 'Terminal'];
const COLORS = ['#2563EB', '#0D9488', '#7C3AED', '#DC2626', '#EA580C', '#D97706', '#16A34A', '#0284C7'];

interface EditStatusModalProps {
  open: boolean;
  status: { id: string; name: string; category: string; color: string } | null;
  onClose: () => void;
  onSubmit: (data: { id: string; name: string; category: string; color: string }) => void;
  loading?: boolean;
}

export function EditStatusModal({ open, status, onClose, onSubmit, loading }: EditStatusModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('To Do');
  const [color, setColor] = useState('#2563EB');

  useEffect(() => {
    if (open && status) { setName(status.name); setCategory(status.category); setColor(status.color); }
  }, [open, status]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !status) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 40, padding: '0 12px', fontSize: 13,
    color: '#0F172A', background: '#FFFFFF', border: '1px solid #E2E8F0',
    borderRadius: 6, outline: 'none', fontFamily: "'Inter', sans-serif",
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: 440, background: '#FFFFFF', borderRadius: 12, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,.1)', fontFamily: "'Inter', sans-serif" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>Edit Status</h3>
          <button onClick={onClose} className="flex items-center justify-center rounded-md hover:bg-[#F1F5F9] transition-colors" style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={16} color="#64748B" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#334155', display: 'block', marginBottom: 4 }}>Status Name <span style={{ color: '#EF4444' }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#334155', display: 'block', marginBottom: 4 }}>Category <span style={{ color: '#EF4444' }}>*</span></label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#334155', display: 'block', marginBottom: 6 }}>Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="rounded-full transition-all"
                  style={{
                    width: 28, height: 28, background: c, border: 'none', cursor: 'pointer',
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} style={{ height: 36, padding: '0 16px', fontSize: 13, fontWeight: 500, color: '#334155', border: '1px solid #E2E8F0', borderRadius: 6, background: '#FFFFFF', cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={() => name.trim() && onSubmit({ id: status.id, name: name.trim(), category, color })}
            disabled={!name.trim() || loading}
            className="hover:opacity-90 transition-opacity disabled:opacity-40"
            style={{ height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600, color: '#FFFFFF', background: '#2563EB', border: 'none', borderRadius: 6, cursor: name.trim() && !loading ? 'pointer' : 'default' }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
