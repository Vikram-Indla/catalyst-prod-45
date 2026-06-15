import { useQuery } from '@tanstack/react-query';
import '@/components/project-hub/shared/phStyles.css';
import { supabase } from '@/integrations/supabase/client';
import { WorkItemTypeIcon } from '@/components/icons';

interface FieldsTabProps {
  projectId: string;
}

interface FieldSchemeRow {
  id: string;
  scheme_name: string;
  ph_field_config: FieldConfigRow[];
}

interface FieldConfigRow {
  id: string;
  config_name: string;
  work_type_names: string[];
  is_default: boolean;
  project_count: number;
}

// Maps work type name to its icon key
const TYPE_ICON: Record<string, string> = {
  'Epic':               'epic',
  'Feature':            'feature',
  'Business Request':   'business-request',
  'Story':              'story',
  'QA Bug':             'qa-bug',
  'Production Incident':'production-incident',
  'Change Request':     'change-request',
  'Business Gap':       'business-gap',
  'Sub-task':           'sub-task',
};

function ConfigCard({ config }: { config: FieldConfigRow }) {
  return (
    <div
      style={{
        border: '1px solid var(--divider)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--ds-surface, #fff)',
      }}
    >
      {/* Config header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--divider)',
          background: 'var(--ds-surface-sunken,#F8FAFC)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', flex: 1 }}>
          {config.config_name}
        </span>
        {config.is_default && (
          <span
            style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
              background: 'var(--ds-background-success, #DCFCE7)', color: 'var(--ds-text-success, #15803D)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}
          >
            Default
          </span>
        )}
      </div>

      {/* Meta row */}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--divider)',
          display: 'flex', gap: 20,
          background: 'var(--ds-surface, #fff)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--fg-3)' }}>
            Projects using this
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-mono)' }}>
            {config.project_count}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--fg-3)' }}>
            Work types
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-mono)' }}>
            {config.work_type_names.length}
          </span>
        </div>
      </div>

      {/* Work type chips */}
      {config.work_type_names.length > 0 && (
        <div style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {config.work_type_names.map(typeName => (
            <div
              key={typeName}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px',
                border: '1px solid var(--divider)',
                borderRadius: 20,
                background: 'var(--ds-surface-sunken,#F8FAFC)',
              }}
            >
              <WorkItemTypeIcon type={TYPE_ICON[typeName] ?? 'story'} size={13} />
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', fontFamily: 'var(--cp-font-body)' }}>
                {typeName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FieldsTab({ projectId }: FieldsTabProps) {
  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ['ph-field-scheme', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_field_scheme')
        .select('id,scheme_name,ph_field_config(id,config_name,work_type_names,is_default,project_count)')
        .eq('project_id', projectId);
      if (error) throw new Error(error.message);
      return (data || []) as FieldSchemeRow[];
    },
    enabled: !!projectId,
  });

  return (
    <div className="space-y-5">
      <div className="ph-card" style={{ padding: '16px 20px' }}>
        <h3 className="ph-card-title" style={{ marginBottom: 4 }}>Field Configuration</h3>
        <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: 0 }}>
          Field configuration schemes define which fields are available for each work type. Work types sharing the same configuration inherit the same set of available fields.
        </p>
      </div>

      {isLoading ? (
        <div className="ph-card" style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--fg-4)' }}>
          Loading…
        </div>
      ) : schemes.length === 0 ? (
        <div className="ph-card" style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--fg-4)' }}>
          No field scheme configured
        </div>
      ) : (
        schemes.map(scheme => (
          <div key={scheme.id} className="ph-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Scheme header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--divider)',
                background: 'var(--ds-surface-sunken,#F8FAFC)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3)', marginBottom: 2 }}>
                  Field Scheme
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>
                  {scheme.scheme_name}
                </div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-4)', fontFamily: 'var(--cp-font-mono)' }}>
                {scheme.ph_field_config.length} {scheme.ph_field_config.length === 1 ? 'configuration' : 'configurations'}
              </span>
            </div>

            {/* Config cards */}
            <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {(scheme.ph_field_config ?? [])
                .slice()
                .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0))
                .map(config => (
                  <ConfigCard key={config.id} config={config} />
                ))
              }
            </div>
          </div>
        ))
      )}
    </div>
  );
}
