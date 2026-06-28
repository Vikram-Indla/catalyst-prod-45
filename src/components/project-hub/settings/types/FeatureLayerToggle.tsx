import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
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

      catalystToast.success(`Feature Layer ${newVal ? 'enabled' : 'disabled'}.`);
      onToggled();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to toggle Feature Layer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 mt-5 pt-4" style={{ borderTop: '1px solid var(--divider)' }}>
      <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--fg-2)' }}>Feature Layer:</span>
      <span
        className="rounded-full"
        style={{
          fontSize: 'var(--ds-font-size-100)', fontWeight: 600, padding: '0px 10px',
          backgroundColor: enabled ? 'var(--sem-success-bg)' : 'var(--cp-bd-zone)',
          color: enabled ? 'var(--sem-success)' : 'var(--fg-4)',
        }}
      >
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
      <button
        onClick={handleToggle}
        disabled={loading}
        className="hover:bg-[var(--ds-surface-sunken)] transition-colors disabled:opacity-50"
        style={{
          height: 32, padding: '8px 12px', fontSize: 'var(--ds-font-size-200)', fontWeight: 500,
          color: 'var(--fg-2)', border: '1px solid var(--divider)', borderRadius: 6,
          background: 'transparent', cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? 'Updating...' : enabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
}
