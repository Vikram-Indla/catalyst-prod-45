import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CATEGORIES = ['To Do', 'In Progress', 'Done', 'Terminal'];
const COLORS = ['#2563EB', '#0D9488', '#7C3AED', '#DC2626', '#EA580C', '#D97706', '#16A34A', '#0284C7'];

interface AddStatusModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; category: string; color: string }) => void;
  loading?: boolean;
}

export function AddStatusModal({ open, onClose, onSubmit, loading }: AddStatusModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('To Do');
  const [color, setColor] = useState('#2563EB');

  useEffect(() => {
    if (open) { setName(''); setCategory('To Do'); setColor('#2563EB'); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-[#1A1A1A]" style={{ width: 440, borderRadius: 12, padding: 24, fontFamily: "'Inter', sans-serif" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[var(--fg-1)] dark:text-[#EDEDED]" style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>Add Status</h3>
          <button onClick={onClose} className="flex items-center justify-center rounded-md hover:bg-[var(--cp-bd-zone)] dark:hover:bg-[#1F1F1F] transition-colors" style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={16} className="text-[#64748B] dark:text-[#878787]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[var(--fg-2)] dark:text-[#A1A1A1]" style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Status Name <span style={{ color: 'var(--sem-danger)' }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. In Review"
              className="w-full bg-white dark:bg-transparent border border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] text-[#0F172A] dark:text-[#EDEDED] placeholder:text-[#94A3B8] dark:placeholder:text-[#7D7D7D]"
              style={{ height: 40, padding: '8px 12px', fontSize: 13, borderRadius: 6, outline: 'none', fontFamily: "'Inter', sans-serif" }}
            />
          </div>

          <div>
            <label className="text-[var(--fg-2)] dark:text-[#A1A1A1]" style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Category <span style={{ color: 'var(--sem-danger)' }}>*</span></label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-white dark:bg-transparent border border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] text-[#0F172A] dark:text-[#EDEDED]"
              style={{ height: 40, padding: '8px 12px', fontSize: 13, borderRadius: 6, outline: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[var(--fg-2)] dark:text-[#A1A1A1]" style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="rounded-full transition-all"
                  style={{
                    width: 28, height: 28, background: c, border: 'none', cursor: 'pointer',
                    outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose}
            className="bg-white dark:bg-transparent border border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] text-[#334155] dark:text-[#A1A1A1]"
            style={{ height: 50, padding: '0 16px', fontSize: 13, fontWeight: 500, borderRadius: 6, cursor: 'pointer' }}
          >Cancel</button>
          <button
            onClick={() => name.trim() && onSubmit({ name: name.trim(), category, color })}
            disabled={!name.trim() || loading}
            className="hover:opacity-90 transition-opacity disabled:opacity-40 bg-[var(--cp-blue)]"
            style={{ height: 50, padding: '0 16px', fontSize: 13, fontWeight: 600, color: '#FFFFFF', border: 'none', borderRadius: 6, cursor: name.trim() && !loading ? 'pointer' : 'default' }}
          >
            {loading ? 'Adding...' : 'Add Status'}
          </button>
        </div>
      </div>
    </div>
  );
}