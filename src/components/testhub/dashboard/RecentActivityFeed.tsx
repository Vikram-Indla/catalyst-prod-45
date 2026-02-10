/**
 * RecentActivityFeed — G5-05
 * Shows latest test executions with status icons and time ago
 */

import { useNavigate } from 'react-router-dom';
import { Activity, CheckCircle2, XCircle, AlertTriangle, Clock, SkipForward } from 'lucide-react';
import { formatTimeAbbreviated } from '@/lib/formatTimeAgo';

export interface RecentActivity {
  id: string;
  execution_status: string;
  executed_at: string;
  case_key: string;
  title: string;
  cycle_key: string;
  cycle_id: string;
  executed_by_name: string;
}

interface Props {
  activities: RecentActivity[];
}

const STATUS_CFG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  passed:  { icon: CheckCircle2,  color: '#10B981', bg: '#ECFDF5' },
  failed:  { icon: XCircle,       color: '#EF4444', bg: '#FEF2F2' },
  blocked: { icon: AlertTriangle, color: '#F59E0B', bg: '#FFFBEB' },
  skipped: { icon: SkipForward,   color: '#64748B', bg: '#F1F5F9' },
  not_run: { icon: Clock,         color: '#94A3B8', bg: '#F8FAFC' },
};

export function RecentActivityFeed({ activities }: Props) {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 24, minHeight: 260 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'hsl(250 91% 96%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={18} color="#7C3AED" />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>Recent Activity</p>
          <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: 0 }}>Latest test executions</p>
        </div>
      </div>

      {activities.length > 0 ? (
        <div>
          {activities.map((a, i) => {
            const cfg = STATUS_CFG[a.execution_status] || STATUS_CFG.not_run;
            const Icon = cfg.icon;
            return (
              <div
                key={a.id}
                onClick={() => navigate(`/testhub/test-cycles/${a.cycle_id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < activities.length - 1 ? '1px solid hsl(var(--border))' : 'none', cursor: 'pointer' }}
              >
                <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={14} color={cfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB' }}>{a.case_key}</span>
                    <span style={{ fontSize: 13, color: 'hsl(var(--foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: '2px 0 0' }}>{a.cycle_key} · {a.executed_by_name}</p>
                </div>
                <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {formatTimeAbbreviated(a.executed_at)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))' }}>
          <div style={{ textAlign: 'center' }}>
            <Activity size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No recent activity</p>
            <p style={{ fontSize: 12, margin: '4px 0 0' }}>Execute tests to see activity here</p>
          </div>
        </div>
      )}
    </div>
  );
}
