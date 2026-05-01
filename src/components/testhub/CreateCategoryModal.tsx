import { useState, useEffect } from 'react';
import {
  X, Shield, Navigation2, FormInput, Plug, CheckCircle,
  Database, Eye, Gauge, Folder, Tag, Settings, Users,
  FileText, Zap, Globe, Lock, Bell, Heart, Star,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingCategories: Array<{ name: string }>;
}

const PRESET_COLORS = [
  'var(--ds-text-brand, #3B82F6)', '#8B5CF6', '#10B981', '#F97316', '#EC4899',
  '#06B6D4', '#EAB308', 'var(--ds-text-subtlest, #64748B)', 'var(--ds-text-danger, #EF4444)', '#14B8A6',
];

const AVAILABLE_ICONS = [
  { name: 'shield', icon: Shield, label: 'Security' },
  { name: 'navigation', icon: Navigation2, label: 'Navigation' },
  { name: 'form-input', icon: FormInput, label: 'Forms' },
  { name: 'plug', icon: Plug, label: 'Integration' },
  { name: 'check-circle', icon: CheckCircle, label: 'Validation' },
  { name: 'database', icon: Database, label: 'Data' },
  { name: 'eye', icon: Eye, label: 'UI/View' },
  { name: 'gauge', icon: Gauge, label: 'Performance' },
  { name: 'folder', icon: Folder, label: 'General' },
  { name: 'tag', icon: Tag, label: 'Tags' },
  { name: 'settings', icon: Settings, label: 'Settings' },
  { name: 'users', icon: Users, label: 'Users' },
  { name: 'file-text', icon: FileText, label: 'Documents' },
  { name: 'zap', icon: Zap, label: 'Actions' },
  { name: 'globe', icon: Globe, label: 'Global' },
  { name: 'lock', icon: Lock, label: 'Auth' },
  { name: 'bell', icon: Bell, label: 'Notifications' },
  { name: 'heart', icon: Heart, label: 'Favorites' },
  { name: 'star', icon: Star, label: 'Featured' },
];

export function CreateCategoryModal({ isOpen, onClose, onSuccess, existingCategories }: CreateCategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('folder');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(''); setDescription(''); setColor(PRESET_COLORS[0]); setIcon('folder'); setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Category name is required'); return; }
    if (existingCategories.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('A category with this name already exists'); return;
    }

    setIsSubmitting(true); setError('');
    try {
      const { data: lastCat } = await supabase
        .from('th_shared_step_categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);
      const nextSort = lastCat?.[0]?.sort_order ? lastCat[0].sort_order + 1 : 1;

      const { error: insertError } = await supabase
        .from('th_shared_step_categories')
        .insert({ name: name.trim(), description: description.trim() || null, color, icon, sort_order: nextSort });

      if (insertError) {
        catalystToast.error(insertError.message || 'Failed to create category', { title: 'Creation Failed' });
        return;
      }
      catalystToast.success(`Category "${name.trim()}" created successfully`, { title: 'Category Created' });
      onSuccess(); onClose();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to create category', { title: 'Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const SelectedIcon = (AVAILABLE_ICONS.find(i => i.name === icon)?.icon) || Folder;
  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 480, maxHeight: '90vh', backgroundColor: 'var(--cp-float)', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0, fontFamily: 'var(--cp-font-body)' }}>Create Category</h2>
            <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '4px 0 0', fontFamily: 'var(--cp-font-body)' }}>Organize your shared steps with categories</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, padding: 0, border: 'none', backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'var(--cp-font-body)' }}>
          {/* Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, backgroundColor: 'var(--bg-1)', borderRadius: 12, border: '1px solid var(--divider)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SelectedIcon size={20} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-1)' }}>{name.trim() || 'Category Name'}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>Preview</div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>Name *</label>
            <input
              value={name} onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="e.g., Authentication" maxLength={50}
              style={{ width: '100%', height: 40, padding: '8px 12px', border: `1.5px solid ${error ? 'var(--sem-danger)' : 'var(--divider)'}`, borderRadius: 8, fontSize: 14, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}
            />
            {error && <p style={{ fontSize: 12, color: 'var(--sem-danger)', margin: '4px 0 0' }}>{error}</p>}
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>Description</label>
            <input
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief description (optional)" maxLength={100}
              style={{ width: '100%', height: 40, padding: '8px 12px', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}
            />
          </div>

          {/* Color Picker */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 8 }}>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 36, height: 50, borderRadius: 8, backgroundColor: c, border: color === c ? '3px solid #0F172A' : '3px solid transparent',
                  cursor: 'pointer', transition: 'transform 0.1s', padding: 0,
                }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 8 }}>Icon</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 6 }}>
              {AVAILABLE_ICONS.map(opt => {
                const IconComp = opt.icon;
                const sel = icon === opt.name;
                return (
                  <button key={opt.name} onClick={() => setIcon(opt.name)} title={opt.label} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8,
                    backgroundColor: sel ? `${color}15` : 'var(--bg-1)',
                    border: sel ? `2px solid ${color}` : '2px solid transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'all 0.15s',
                  }}>
                    <IconComp size={18} style={{ color: sel ? color : 'var(--fg-3)' }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer', fontFamily: 'var(--cp-font-body)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} style={{
            height: 40, padding: '0 24px', background: 'linear-gradient(135deg, var(--cp-blue) 0%, var(--cp-primary-70) 100%)',
            border: 'none', borderRadius: 8, color: 'var(--ds-text-inverse, #FFFFFF)', fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'var(--cp-font-body)', opacity: isSubmitting ? 0.7 : 1,
          }}>{isSubmitting ? 'Creating...' : 'Create Category'}</button>
        </div>
      </div>
    </div>
  );
}
