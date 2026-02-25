import React from 'react';
import { getJiraIcon } from './R360JiraIcons';
import { resolveStatusStyle, getAgeColor, getPriorityColor, initials } from './r360-helpers';

interface Props {
  items: any[];
  onItemClick: (item: any) => void;
}

const COLUMNS = [
  { key: 'unstarted', label: 'To Do', color: '#D97706' },
  { key: 'started', label: 'In Progress', color: '#2563EB' },
  { key: 'completed', label: 'Done', color: '#16A34A' },
];

export const R360BoardView: React.FC<Props> = ({ items, onItemClick }) => {
  const grouped = {
    unstarted: items.filter(i => i.status_category === 'unstarted'),
    started: items.filter(i => i.status_category === 'started'),
    completed: items.filter(i => i.status_category === 'completed'),
  };

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 4 }}>No active work items this week</div>
        <div style={{ fontSize: 13 }}>Try adjusting filters or navigating to a different week.</div>
      </div>
    );
  }

  return (
    <div className="r3-board-grid">
      {COLUMNS.map(col => {
        const colItems = grouped[col.key as keyof typeof grouped] || [];
        return (
          <div key={col.key}>
            <div className="r3-board-col-header" style={{ borderBottom: `2px solid ${col.color}` }}>
              <div className="r3-board-col-dot" style={{ background: col.color }} />
              <span className="r3-board-col-title">{col.label}</span>
              <div className="r3-board-col-count" style={{ background: col.color }}>{colItems.length}</div>
            </div>
            <div>
              {colItems.map(item => {
                const ss = resolveStatusStyle(item);
                const ageColor = getAgeColor(item.age_days);
                const priColor = getPriorityColor(item.priority);
                return (
                  <div key={item.id} className="r3-board-card" onClick={() => onItemClick(item)}>
                    <div className="r3-accent-bar" style={{ background: ss.dot }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span className="r3-item-key">{item.item_key}</span>
                      <span className="r3-project-tag" style={{ background: item.project_color || '#64748B' }}>
                        {item.project_key}
                      </span>
                      <span className="r3-age-badge" style={{ color: ageColor, marginLeft: 'auto' }}>{item.age_days}d</span>
                    </div>
                    <div className="r3-title-clamp" style={{ fontSize: 13.5, fontWeight: 500, color: '#020617', marginBottom: 8 }}>
                      {item.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: priColor }} />
                        <span style={{ fontSize: 11, fontWeight: 500, color: priColor, textTransform: 'capitalize' }}>{item.priority}</span>
                      </div>
                      {item.assigner_name && (
                        <span style={{ fontSize: 11, color: '#64748B' }}>{item.assigner_name?.split(' ')[0]}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
