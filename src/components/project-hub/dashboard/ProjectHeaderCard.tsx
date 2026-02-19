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
  active: { bg: '#F0FDFA', text: '#0D9488' },
  on_hold: { bg: '#FFFBEB', text: '#D97706' },
  completed: { bg: '#F0FDF4', text: '#16A34A' },
};

const HEALTH_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  green: { bg: '#F0FDF4', text: '#16A34A', label: 'On Track' },
  yellow: { bg: '#FFFBEB', text: '#D97706', label: 'At Risk' },
  red: { bg: '#FEF2F2', text: '#DC2626', label: 'Off Track' },
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
    <div
      className="rounded-xl"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ width: 36, height: 36, background: color }}
          >
            <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}>
              {projectKey.slice(0, 2)}
            </span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>
            {name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleStar}
            className="flex items-center justify-center rounded-md hover:bg-[#F8FAFC] transition-colors"
            style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <Star size={16} color={starred ? '#EAB308' : '#94A3B8'} fill={starred ? '#EAB308' : 'none'} strokeWidth={1.75} />
          </button>
          <button
            onClick={onSettings}
            className="flex items-center justify-center rounded-md hover:bg-[#F8FAFC] transition-colors"
            style={{
              height: 32, padding: '0 10px', gap: 6,
              border: '1px solid #E2E8F0', borderRadius: 6,
              background: '#FFFFFF', cursor: 'pointer',
              fontSize: 12, fontWeight: 500, color: '#334155',
              fontFamily: "'Inter', sans-serif",
              display: 'inline-flex', alignItems: 'center',
            }}
          >
            <Settings size={14} color="#64748B" strokeWidth={1.75} /> Settings
          </button>
          <button
            className="flex items-center justify-center rounded-md hover:bg-[#F8FAFC] transition-colors"
            style={{ width: 32, height: 32, border: '1px solid #E2E8F0', borderRadius: 6, background: '#FFFFFF', cursor: 'pointer' }}
          >
            <MoreHorizontal size={16} color="#64748B" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <span
          className="inline-flex items-center rounded-full"
          style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', background: sSt.bg, color: sSt.text }}
        >
          {status === 'on_hold' ? 'On Hold' : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        <span
          className="inline-flex items-center rounded-full"
          style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', background: hSt.bg, color: hSt.text }}
        >
          {hSt.label}
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12, color: '#64748B' }}>
          <Users size={13} color="#94A3B8" strokeWidth={1.75} /> {memberCount} members
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12, color: '#64748B' }}>
          <Calendar size={13} color="#94A3B8" strokeWidth={1.75} /> {dateRange}
        </span>
      </div>

      {/* Progress */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-1.5">
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{clamped}% complete</span>
        </div>
        <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#E2E8F0' }}>
          <div
            style={{
              width: `${clamped}%`, height: '100%', borderRadius: 3,
              background: '#0D9488', transition: 'width 500ms ease',
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
          {doneCount} of {totalCount} items done · Est. completion: {estCompletion}
        </div>
      </div>
    </div>
  );
}
