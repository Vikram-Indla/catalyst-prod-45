import { Star, Settings, MoreHorizontal, Users, Calendar } from 'lucide-react';

interface ProjectHeaderCardProps {
  name: string;
  icon: string;
  color: string;
  projectKey: string;
  status: string;
  health: string;
  memberCount: number;
  dateRange: string;
  progress: number;
  doneCount: number;
  totalCount: number;
  estCompletion: string;
  starred: boolean;
  onToggleStar?: () => void;
  onSettings?: () => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: '#F0FDFA', text: 'var(--sem-success)' },
  on_hold: { bg: 'var(--sem-warning-bg)', text: 'var(--sem-warning)' },
  completed: { bg: 'var(--sem-success-bg)', text: 'var(--sem-success)' },
};

const HEALTH_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  green: { bg: 'var(--sem-success-bg)', text: 'var(--sem-success)', label: 'On Track' },
  yellow: { bg: 'var(--sem-warning-bg)', text: 'var(--sem-warning)', label: 'At Risk' },
  red: { bg: 'var(--sem-danger-bg)', text: 'var(--sem-danger)', label: 'Off Track' },
};

export function ProjectHeaderCard({
  name, color, projectKey, status, health,
  memberCount, dateRange, progress, doneCount, totalCount,
  estCompletion, starred, onToggleStar, onSettings,
}: ProjectHeaderCardProps) {
  const sSt = STATUS_STYLES[status] || STATUS_STYLES.active;
  const hSt = HEALTH_STYLES[health] || HEALTH_STYLES.green;
  const clamped = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="ph-card">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ width: 36, height: 36, background: color }}
          >
            <span style={{ color: 'var(--bg-app)', fontSize: 14, fontWeight: 700 }}>
              {projectKey.slice(0, 2)}
            </span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1)', fontFamily: "'Sora', sans-serif" }}>
            {name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleStar}
            className="flex items-center justify-center rounded-md hover:bg-[#F8FAFC] transition-colors"
            style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <Star size={16} color={starred ? 'var(--sem-star)' : 'var(--fg-4)'} fill={starred ? 'var(--sem-star)' : 'none'} strokeWidth={1.75} />
          </button>
          <button
            onClick={onSettings}
            className="flex items-center justify-center rounded-md transition-all bg-[var(--bg-app)] dark:bg-[#0A0A0A]"
            style={{
              height: 32, padding: '0 10px', gap: 6,
              border: '1px solid var(--divider)', borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12, fontWeight: 500, color: 'var(--fg-2)',
              fontFamily: "'Inter', sans-serif",
              display: 'inline-flex', alignItems: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-1)'; e.currentTarget.style.borderColor = 'var(--divider)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; e.currentTarget.style.borderColor = 'var(--divider)'; }}
          >
            <Settings size={14} color="var(--fg-3)" strokeWidth={1.75} /> Settings
          </button>
          <button
            className="flex items-center justify-center rounded-md transition-all bg-[var(--bg-app)] dark:bg-[#0A0A0A]"
            style={{ width: 32, height: 32, border: '1px solid var(--divider)', borderRadius: 6, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; }}
          >
            <MoreHorizontal size={16} color="var(--fg-3)" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <span className="inline-flex items-center rounded-full" style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', background: sSt.bg, color: sSt.text }}>
          {status === 'on_hold' ? 'On Hold' : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        <span className="inline-flex items-center rounded-full" style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', background: hSt.bg, color: hSt.text }}>
          {hSt.label}
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--fg-3)' }}>
          <Users size={13} color="var(--fg-4)" strokeWidth={1.75} /> {memberCount} members
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--fg-3)' }}>
          <Calendar size={13} color="var(--fg-4)" strokeWidth={1.75} /> {dateRange}
        </span>
      </div>

      {/* Progress */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-1.5">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>{clamped}% complete</span>
        </div>
        <div className="bg-[var(--bg-3)]" style={{ width: '100%', height: 6, borderRadius: 3 }}>
          <div className="bg-[var(--sem-success)]" style={{ width: `${clamped}%`, height: '100%', borderRadius: 4, transition: 'width 500ms ease' }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 6 }}>
          {doneCount} of {totalCount} items done · Est. completion: {estCompletion}
        </div>
      </div>
    </div>
  );
}
