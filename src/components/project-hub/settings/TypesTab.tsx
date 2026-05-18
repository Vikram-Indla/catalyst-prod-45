import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import '@/components/project-hub/shared/phStyles.css';
import { supabase } from '@/integrations/supabase/client';
import { WorkItemTypeIcon } from '@/components/icons';
import { TypeHierarchy } from './types/TypeHierarchy';
import { FeatureLayerToggle } from './types/FeatureLayerToggle';
import { FieldLayoutPanel } from './types/FieldLayoutPanel';

interface TypesTabProps {
  projectId: string;
  featureLayer: boolean;
}

interface WorkType {
  id: string;
  name: string;
  icon: string;
  color: string;
  level: string;
  is_enabled: boolean;
  position: number;
  workflow_name: string | null;
  field_config: string;
  screen_name: string | null;
}

const LEVEL_STYLES: Record<string, { bg: string; text: string }> = {
  top:   { bg: '#F5F3FF', text: 'var(--cp-purple-60, #7C3AED)' },
  mid:   { bg: '#EFF6FF', text: '#2563EB' },
  work:  { bg: '#F1F5F9', text: '#334155' },
  child: { bg: '#F1F5F9', text: 'var(--cp-ink-4, #94A3B8)' },
};

const COL_WIDTHS = {
  type:     220,
  level:    80,
  workflow: 220,
  config:   200,
  screen:   220,
  actions:  48,
};

export function TypesTab({ projectId, featureLayer }: TypesTabProps) {
  const queryClient = useQueryClient();
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [currentFeatureLayer, setCurrentFeatureLayer] = useState(featureLayer);

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['ph-work-types', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_work_types')
        .select('id,name,icon,color,level,is_enabled,position,workflow_name,field_config,screen_name')
        .eq('project_id', projectId)
        .order('position');
      if (error) throw new Error(error.message);
      return (data || []) as WorkType[];
    },
    enabled: !!projectId,
  });

  const selectedType = types.find(t => t.id === selectedTypeId);

  const handleToggled = useCallback(() => {
    setCurrentFeatureLayer(prev => !prev);
    queryClient.invalidateQueries({ queryKey: ['ph-work-types', projectId] });
    queryClient.invalidateQueries({ queryKey: ['ph-project-settings'] });
  }, [queryClient, projectId]);

  const isFeatureDisabled = (t: WorkType) =>
    t.name === 'Feature' && !currentFeatureLayer;

  return (
    <div className="space-y-5">
      {/* Work Types Table */}
      <div className="ph-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 12px' }}>
          <h3 className="ph-card-title" style={{ marginBottom: 2 }}>Work Types</h3>
          <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: 0 }}>
            Configure the workflow, field layout, and screens used by each work type.
          </p>
        </div>

        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `${COL_WIDTHS.type}px ${COL_WIDTHS.level}px 1fr 1fr 1fr ${COL_WIDTHS.actions}px`,
            borderTop: '1px solid var(--divider)',
            borderBottom: '1px solid var(--divider)',
            background: 'var(--ds-surface-sunken, #F8FAFC)',
            padding: '0 20px',
          }}
        >
          {['Work type', 'Level', 'Workflow', 'Field config', 'Screen'].map(h => (
            <div
              key={h}
              style={{
                padding: '8px 8px 8px 0',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--fg-3)',
                fontFamily: 'var(--cp-font-body)',
              }}
            >
              {h}
            </div>
          ))}
          <div />
        </div>

        {/* Table body */}
        {isLoading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--fg-4)' }}>
            Loading…
          </div>
        ) : types.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--fg-4)' }}>
            No work types configured
          </div>
        ) : (
          <div>
            {types.map((t, i) => {
              const disabled = isFeatureDisabled(t);
              const ls = LEVEL_STYLES[t.level] ?? LEVEL_STYLES.work;
              const isSelected = selectedTypeId === t.id;
              return (
                <div key={t.id}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `${COL_WIDTHS.type}px ${COL_WIDTHS.level}px 1fr 1fr 1fr ${COL_WIDTHS.actions}px`,
                      padding: '0 20px',
                      borderBottom: i < types.length - 1 ? '1px solid var(--divider)' : 'none',
                      background: isSelected ? 'var(--ds-background-selected, #EFF6FF)' : 'transparent',
                      opacity: disabled ? 0.45 : 1,
                      transition: 'background 80ms',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--ds-surface-sunken,#F8FAFC)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Work type — icon + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px 12px 0', minWidth: 0 }}>
                      <WorkItemTypeIcon type={t.icon} size={18} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.name}
                      </span>
                    </div>

                    {/* Level badge */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 8px 12px 0' }}>
                      <span
                        style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px',
                          borderRadius: 10, background: ls.bg, color: ls.text,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.level.charAt(0).toUpperCase() + t.level.slice(1)}
                      </span>
                    </div>

                    {/* Workflow */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 8px 12px 0', minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, var(--cp-ink-3, #64748B))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.workflow_name ?? '—'}
                      </span>
                    </div>

                    {/* Field config */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 8px 12px 0', minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, var(--cp-ink-3, #64748B))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.field_config}
                      </span>
                    </div>

                    {/* Screen */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 8px 12px 0', minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, var(--cp-ink-3, #64748B))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.screen_name ?? '—'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {disabled ? (
                        <span style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--fg-4)' }}>Off</span>
                      ) : (
                        <button
                          onClick={() => setSelectedTypeId(isSelected ? null : t.id)}
                          style={{
                            width: 28, height: 28, border: 'none', borderRadius: 4,
                            background: isSelected ? 'var(--ds-background-selected-bold,#2563EB)' : 'transparent',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isSelected ? '#fff' : 'var(--fg-3)',
                            fontSize: 16, fontWeight: 700, lineHeight: 1,
                            transition: 'background 80ms',
                          }}
                          title="Configure fields"
                          aria-label={`Configure fields for ${t.name}`}
                          aria-expanded={isSelected}
                        >
                          ⋯
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Field layout panel — inline expand */}
                  {isSelected && selectedType && (
                    <div style={{ borderBottom: i < types.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                      <FieldLayoutPanel
                        typeId={selectedType.id}
                        typeName={selectedType.name}
                        onClose={() => setSelectedTypeId(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Type Hierarchy */}
      <TypeHierarchy featureLayerEnabled={currentFeatureLayer} />

      {/* Feature Layer Toggle */}
      <div className="ph-card">
        <FeatureLayerToggle projectId={projectId} enabled={currentFeatureLayer} onToggled={handleToggled} />
      </div>
    </div>
  );
}
