import { useQuery } from '@tanstack/react-query';
import '@/components/project-hub/shared/phStyles.css';
import { supabase } from '@/integrations/supabase/client';
import { WorkItemTypeIcon } from '@/components/icons';

interface ScreensTabProps {
  projectId: string;
}

interface ScreenRow {
  id: string;
  work_type_id: string;
  scheme_name: string;
  create_screen: string | null;
  edit_screen: string | null;
  view_screen: string | null;
  ph_work_types: {
    name: string;
    icon: string;
    position: number;
  };
}

const OP_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  create: { bg: 'var(--ds-background-success)', text: 'var(--ds-background-success-bold)', label: 'Create' },
  edit:   { bg: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)', label: 'Edit'   },
  view:   { bg: 'var(--ds-background-discovery)', text: 'var(--ds-background-discovery-bold)', label: 'View'   },
};

function OperationCell({ op, screen }: { op: 'create' | 'edit' | 'view'; screen: string | null }) {
  const { bg, text, label } = OP_BADGE[op];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 8px 12px 0', minWidth: 0 }}>
      <span
        style={{
          flexShrink: 0, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, padding: '2px 7px',
          borderRadius: 10, background: bg, color: text,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle,var(--cp-ink-3, var(--cp-text-secondary)))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {screen ?? '—'}
      </span>
    </div>
  );
}

export function ScreensTab({ projectId }: ScreensTabProps) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['ph-screen-config', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_screen_config')
        .select('id,work_type_id,scheme_name,create_screen,edit_screen,view_screen,ph_work_types(name,icon,position)')
        .eq('project_id', projectId)
        .order('ph_work_types(position)');
      if (error) throw new Error(error.message);
      return (data || []) as ScreenRow[];
    },
    enabled: !!projectId,
  });

  // Group by scheme_name
  const schemeNames = [...new Set(rows.map(r => r.scheme_name))];

  return (
    <div className="space-y-5">
      {/* Scheme info card */}
      <div className="ph-card" style={{ padding: '16px 20px' }}>
        <h3 className="ph-card-title" style={{ marginBottom: 4 }}>Screen Scheme</h3>
        <p style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--fg-3)', margin: 0 }}>
          Each work type maps to a screen scheme that defines which screens are used for Create, Edit, and View operations.
        </p>
      </div>

      {schemeNames.map(schemeName => {
        const schemeRows = rows.filter(r => r.scheme_name === schemeName);

        return (
          <div key={schemeName} className="ph-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Scheme header */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid var(--divider)',
                background: 'var(--ds-surface-sunken)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}>
                {schemeName}
              </span>
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--fg-4)', fontFamily: 'var(--cp-font-mono)' }}>
                {schemeRows.length} {schemeRows.length === 1 ? 'type' : 'types'}
              </span>
            </div>

            {/* Column headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr 1fr 1fr',
                padding: '0 20px',
                borderBottom: '1px solid var(--divider)',
                background: 'var(--ds-surface-sunken)',
              }}
            >
              {['Work type', 'Create', 'Edit', 'View'].map(h => (
                <div
                  key={h}
                  style={{
                    padding: '7px 8px 7px 0',
                    fontSize: 'var(--ds-font-size-100)', fontWeight: 700, letterSpacing: '0.05em',
                    textTransform: 'uppercase', color: 'var(--fg-3)',
                    fontFamily: 'var(--cp-font-body)',
                  }}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: 'var(--ds-font-size-300)', color: 'var(--fg-4)' }}>Loading…</div>
            ) : schemeRows.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: 'var(--ds-font-size-300)', color: 'var(--fg-4)' }}>No screen config found</div>
            ) : (
              schemeRows.map((row, i) => (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '200px 1fr 1fr 1fr',
                    padding: '0 20px',
                    borderBottom: i < schemeRows.length - 1 ? '1px solid var(--divider)' : 'none',
                    transition: 'background 80ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--ds-surface-sunken)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 8px 12px 0' }}>
                    <WorkItemTypeIcon type={row.ph_work_types?.icon ?? 'story'} size={16} />
                    <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--fg-1)', whiteSpace: 'nowrap' }}>
                      {row.ph_work_types?.name}
                    </span>
                  </div>
                  <OperationCell op="create" screen={row.create_screen} />
                  <OperationCell op="edit"   screen={row.edit_screen} />
                  <OperationCell op="view"   screen={row.view_screen} />
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
