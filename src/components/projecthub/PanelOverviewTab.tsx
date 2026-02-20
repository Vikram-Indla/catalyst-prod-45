import { useMemo } from 'react';
import type { ProjectListItem, ProjectTeamMember } from '@/types/projecthub';
import { PROJECT_STATUS_DISPLAY, PROJECT_HEALTH_DISPLAY, STATUS_CATEGORY_DISPLAY, getRoleCategory, ROLE_CATEGORY_ORDER } from '@/types/projecthub';
import { formatDistanceToNowStrict } from 'date-fns';

interface Props {
  project: ProjectListItem;
  members: ProjectTeamMember[];
}

export function PanelOverviewTab({ project, members }: Props) {
  const details = [
    { label: 'Key', value: project.project_key },
    { label: 'Department', value: project.department || '—' },
    { label: 'Status', value: PROJECT_STATUS_DISPLAY[project.status] || project.status },
    { label: 'Health', value: PROJECT_HEALTH_DISPLAY[project.health_status] || project.health_status },
    { label: 'Category', value: STATUS_CATEGORY_DISPLAY[project.status_category] || project.status_category },
    { label: 'Progress', value: `${project.completion_percentage}%` },
    { label: 'Last Updated', value: project.updated_at ? formatDistanceToNowStrict(new Date(project.updated_at), { addSuffix: true }) : '—' },
    { label: 'Team Size', value: `${project.member_count} member${project.member_count !== 1 ? 's' : ''}` },
  ];

  const roleDist = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach(m => {
      const cat = getRoleCategory(m.project_role || m.job_role);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const total = members.length || 1;
    return ROLE_CATEGORY_ORDER
      .filter(c => counts[c])
      .map(c => ({ category: c, count: counts[c], pct: (counts[c] / total) * 100 }));
  }, [members]);

  return (
    <div className="p-4 space-y-5">
      {/* Details table */}
      <div className="rounded-lg" style={{ background: '#F8FAFC', padding: '12px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>Project Details</div>
        <div className="space-y-0">
          {details.map(d => (
            <div key={d.label} className="flex items-center justify-between" style={{ padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 12, color: '#64748B' }}>{d.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', fontFamily: d.label === 'Key' || d.label === 'Progress' ? "'JetBrains Mono', monospace" : 'inherit' }}>
                {d.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Role distribution */}
      {roleDist.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>Role Distribution</div>
          <div className="space-y-2">
            {roleDist.map(r => (
              <div key={r.category} className="flex items-center gap-3">
                <span className="truncate" style={{ width: 160, fontSize: 12, color: '#475569', flexShrink: 0 }}>{r.category}</span>
                <div className="flex-1 rounded-full overflow-hidden" style={{ height: 8, background: '#F1F5F9' }}>
                  <div className="rounded-full" style={{ width: `${r.pct}%`, height: '100%', background: '#2563EB', minWidth: r.pct > 0 ? 4 : 0 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', fontFamily: "'JetBrains Mono', monospace", minWidth: 20, textAlign: 'right' }}>
                  {r.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
