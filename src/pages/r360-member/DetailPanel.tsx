/**
 * R360 Detail Panel
 * Extracted from R360MemberDetail.tsx
 */
import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useR360Siblings } from '@/hooks/useR360';
import { formatRelativeDate, formatDate, ageBarPercent, ageBarColor } from '@/utils/r360Utils';
import { getJiraIcon } from '@/components/r360/R360JiraIcons';
import type { R360WorkItem } from '@/types/r360';
import { StatusPill, ProjTag, AgeBadge, MiniAvatar } from './SmallComponents';

export function DetailPanel({ item, onClose, onSelectItem }: {
  item: R360WorkItem; onClose: () => void; onSelectItem: (i: R360WorkItem) => void;
}) {
  // Siblings are only valid when the parent is a Story.
  const { isDark } = useTheme();
  // In Jira hierarchy this maps to current item being a Sub-task.
  const normalizedItemType = (item.item_type || '').toLowerCase().replace(/[-_\s]/g, '');
  const canHaveStoryParent = normalizedItemType === 'subtask';

  const { data: siblings = [] } = useR360Siblings(canHaveStoryParent ? item.parent_key : null);
  const doneCount = siblings.filter((s: any) => s.status_category === 'done').length;

  return (
    <>
      <div className="r3-overlay" onClick={onClose} />
      <div className="r3-panel r3-panel--open">
        {/* Header */}
        <div className="r3-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="r3-card-key" style={{ fontSize: 14 }}>{item.item_key}</span>
            <button className="r3-panel-close" onClick={onClose}><X size={14} /></button>
          </div>
          <div className="r3-panel-pills">
            <StatusPill label={item.status_label} color={item.status_color} bg={item.status_bg} dot={item.status_dot} />
            <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9', color: 'var(--cp-text-secondary, #334155)' }}>{item.priority}</span>
            <span className="r3-type-badge">{getJiraIcon(item.item_type)} {item.item_type}</span>
            <ProjTag projectKey={item.project_key} />
            {item.role_on_item === 'Contributor' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: isDark ? 'rgba(124,58,237,0.12)' : '#F5F3FF', color: '#7C3AED', border: `1px solid ${isDark ? 'rgba(124,58,237,0.25)' : '#DDD6FE'}` }}>
                CONTRIBUTED TO <MiniAvatar name={item.assignee_name} size={16} />
              </span>
            )}
          </div>
          <div className="r3-panel-title">{item.title}</div>
        </div>

        {/* Body */}
        <div className="r3-panel-body">
          {/* Meta Grid */}
          <div className="r3-meta">
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Project</div>
              <div className="r3-meta-value">{item.project_name}</div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">{item.role_on_item === 'Contributor' ? 'Assigned To' : 'Assigner'}</div>
              <div className="r3-meta-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {item.role_on_item === 'Contributor' && <MiniAvatar name={item.assignee_name} size={18} />}
                {item.role_on_item === 'Contributor' ? (item.assignee_name || '\u2014') : (item.reporter_name || '\u2014')}
              </div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Assigned</div>
              <div className="r3-meta-value">{formatRelativeDate(item.created_at)}</div>
              <div style={{ fontSize: 11, color: 'var(--cp-text-secondary, #334155)' }}>{formatDate(item.created_at)}</div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Days Sitting</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`r3-age r3-age--${item.age_class}`} style={{ fontSize: 13, fontWeight: 600 }}>{item.age_days}</span>
                <div style={{ width: 60, height: 4, borderRadius: 4, background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9', overflow: 'hidden' }}>
                  <div style={{ width: `${ageBarPercent(item.age_days)}%`, height: '100%', background: ageBarColor(item.age_days), borderRadius: 2 }} />
                </div>
              </div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Release</div>
              <div className="r3-meta-value">
                {item.fix_version ? item.fix_version
                  : item.item_type === 'Sub-task' && item.parent_key ? <span style={{ color: '#2563EB', fontSize: 12 }}>Inherited from {item.parent_key}</span>
                  : '\u2014'}
              </div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Due</div>
              <div className="r3-meta-value">
                {item.due_date ? formatDate(item.due_date)
                  : item.item_type === 'Sub-task' && item.parent_key ? <span style={{ color: '#2563EB', fontSize: 12 }}>Inherited from {item.parent_key}</span>
                  : '\u2014'}
              </div>
            </div>
          </div>

          {/* Hierarchy */}
          {item.parent_key && (
            <div className="r3-hierarchy">
              <div className="r3-hierarchy-title">Hierarchy</div>
              <div className="r3-hier-item" style={{ padding: '6px 8px' }}>
                {getJiraIcon('Epic')}
                <span className="r3-card-key r3-card-key--sm">{item.parent_key}</span>
                <span style={{ fontSize: 12, color: 'var(--cp-text-secondary, #334155)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.parent_title}</span>
              </div>
              <div className="r3-hier-connector">{'\u21B3'}</div>
              <div className="r3-hier-item r3-hier-item--current">
                {getJiraIcon(item.item_type)}
                <span className="r3-card-key r3-card-key--sm">{item.item_key}</span>
                <span style={{ fontSize: 12, color: isDark ? '#EDEDED' : '#020617', fontWeight: 500 }}>{item.title}</span>
              </div>
            </div>
          )}

          {/* Siblings */}
          {canHaveStoryParent && item.parent_key && siblings.length > 0 && (
            <div className="r3-siblings">
              <div className="r3-siblings-header">
                <span className="r3-siblings-title">Siblings</span>
                <span className="r3-siblings-count">{doneCount}/{siblings.length} done</span>
              </div>

              {siblings.map((s: any) => (
                <div
                  key={s.id}
                  className={`r3-sibling-row ${s.item_key === item.item_key ? 'r3-sibling-row--current' : ''}`}
                  onClick={() => {
                    if (s.item_key !== item.item_key) {
                      // Create a minimal work item for navigation
                      onSelectItem({
                        ...item,
                        id: s.id,
                        item_key: s.item_key,
                        title: s.title,
                        status_label: s.status_label,
                        status_color: s.status_color,
                        status_bg: s.status_bg,
                        status_dot: s.status_dot,
                        status_category: s.status_category,
                        age_days: s.age_days,
                        age_class: s.age_class,
                      });
                    }
                  }}
                >
                  <span className="r3-card-key r3-card-key--sm" style={{ width: 72, flexShrink: 0 }}>{s.item_key}</span>
                  <StatusPill label={s.status_label} color={s.status_color} bg={s.status_bg} dot={s.status_dot} />
                  <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.title}</span>
                  <AgeBadge days={s.age_days} ageClass={s.age_class} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
