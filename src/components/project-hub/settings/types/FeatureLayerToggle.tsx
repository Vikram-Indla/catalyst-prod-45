import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

interface FeatureLayerToggleProps {
  projectId: string;
  enabled: boolean;
  onToggled: () => void;
}

export function FeatureLayerToggle({ projectId, enabled, onToggled }: FeatureLayerToggleProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const newVal = !enabled;
    try {
      const { error: projErr } = await supabase
        .from('ph_projects')
        .update({ feature_layer: newVal } as any)
        .eq('id', projectId);
      if (projErr) throw new Error(projErr.message);

      const { error: typeErr } = await supabase
        .from('ph_work_types')
        .update({ is_enabled: newVal })
        .eq('project_id', projectId)
        .eq('name', 'Feature');
      if (typeErr) throw new Error(typeErr.message);

      toast.success(`Feature Layer ${newVal ? 'enabled' : 'disabled'}.`);
      onToggled();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle Feature Layer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 mt-5 pt-4" style={{ borderTop: '1px solid var(--divider)' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-2)' }}>Feature Layer:</span>
      <span
        className="rounded-full"
        style={{
          fontSize: 11, fontWeight: 600, padding: '2px 10px',
          backgroundColor: enabled ? 'var(--sem-success-bg)' : 'var(--cp-bd-zone)',
          color: enabled ? 'var(--sem-success)' : 'var(--fg-4)',
        }}
      >
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
      <button
        onClick={handleToggle}
        disabled={loading}
        className="hover:bg-[var(--ds-surface-sunken, #F8FAFC)] transition-colors disabled:opacity-50"
        style={{
          height: 32, padding: '8px 12px', fontSize: 12, fontWeight: 500,
          color: 'var(--fg-2)', border: '1px solid var(--divider)', borderRadius: 6,
          background: 'transparent', cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? 'Updating...' : enabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
}
