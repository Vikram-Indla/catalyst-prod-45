import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getJiraIcon } from './R360JiraIcons';
import { resolveStatusStyle, getAgeColor, initials, groupByDate } from './r360-helpers';

interface Props {
  items: any[];
  onItemClick: (item: any) => void;
  memberName?: string;
}

export const R360ChronologyView: React.FC<Props> = ({ items, onItemClick, memberName }) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groups = groupByDate(items);

  const toggleGroup = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 4 }}>No work items found</div>
        <div style={{ fontSize: 13 }}>Items assigned to {memberName || 'this member'} will appear here.</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 32 }}>
      <div className="r3-timeline-line" />

      {Array.from(groups.entries()).map(([dateLabel, groupItems]) => {
        const isCollapsed = collapsed.has(dateLabel);
        const isToday = dateLabel.startsWith('Today');
        const isYesterday = dateLabel.startsWith('Yesterday');
        const doneCount = groupItems.filter((i: any) => i.status_category === 'completed').length;
        const progressCount = groupItems.filter((i: any) => i.status_category === 'started').length;
        const todoCount = groupItems.filter((i: any) => i.status_category === 'unstarted').length;
        const blockedCount = groupItems.filter((i: any) => i.status_category === 'blocked').length;
        const total = groupItems.length;
        const itemLabel = total === 1 ? '1 item' : `${total} items`;

        return (
          <div key={dateLabel} style={{ marginBottom: 20 }} role="group" aria-expanded={!isCollapsed} aria-label={`${dateLabel} — ${itemLabel}`}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginLeft: -32, paddingLeft: 10, marginBottom: 10 }}
              onClick={() => toggleGroup(dateLabel)}
              role="button"
              tabIndex={0}
              aria-label={`Toggle ${dateLabel} group`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(dateLabel); } }}
            >
              <div className={`r3-date-dot ${isToday ? 'today' : isYesterday ? 'yesterday' : ''}`} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#020617' }}>{dateLabel}</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: 6 }}>
                {total}
              </span>
              <div className="r3-mini-bar" style={{ width: 60 }}>
                {doneCount > 0 && <div style={{ width: `${(doneCount/total)*100}%`, background: '#16A34A' }} />}
                {progressCount > 0 && <div style={{ width: `${(progressCount/total)*100}%`, background: '#2563EB' }} />}
                {todoCount > 0 && <div style={{ width: `${(todoCount/total)*100}%`, background: '#D97706' }} />}
                {blockedCount > 0 && <div style={{ width: `${(blockedCount/total)*100}%`, background: '#EF4444' }} />}
              </div>
              <span style={{ transition: 'transform 200ms', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-flex' }}>
                <ChevronDown size={14} color="#94A3B8" />
              </span>
            </div>

            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {groupItems.map((item: any) => {
                  const ss = resolveStatusStyle(item);
                  const ageColor = getAgeColor(item.age_days ?? 0);
                  return (
                    <div
                      key={item.id}
                      className="r3-chrono-card"
                      onClick={() => onItemClick(item)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${item.item_key} ${item.title} — ${item.status_name}`}
                      onKeyDown={(e) => { if (e.key === 'Enter') onItemClick(item); }}
                    >
                      <div className="r3-accent-bar" style={{ background: ss.dot }} />
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flexShrink: 0, marginTop: 2 }}>{getJiraIcon(item.item_type)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className="r3-item-key">{item.item_key}</span>
                            {item.project_key && (
                              <span className="r3-project-tag" style={{ background: item.project_color || '#64748B' }}>
                                {item.project_key}
                              </span>
                            )}
                          </div>
                          <div className="r3-title-clamp" style={{ fontSize: 13.5, fontWeight: 500, color: '#020617', marginTop: 4 }}>
                            {item.title}
                          </div>
                          {item.parent_key && (
                            <div className="r3-parent-ref">
                              <span>↳</span>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#2563EB' }}>{item.parent_key}</span>
                              <span style={{ color: '#94A3B8' }}>·</span>
                              <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.parent_title}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#334155' }}>
                              {initials(item.assigner_name)}
                            </div>
                            <span style={{ fontSize: 11, color: '#64748B' }}>
                              {item.assigner_name ? item.assigner_name.split(' ')[0] : 'Unassigned'}
                            </span>
                          </div>
                          <span className="r3-status-pill" style={{ background: ss.bg, color: ss.text }}>
                            <span className="r3-status-dot" style={{ background: ss.dot }} />
                            {item.status_name}
                          </span>
                          <span className="r3-age-badge" style={{ color: ageColor }}>
                            {item.age_days ?? 0}d
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
