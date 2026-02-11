/**
 * CreateTagModal — Create and edit tags with color picker
 */
import { useState, useEffect } from 'react';
import { X, Tags, Palette, Hash, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  category: string | null;
}

interface CreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingTag?: Tag | null;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981',
  '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#D946EF', '#EC4899', '#F43F5E', '#78716C', '#64748B', '#0F172A',
];

const CATEGORY_SUGGESTIONS = [
  'Test Type', 'Priority', 'Automation', 'Status', 'Module', 'Sprint', 'Feature', 'Custom'
];

export function CreateTagModal({ isOpen, onClose, onSaved, editingTag }: CreateTagModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (editingTag) {
        setName(editingTag.name);
        setColor(editingTag.color);
        setCategory(editingTag.category || '');
        setDescription(editingTag.description || '');
      } else {
        setName(''); setColor('#6366F1'); setCategory(''); setDescription('');
      }
      setErrors({});
    }
  }, [isOpen, editingTag]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (name.length > 50) newErrors.name = 'Name must be less than 50 characters';
    if (!color.match(/^#[0-9A-Fa-f]{6}$/)) newErrors.color = 'Invalid color format';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      if (editingTag) {
        const { error } = await (supabase as any).from('th_tags').update({ name: name.trim(), color, category: category.trim() || null, description: description.trim() || null }).eq('id', editingTag.id);
        if (error) throw error;
        catalystToast.success('Tag updated');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await (supabase as any).from('th_tags').insert({ name: name.trim(), color, category: category.trim() || null, description: description.trim() || null, created_by: user?.id });
        if (error) {
          if (error.code === '23505') { setErrors({ name: 'A tag with this name already exists' }); return; }
          throw error;
        }
        catalystToast.success('Tag created');
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Save tag error:', err);
      catalystToast.error('Failed to save tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 450, backgroundColor: '#FFFFFF', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tags size={22} style={{ color: '#FFFFFF' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>{editingTag ? 'Edit Tag' : 'Create Tag'}</h2>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {/* Preview */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, marginBottom: 24, backgroundColor: '#F8FAFC', borderRadius: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', backgroundColor: '#FFFFFF', borderRadius: 8, border: `2px solid ${color}`, boxShadow: `0 2px 8px ${color}30` }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{name || 'Tag Preview'}</span>
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
              <Hash size={14} /> Name <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Smoke Test, High Priority" maxLength={50}
              style={{ width: '100%', height: 44, padding: '0 14px', border: `1.5px solid ${errors.name ? '#DC2626' : '#E2E8F0'}`, borderRadius: 10, fontSize: 14 }} />
            {errors.name && <p style={{ fontSize: 12, color: '#DC2626', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> {errors.name}</p>}
          </div>

          {/* Color */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
              <Palette size={14} /> Color
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: c, border: color === c ? '3px solid #0F172A' : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.1s' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 44, height: 44, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
              <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="#6366F1"
                style={{ flex: 1, height: 44, padding: '0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontFamily: 'monospace' }} />
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Category</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Test Type, Priority" list="category-suggestions"
              style={{ width: '100%', height: 44, padding: '0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14 }} />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((cat) => <option key={cat} value={cat} />)}
            </datalist>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {CATEGORY_SUGGESTIONS.slice(0, 4).map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 6, backgroundColor: category === cat ? '#F1F5F9' : '#FFF', color: '#64748B', cursor: 'pointer' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description for this tag..." rows={2}
              style={{ width: '100%', padding: 14, border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, resize: 'vertical' }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={isSubmitting} style={{ height: 44, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#334155', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            style={{ height: 44, padding: '0 24px', background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#FFFFFF', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
            {isSubmitting ? 'Saving...' : (editingTag ? 'Update Tag' : 'Create Tag')}
          </button>
        </div>
      </div>
    </div>
  );
}
