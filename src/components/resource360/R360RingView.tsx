import React from 'react';
import { getJiraIcon } from './R360JiraIcons';
import { resolveStatusStyle, getAgeColor, getAgeLabel, slugify, initials } from './r360-helpers';

interface Props {
  member: any;
  items: any[];
  doneCount: number;
  onItemClick: (item: any) => void;
}

const SPOTS = [
  { left: '5%', top: '8%' },
  { left: '38%', top: '2%' },
  { left: '72%', top: '8%' },
  { left: '78%', top: '40%' },
  { left: '72%', top: '72%' },
  { left: '38%', top: '82%' },
  { left: '5%', top: '72%' },
  { left: '0%', top: '40%' },
];

export const R360RingView: React.FC<Props> = ({ member, items, doneCount, onItemClick }) => {
  const activeItems = items.filter(i => i.status_category !== 'completed').slice(0, 8);
  const memberName = member?.full_name || 'Unknown';
  const memberRole = member?.role || '';
  const slug = slugify(memberName);

  if (activeItems.length === 0 && doneCount === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 4 }}>No active work items this week</div>
        <div style={{ fontSize: 13 }}>Try adjusting filters or navigating to a different week.</div>
      </div>
    );
  }

  return (
    <div className="r3-ring-canvas" style={{ height: 640 }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}>
        {activeItems.map((_, i) => {
          const spot = SPOTS[i];
          if (!spot) return null;
          return (
            <line
              key={i}
              x1="50%" y1="50%"
              x2={`${parseFloat(spot.left) + 10}%`} y2={`${parseFloat(spot.top) + 8}%`}
              stroke="#94A3B8" strokeWidth="2" strokeDasharray="8 5"
            />
          );
        })}
      </svg>

      {activeItems.map((item, i) => {
        const spot = SPOTS[i];
        if (!spot) return null;
        const midLeft = (50 + parseFloat(spot.left) + 10) / 2;
        const midTop = (50 + parseFloat(spot.top) + 8) / 2;
        return (
          <div
            key={`label-${i}`}
            className="r3-spoke-label"
            style={{ position: 'absolute', left: `${midLeft}%`, top: `${midTop}%`, transform: 'translate(-50%,-50%)' }}
          >
            {getAgeLabel(item.age_days)}
          </div>
        );
      })}

      <div className="r3-ring-center">
        <img
          className="r3-ring-avatar"
          src={`/admin/users/${slug}/avatar`}
          alt={memberName}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.nextElementSibling as HTMLElement)?.setAttribute('style', 'display:flex');
          }}
        />
        <div className="r3-ring-avatar-fb" style={{ display: 'none' }}>
          {initials(memberName)}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: '#020617' }}>{memberName}</div>
        <div style={{ fontSize: 11, color: '#64748B' }}>{memberRole}</div>
      </div>

      {activeItems.map((item, i) => {
        const spot = SPOTS[i];
        if (!spot) return null;
        const ss = resolveStatusStyle(item);
        const ageColor = getAgeColor(item.age_days);

        return (
          <div
            key={item.id}
            className="r3-ring-card"
            style={{ left: spot.left, top: spot.top }}
            onClick={() => onItemClick(item)}
          >
            <div className="r3-accent-bar" style={{ background: ss.dot }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {getJiraIcon(item.item_type)}
                <span style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'capitalize' }}>{item.priority}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="r3-item-key" style={{ fontSize: 11 }}>{item.item_key}</span>
              <span className="r3-project-tag" style={{ background: item.project_color || '#64748B', fontSize: 9 }}>
                {item.project_key}
              </span>
              <span className="r3-age-badge" style={{ color: ageColor, fontSize: 9 }}>{item.age_days}d</span>
            </div>
            <div className="r3-title-clamp" style={{ fontSize: 12.5, fontWeight: 500, color: '#020617', marginBottom: 6 }}>
              {item.title}
            </div>
            <span className="r3-status-pill" style={{ background: ss.bg, color: ss.text, fontSize: 10 }}>
              <span className="r3-status-dot" style={{ background: ss.dot }} />
              {item.status_name}
            </span>
          </div>
        );
      })}

      {doneCount > 0 && (
        <div className="r3-completed-badge">
          <div className="r3-completed-circle">{doneCount}</div>
          <div className="r3-completed-text">COMPLETED</div>
        </div>
      )}
    </div>
  );
};
