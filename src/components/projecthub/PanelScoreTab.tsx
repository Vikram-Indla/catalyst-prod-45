import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  projectId: string;
}

const FIELDS: Array<{ key: 'strategic_alignment' | 'business_impact' | 'time_urgency' | 'resource_feasibility'; label: string }> = [
  { key: 'strategic_alignment', label: 'Strategic Alignment' },
  { key: 'business_impact', label: 'Business Impact' },
  { key: 'time_urgency', label: 'Time Urgency' },
  { key: 'resource_feasibility', label: 'Resource Feasibility' },
];

export function PanelScoreTab({ projectId }: Props) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, number>>({
    strategic_alignment: 3, business_impact: 3, time_urgency: 3, resource_feasibility: 3,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('project_scores')
        .select('strategic_alignment, business_impact, time_urgency, resource_feasibility')
        .eq('project_id', projectId)
        .maybeSingle();
      if (data) {
        setValues({
          strategic_alignment: data.strategic_alignment ?? 3,
          business_impact: data.business_impact ?? 3,
          time_urgency: data.time_urgency ?? 3,
          resource_feasibility: data.resource_feasibility ?? 3,
        });
      }
    })();
  }, [projectId]);

  const computed = (
    (values.strategic_alignment + values.business_impact + values.time_urgency + values.resource_feasibility) / 4
  ).toFixed(1);

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('project_scores').upsert(
        { project_id: projectId, ...values, scored_by: user?.id ?? null, updated_at: new Date().toISOString() },
        { onConflict: 'project_id' },
      );
      if (error) throw error;
      toast.success('Score saved');
      qc.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
    } catch (e: any) {
      toast.error(e.message || 'Failed to save score');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'var(--cp-font-body)' }}>
      <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 16 }}>
        Rate this project on each dimension (1–5). Computed score:{' '}
        <span style={{ fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-mono)' }}>{computed}</span>
      </div>
      <div className="space-y-4">
        {FIELDS.map(f => (
          <div key={f.key}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', display: 'block', marginBottom: 6 }}>
              {f.label}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => {
                const sel = values[f.key] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setValues(v => ({ ...v, [f.key]: n }))}
                    style={{
                      flex: 1, height: 36, borderRadius: 6, fontSize: 13, fontWeight: 600,
                      background: sel ? 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' : 'transparent',
                      color: sel ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--fg-2)',
                      border: `1px solid ${sel ? 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' : 'var(--divider)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        style={{
          marginTop: 20, width: '100%', height: 40, borderRadius: 6,
          background: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', color: 'var(--ds-text-inverse, #FFFFFF)', border: 'none',
          fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving…' : 'Save Score'}
      </button>
    </div>
  );
}
