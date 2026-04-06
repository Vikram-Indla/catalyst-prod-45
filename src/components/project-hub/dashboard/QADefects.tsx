/**
 * QADefects widget — severity badges with borders
 */
import WidgetCard from './WidgetCard';
import PersonAvatar from './PersonAvatar';
import { WidgetSkeleton } from './WidgetSkeleton';
import EmptyState from './EmptyState';
import { useDefects } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';

interface Props {
  projectId: string | null;
  releaseMap: Record<string, string>;
}

const SEV_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'rgba(248,113,113,0.06)', text: '#F87171', border: '#FCA5A5' },
  high: { bg: '#FFFBEB', text: '#FBBF24', border: '#FCD34D' },
  medium: { bg: '#F0F9FF', text: '#075985', border: '#7DD3FC' },
  low: { bg: 'rgba(74,222,128,0.06)', text: '#166534', border: '#86EFAC' },
};

export default function QADefects({ projectId, releaseMap }: Props) {
  const { selectedReleaseIds } = useDashboardStore();
  const { data, isLoading, error, refetch } = useDefects(projectId, selectedReleaseIds);
  const items = data ?? [];

  const crit = items.filter((i: any) => i.severity === 'critical').length;
  const high = items.filter((i: any) => i.severity === 'high').length;
  const med = items.filter((i: any) => i.severity === 'medium').length;

  return (
    <WidgetCard
      title="QA Defects"
      leftBorder="#0284C7"
      maxHeight={320}
      error={error ? error.message : null}
      onRetry={() => refetch()}
      headerRight={
        <div style={{ display: 'flex', gap: 4 }}>
          <span className="bg-[var(--sem-danger-bg)]" style={{ fontSize: 10, fontWeight: 700, color: 'var(--sem-danger-fg)', border: '1px solid var(--sem-danger-accent)', padding: '2px 6px', borderRadius: 9999 }}>Crit: {crit}</span>
          <span className="bg-[var(--sem-warning-bg)]" style={{ fontSize: 10, fontWeight: 700, color: 'var(--sem-warning-fg)', border: '1px solid var(--sem-warning-accent)', padding: '2px 6px', borderRadius: 9999 }}>High: {high}</span>
          <span className="bg-[var(--sem-info-bg)]" style={{ fontSize: 10, fontWeight: 700, color: 'var(--sem-info-fg)', border: '1px solid var(--sem-info-accent)', padding: '2px 6px', borderRadius: 9999 }}>Med: {med}</span>
        </div>
      }
    >
      {isLoading ? (
        <WidgetSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState message="No QA defects in active releases ✓" icon="check" />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--divider)' }}>
              {['Rel', 'Key', 'Sev', 'Title', 'Open', 'Reported', 'Assigned'].map(h => (
                <th key={h} style={{ padding: '6px 6px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: "'Inter', sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => {
              const ss = SEV_STYLE[item.severity] || SEV_STYLE.medium;
              return (
                <tr key={item.id} className={`ph-table-row ${idx % 2 === 1 ? 'bg-[var(--bg-1)]' : ''}`} style={{ height: 44, borderBottom: '1px solid var(--cp-bd-zone)' }}>
                  <td style={{ padding: '0 6px' }}>
                    <span className="bg-[var(--sem-success-bg)]" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, color: 'var(--sem-success-fg)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--sem-success-accent)' }}>
                      {releaseMap[item.release_id] || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--cp-primary-70)', fontWeight: 700 }}>
                    {item.key}
                  </td>
                  <td style={{ padding: '0 6px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: ss.text, background: ss.bg, border: `1px solid ${ss.border}`, padding: '2px 7px', borderRadius: 9999, textTransform: 'capitalize' }}>
                      {item.severity}
                    </span>
                  </td>
                  <td style={{ padding: '0 6px', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg-1)', fontWeight: 500, fontFamily: "'Inter', sans-serif" }} title={item.title}>
                    {item.title}
                  </td>
                  <td style={{ padding: '0 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: (item.days_open ?? 0) === 0 ? 'var(--sem-success)' : 'var(--fg-1)' }}>
                    {item.days_open ?? 0}d
                  </td>
                  <td style={{ padding: '0 6px' }}>
                    {item.reported_by_name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <PersonAvatar name={item.reported_by_name} size={16} />
                        <span style={{ fontSize: 10, color: 'var(--fg-1)', fontWeight: 500, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{item.reported_by_name.split(' ')[0]}</span>
                      </div>
                    ) : <span style={{ color: 'var(--fg-4)', fontSize: 10, fontStyle: 'italic' }}>Unknown</span>}
                  </td>
                  <td style={{ padding: '0 6px' }}>
                    {item.assigned_to_name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <PersonAvatar name={item.assigned_to_name} size={16} />
                        <span style={{ fontSize: 10, color: 'var(--fg-1)', fontWeight: 500, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{item.assigned_to_name.split(' ')[0]}</span>
                      </div>
                    ) : <span style={{ color: 'var(--fg-4)', fontSize: 10, fontStyle: 'italic' }}>Unassigned</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </WidgetCard>
  );
}
