/**
 * R360 Board View
 * Extracted from R360MemberDetail.tsx
 */
import React, { useMemo, useRef } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { getJiraIcon } from '@/components/r360/R360JiraIcons';
import type { R360WorkItem } from '@/types/r360';
import { priorityDotColor, priorityBorderColor, getFromTagClass, getFromTagPrefix } from './helpers';
import { StatusLozenge } from './StatusLozenge';
import { ProjTag, AgeBadge, MiniAvatar, CompletedSummaryBar } from './SmallComponents';

export function BoardView({ items, onSelect }: { items: R360WorkItem[]; onSelect: (i: R360WorkItem) => void }) {
  const { isDark } = useTheme();
  const doneColRef = useRef<HTMLDivElement>(null);
  const columns = useMemo(() => [
    { key: 'to_do', label: 'TO DO', color: '#D97706', items: items.filter(i => i.status_category === 'to_do' || i.status_category === 'blocked') },
    { key: 'in_progress', label: 'IN PROGRESS', color: '#2563EB', items: items.filter(i => i.status_category === 'in_progress' || i.status_category === 'in_qa') },
    { key: 'done', label: 'DONE', color: '#16A34A', items: items.filter(i => i.status_category === 'done') },
  ], [items]);

  return (
    <div>
      {/* D-13: Green completed summary bar */}
      <CompletedSummaryBar
        items={items}
        testId="r360-board-completed-bar"
        onViewClick={() => {
          const doneItem = items.find(i => i.status_category === 'done');
          if (doneItem) onSelect(doneItem);
        }}
      />
      <div className="r3-board">
        {columns.map(col => (
          <div key={col.key} ref={col.key === 'done' ? doneColRef : undefined}>
            <div className="r3-board-col-header" style={{ borderBottom: `2px solid ${col.color}` }}>
              <span className="r3-board-col-dot" style={{ background: col.color }} />
              <span className="r3-board-col-title">{col.label}</span>
              <span className="r3-board-col-count" style={{ background: col.color }}>{col.items.length}</span>
            </div>
            <div className="r3-board-cards">
              {col.items.map(item => {
                const fromClass = getFromTagClass(item.age_days);
                return (
                  <div key={item.id} className="r3-board-card" onClick={() => onSelect(item)}>
                    <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 2px 2px 0', background: item.role_on_item === 'Contributor' ? '#7C3AED' : priorityBorderColor(item.priority) }} />
                    {/* Row 1: Type icon + key + project badge + age */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      {getJiraIcon(item.item_type)}
                      <span className="r3-card-key">{item.item_key}</span>
                      <ProjTag projectKey={item.project_key} />
                      {item.role_on_item === 'Contributor' && (
                        <MiniAvatar name={item.assignee_name} size={18} />
                      )}
                      <span style={{ marginLeft: 'auto' }}><AgeBadge days={item.age_days} ageClass={item.age_class} /></span>
                    </div>
                    {/* Row 2: Title */}
                    <div className="r3-card-title" style={{ fontSize: 13.5, marginBottom: 8 }}>{item.title}</div>
                    {/* Row 3: Priority + StatusLozenge + From tag */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="r3-priority-dot" style={{ background: priorityDotColor(item.priority) }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: isDark ? '#A1A1A1' : '#334155' }}>{item.priority}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StatusLozenge status={item.status} statusCategory={item.status_category} />
                        {item.carried_from_label && (
                          <span className={`r3-from-tag ${fromClass}`} style={{ fontSize: '10px' }}>
                            {getFromTagPrefix(item.age_days)}{item.carried_from_label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
