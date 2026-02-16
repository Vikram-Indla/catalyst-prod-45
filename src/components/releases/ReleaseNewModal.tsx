import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import styles from '@/styles/release-hub.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function ReleaseNewModal({ isOpen, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '', version: '', status: 'planned', start_date: '', target_date: '', description: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.target_date) {
      toast.error('Name and Target Date are required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('releases').insert({
        name: form.name,
        version: form.version || 'v1.0',
        status: form.status as any,
        start_date: form.start_date || null,
        target_date: form.target_date,
        description: form.description || null,
        health_score: 85,
        progress: 0,
      } as any);
      if (error) throw new Error(error.message);
      toast.success('Release created');
      onCreated();
      onClose();
      setForm({ name: '', version: '', status: 'planned', start_date: '', target_date: '', description: '' });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>New Release</div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Name *</label>
          <input className={styles.formInput} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Security Patch" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Version</label>
          <input className={styles.formInput} value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="e.g. v2.1.0" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Status</label>
          <select className={styles.formSelect} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="planned">Planned</option>
            <option value="development">Development</option>
            <option value="staging">Staging</option>
            <option value="testing">Testing</option>
            <option value="uat">UAT</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className={styles.formGroup} style={{ flex: 1 }}>
            <label className={styles.formLabel}>Start Date</label>
            <input className={styles.formInput} type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div className={styles.formGroup} style={{ flex: 1 }}>
            <label className={styles.formLabel}>Target Date *</label>
            <input className={styles.formInput} type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Description</label>
          <textarea className={styles.formTextarea} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description..." rows={3} />
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnOutline} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} onClick={handleSubmit} disabled={saving}>
            {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : <><Plus size={14} /> Create Release</>}
          </button>
        </div>
      </div>
    </div>
  );
}
