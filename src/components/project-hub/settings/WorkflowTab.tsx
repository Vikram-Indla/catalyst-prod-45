import { useQuery } from '@tanstack/react-query';
import '@/components/project-hub/shared/phStyles.css';
import { typedQuery } from '@/integrations/supabase/client';
import { WorkItemTypeIcon } from '@/components/icons';
import { ExternalLink } from 'lucide-react';

interface WorkflowTabProps {
  projectId: string;
}

// Only these 4 types are in scope for BAU project settings
const IN_SCOPE_TYPES = ['Story', 'Epic', 'Feature', 'Sub-task', 'QA Bug'] as const;

interface AdminScheme {
  id: string;
  name: string;
  issue_type: string;
}

interface AdminStatus {
  id: string;
  scheme_id: string;
  name: string;
  slug: string;
  category: 'todo' | 'in_progress' | 'done';
  color: string;
  position: number;
  is_initial: boolean;
  is_final: boolean;
}

interface WorkTypeRow {
  id: string;
  name: string;
  icon: string;
  workflow_name: string | null;
}

const CATEGORY_LABEL: Record<string, { label: string; bg: string; text: string }> = {
  todo:        { label: 'To Do',       bg: '#F1F5F9', text: '#475569' },
  in_progress: { label: 'In Progress', bg: '#EFF6FF', text: '#1D4ED8' },
  done:        { label: 'Done',        bg: '#F0FDF4', text: '#16A34A' },
};

const ICON_MAP: Record<string, string> = {
  'Story':    'story',
  'Epic':     'epic',
  'Feature':  'feature',
  'Sub-task': 'subtask',
  'QA Bug':   'bug',
};

export function WorkflowTab({ projectId }: WorkflowTabProps) {
  // Fetch in-scope work types for this project
  const { data: workTypes = [] } = useQuery({
    queryKey: ['ph-work-types-settings', projectId],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_work_types')
        .select('id,name,icon,workflow_name')
        .eq('project_id', projectId)
        .in('name', IN_SCOPE_TYPES as unknown as string[])
        .order('position');
      if (error) throw new Error(error.message);
      return (data || []) as WorkTypeRow[];
    },
    enabled: !!projectId,
  });

  // Fetch admin workflow schemes for in-scope types
  const { data: schemes = [] } = useQuery({
    queryKey: ['catalyst-workflow-schemes-settings'],
    queryFn: async () => {
      const { data, error } = await typedQuery('catalyst_workflow_schemes')
        .select('id,name,issue_type')
        .in('issue_type', IN_SCOPE_TYPES as unknown as string[])
        .eq('is_active', true)
        .eq('is_default', true);
      if (error) throw new Error(error.message);
      return (data || []) as AdminScheme[];
    },
  });

  // Fetch statuses for all schemes in one query
  const schemeIds = schemes.map(s => s.id);
  const { data: allStatuses = [], isLoading } = useQuery({
    queryKey: ['catalyst-workflow-statuses-settings', schemeIds],
    queryFn: async () => {
      if (!schemeIds.length) return [];
      const { data, error } = await typedQuery('catalyst_workflow_statuses')
        .select('id,scheme_id,name,slug,category,color,position,is_initial,is_final')
        .in('scheme_id', schemeIds)
        .eq('is_active', true)
        .order('position');
      if (error) throw new Error(error.message);
      return (data || []) as AdminStatus[];
    },
    enabled: schemeIds.length > 0,
  });

  // Build lookup: issue_type → scheme, statuses
  const schemeByType = Object.fromEntries(schemes.map(s => [s.issue_type, s]));
  const statusesByScheme = allStatuses.reduce<Record<string, AdminStatus[]>>((acc, s) => {
    if (!acc[s.scheme_id]) acc[s.scheme_id] = [];
    acc[s.scheme_id].push(s);
    return acc;
  }, {});

  // Render in declared IN_SCOPE_TYPES order; fall back to project workTypes order
  const orderedTypes = IN_SCOPE_TYPES
    .map(typeName => workTypes.find(wt => wt.name === typeName))
    .filter(Boolean) as WorkTypeRow[];

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="ph-card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h3 className="ph-card-title" style={{ marginBottom: 4 }}>Workflow Scheme</h3>
            <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: 0 }}>
              Workflows are managed globally in Admin. Each work type uses a named workflow that defines its status pipeline and allowed transitions.
            </p>
          </div>
          <a
            href="/admin/workflows"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600, color: 'var(--ds-link, #0C66E4)',
              textDecoration: 'none', whiteSpace: 'nowrap', paddingTop: 2,
            }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            <ExternalLink size={12} />
            Manage in Admin
          </a>
        </div>
      </div>

      {/* Per-type workflow cards */}
      {isLoading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--fg-4)' }}>
          Loading workflows…
        </div>
      ) : (
        orderedTypes.map(wt => {
          const scheme = schemeByType[wt.name];
          const statuses = scheme ? (statusesByScheme[scheme.id] || []) : [];
          const iconKey = ICON_MAP[wt.name] || wt.icon;

          return (
            <div key={wt.id} className="ph-card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Type header */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px',
                  borderBottom: statuses.length > 0 ? '1px solid var(--divider)' : 'none',
                  background: 'var(--ds-surface-sunken,#F8FAFC)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <WorkItemTypeIcon type={iconKey} size={16} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>{wt.name}</span>
                  {scheme && (
                    <span style={{
                      fontSize: 11, color: 'var(--fg-3)',
                      background: 'var(--ds-background-neutral,#F1F5F9)',
                      padding: '1px 8px', borderRadius: 10,
                      border: '1px solid var(--divider)',
                    }}>
                      {scheme.name}
                    </span>
                  )}
                </div>
                <a
                  href="/admin/workflows"
                  style={{
                    fontSize: 11, color: 'var(--ds-link, #0C66E4)',
                    textDecoration: 'none', fontWeight: 500,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Edit in Admin →
                </a>
              </div>

              {/* Status pipeline */}
              {statuses.length === 0 ? (
                <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--fg-4)' }}>
                  No workflow configured — set up in Admin
                </div>
              ) : (
                <div style={{ padding: '16px 20px' }}>
                  {/* Category columns */}
                  {(['todo', 'in_progress', 'done'] as const).map(cat => {
                    const catStatuses = statuses.filter(s => s.category === cat);
                    if (!catStatuses.length) return null;
                    const meta = CATEGORY_LABEL[cat];
                    return (
                      <div key={cat} style={{ marginBottom: 12 }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center',
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                          textTransform: 'uppercase', color: meta.text,
                          background: meta.bg, borderRadius: 4,
                          padding: '2px 8px', marginBottom: 8,
                        }}>
                          {meta.label}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {catStatuses.map((s, i) => (
                            <div
                              key={s.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '5px 10px',
                                background: s.is_initial ? '#EFF6FF' : s.is_final ? '#F0FDF4' : 'var(--ds-surface-sunken,#F8FAFC)',
                                border: `1px solid ${s.is_initial ? '#BFDBFE' : s.is_final ? '#BBF7D0' : 'var(--divider)'}`,
                                borderRadius: 6, fontSize: 12, fontWeight: 500,
                                color: 'var(--fg-1)',
                              }}
                            >
                              <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: s.color, flexShrink: 0,
                                border: '1px solid rgba(0,0,0,0.1)',
                              }} />
                              {s.name}
                              {s.is_initial && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#1D4ED8', letterSpacing: '0.04em' }}>
                                  START
                                </span>
                              )}
                              {s.is_final && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#16A34A', letterSpacing: '0.04em' }}>
                                  END
                                </span>
                              )}
                              {i < catStatuses.length - 1 && (
                                <span style={{ color: 'var(--fg-4)', fontSize: 10, marginLeft: 2 }}>→</span>
                              )}
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
        })
      )}

      {/* Footnote */}
      <p style={{ fontSize: 11, color: 'var(--fg-4)', margin: 0, paddingTop: 4 }}>
        Workflow statuses and transitions are maintained in{' '}
        <a href="/admin/workflows" style={{ color: 'var(--ds-link, #0C66E4)' }}>Admin → Workflows</a>.
        Changes apply to all projects using these workflows.
      </p>
    </div>
  );
}
