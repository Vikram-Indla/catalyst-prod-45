import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import '@/components/project-hub/shared/phStyles.css';
import { supabase } from '@/integrations/supabase/client';
import { WorkItemTypeIcon } from '@/components/icons';
import { ChevronRight } from '@/lib/atlaskit-icons';

interface LayoutTabProps {
  projectId: string;
}

interface WorkType {
  id: string;
  name: string;
  icon: string;
  screen_name: string | null;
  position: number;
}

interface FieldLayoutRow {
  id: string;
  work_type_id: string;
  field_key: string;
  field_label: string;
  section: string;
  is_required: boolean;
  is_visible: boolean;
  position: number;
}

const SECTION_LABELS: Record<string, string> = {
  details: 'Details',
  people:  'People',
  dates:   'Dates & Time',
};

const SECTION_ORDER = ['details', 'people', 'dates'];

function VisibilityDot({ visible, required }: { visible: boolean; required: boolean }) {
  if (required) return (
    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--cp-danger, #DC2626)', marginLeft: 4 }} title="Required">*</span>
  );
  return (
    <span
      style={{
        display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
        background: visible ? 'var(--cp-success, #16A34A)' : '#CBD5E1',
        marginLeft: 4, flexShrink: 0,
      }}
      title={visible ? 'Visible' : 'Hidden'}
    />
  );
}

function TypeLayoutPanel({ workTypeId, typeName }: { workTypeId: string; typeName: string }) {
  const { data: fields = [], isLoading } = useQuery({
    queryKey: ['ph-field-layout', workTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_field_layout')
        .select('*')
        .eq('work_type_id', workTypeId)
        .order('position');
      if (error) throw new Error(error.message);
      return (data || []) as FieldLayoutRow[];
    },
  });

  const bySection = SECTION_ORDER.reduce<Record<string, FieldLayoutRow[]>>((acc, s) => {
    acc[s] = fields.filter(f => f.section === s);
    return acc;
  }, {});

  return (
    <div style={{ padding: '16px 20px 20px', background: 'var(--ds-surface-sunken,#F8FAFC)', borderTop: '1px solid var(--divider)' }}>
      <p style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 16, fontFamily: 'var(--cp-font-body)' }}>
        Field layout for <strong>{typeName}</strong> — controls which fields appear and in what order on Create, Edit, and View screens.
      </p>

      {isLoading ? (
        <div style={{ fontSize: 13, color: 'var(--fg-4)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {SECTION_ORDER.map(section => {
            const sectionFields = bySection[section] ?? [];
            if (sectionFields.length === 0) return null;
            return (
              <div
                key={section}
                style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 8, overflow: 'hidden' }}
              >
                <div style={{ padding: '8px 12px', background: 'var(--ds-surface-sunken,#F8FAFC)', borderBottom: '1px solid var(--divider)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3)' }}>
                    {SECTION_LABELS[section] ?? section}
                  </span>
                </div>
                <div>
                  {sectionFields.map((f, i) => (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '7px 12px',
                        borderBottom: i < sectionFields.length - 1 ? '1px solid var(--divider)' : 'none',
                        opacity: f.is_visible ? 1 : 0.5,
                      }}
                    >
                      <span style={{ fontSize: 13, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}>
                        {f.field_label}
                        {f.is_required && <span style={{ color: 'var(--cp-danger, #DC2626)', marginLeft: 3 }}>*</span>}
                      </span>
                      <span
                        style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                          background: f.is_visible ? '#DCFCE7' : '#F1F5F9',
                          color: f.is_visible ? '#15803D' : 'var(--cp-ink-4, #94A3B8)',
                        }}
                      >
                        {f.is_visible ? 'Shown' : 'Hidden'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LayoutTab({ projectId }: LayoutTabProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['ph-work-types-layout', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_work_types')
        .select('id,name,icon,screen_name,position')
        .eq('project_id', projectId)
        .order('position');
      if (error) throw new Error(error.message);
      return (data || []) as WorkType[];
    },
    enabled: !!projectId,
  });

  // Group by screen_name (same screen = same layout group in Jira)
  const groups = types.reduce<Map<string, WorkType[]>>((acc, t) => {
    const key = t.screen_name ?? 'Default';
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)!.push(t);
    return acc;
  }, new Map());

  return (
    <div className="space-y-5">
      <div className="ph-card" style={{ padding: '16px 20px' }}>
        <h3 className="ph-card-title" style={{ marginBottom: 4 }}>Field Layout</h3>
        <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: 0 }}>
          Work types sharing the same screen are grouped together. Click a type to view its field layout.
        </p>
      </div>

      {isLoading ? (
        <div className="ph-card" style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--fg-4)' }}>
          Loading…
        </div>
      ) : (
        [...groups.entries()].map(([screenName, groupTypes]) => (
          <div key={screenName} className="ph-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Group header */}
            <div
              style={{
                padding: '10px 20px',
                borderBottom: '1px solid var(--divider)',
                background: 'var(--ds-surface-sunken,#F8FAFC)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3)' }}>
                Screen
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}>
                {screenName}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-4)', fontFamily: 'var(--cp-font-mono)' }}>
                {groupTypes.length} {groupTypes.length === 1 ? 'type' : 'types'}
              </span>
            </div>

            {/* Type rows */}
            {groupTypes.map((t, i) => {
              const isOpen = expanded === t.id;
              return (
                <div key={t.id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 20px', border: 'none', cursor: 'pointer',
                      background: isOpen ? 'var(--ds-background-selected,#EFF6FF)' : 'transparent',
                      borderBottom: (!isOpen && i < groupTypes.length - 1) ? '1px solid var(--divider)' : 'none',
                      textAlign: 'left', transition: 'background 80ms',
                    }}
                    onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--ds-surface-sunken,#F8FAFC)'; }}
                    onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
                    aria-expanded={isOpen}
                  >
                    <ChevronRight
                      size={14}
                      style={{
                        color: 'var(--fg-3)',
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 150ms ease',
                        flexShrink: 0,
                      }}
                    />
                    <WorkItemTypeIcon type={t.icon} size={16} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', flex: 1 }}>
                      {t.name}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--fg-4)', fontFamily: 'var(--cp-font-body)' }}>
                      {isOpen ? 'Collapse' : 'View layout'}
                    </span>
                  </button>

                  {isOpen && (
                    <TypeLayoutPanel workTypeId={t.id} typeName={t.name} />
                  )}

                  {i < groupTypes.length - 1 && (
                    <div style={{ borderBottom: '1px solid var(--divider)' }} />
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
