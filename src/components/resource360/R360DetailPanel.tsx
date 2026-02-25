import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { getJiraIcon } from './R360JiraIcons';
import { resolveStatusStyle, getAgeColor, getAgeLabel, initials } from './r360-helpers';

interface Props {
  item: any;
  siblings: any[];
  onClose: () => void;
  onSiblingClick: (item: any) => void;
}

export const R360DetailPanel: React.FC<Props> = ({ item, siblings, onClose, onSiblingClick }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Reset scroll on item change
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [item?.id]);

  if (!item) return null;

  const ss = resolveStatusStyle(item);
  const ageDays = item.age_days ?? 0;
  const daysBarColor = ageDays <= 7 ? '#16A34A' : ageDays <= 14 ? '#D97706' : '#EF4444';
  const daysBarPct = Math.min(ageDays / 21 * 100, 100);
  const doneSiblings = siblings.filter(s => {
    const sc = (s.status_category || s.status || '').toLowerCase();
    return sc.includes('done') || sc.includes('closed') || sc.includes('complete') || sc.includes('resolved');
  }).length;
  const statusLabel = item.status_name || item.status || 'Unknown';

  return (
    <>
      <div className="r3-panel-overlay" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="r3-detail-panel"
        style={{ animation: 'r3SlideIn 250ms cubic-bezier(.32,.72,0,1) forwards' }}
        role="dialog"
        aria-modal="true"
        aria-label={`Detail panel for ${item.item_key}`}
      >
        {/* Header */}
        <div className="r3-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="r3-item-key" style={{ fontSize: 14, fontWeight: 700 }}>{item.item_key}</span>
            <button
              onClick={onClose}
              aria-label="Close detail panel"
              className="r3-panel-close-btn"
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <span className="r3-status-pill" style={{ background: ss.bg, color: ss.text, border: 'none' }}>
              <span className="r3-status-dot" style={{ background: ss.dot, width: 6, height: 6, borderRadius: '50%' }} />
              {statusLabel}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: '#F8FAFC', color: '#334155', textTransform: 'capitalize' }}>
              {item.priority || '—'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: '#F8FAFC', color: '#334155' }}>
              {getJiraIcon(item.item_type)}
              <span style={{ textTransform: 'uppercase' }}>{item.item_type || '—'}</span>
            </span>
            {item.project_key && (
              <span className="r3-project-tag" style={{ background: item.project_color || '#64748B' }}>
                {item.project_key}
              </span>
            )}
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#020617', margin: 0 }}>{item.title}</h3>
        </div>

        <div style={{ padding: 20 }}>
          {/* Meta Grid 2×3 */}
          <div className="r3-meta-grid" style={{ marginBottom: 20 }}>
            <div className="r3-meta-cell">
              <div className="r3-meta-cell-label">Project</div>
              <div className="r3-meta-cell-value">{item.project_name || '—'}</div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-cell-label">Assigner</div>
              <div className="r3-meta-cell-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {item.assigner_name ? (
                  <>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#334155' }}>
                      {initials(item.assigner_name)}
                    </div>
                    {item.assigner_name}
                  </>
                ) : <span style={{ color: '#94A3B8' }}>Unassigned</span>}
              </div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-cell-label">Assigned</div>
              <div className="r3-meta-cell-value">{getAgeLabel(ageDays)}</div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-cell-label">Days Sitting</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: daysBarColor }}>{ageDays}</span>
                  <div style={{ width: 60, height: 4, borderRadius: 2, background: '#F1F5F9', overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle' }}>
                    <div style={{ width: `${daysBarPct}%`, height: '100%', borderRadius: 2, background: daysBarColor, minWidth: daysBarPct > 0 ? 2 : 0 }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-cell-label">Release</div>
              <div className="r3-meta-cell-value" style={{ wordBreak: 'break-word', lineHeight: 1.35 }}>
                {item.release || item.release_name || (item.parent_key ? (
                  <span style={{ fontSize: 12, color: '#2563EB', cursor: 'pointer' }}>Inherited from {item.parent_key}</span>
                ) : <span style={{ color: '#94A3B8' }}>—</span>)}
              </div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-cell-label">Due</div>
              <div className="r3-meta-cell-value">
                {item.due_date || (item.parent_key ? (
                  <span style={{ fontSize: 12, color: '#2563EB', cursor: 'pointer' }}>Inherited from {item.parent_key}</span>
                ) : <span style={{ color: '#94A3B8' }}>—</span>)}
              </div>
            </div>
          </div>

          {/* Hierarchy */}
          {item.parent_key ? (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 8 }}>HIERARCHY</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="r3-hierarchy-item">
                  {getJiraIcon(item.parent_type || 'epic')}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, minWidth: 72 }}>{item.parent_key}</span>
                  <span style={{ fontSize: 12, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.parent_title}</span>
                </div>
                <div style={{ paddingLeft: 16, display: 'flex', alignItems: 'center', gap: 4, color: '#94A3B8', fontSize: 12 }}>↳</div>
                <div className="r3-hierarchy-item current" style={{ marginLeft: 16 }}>
                  {getJiraIcon(item.item_type)}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, minWidth: 72 }}>{item.item_key}</span>
                  <span style={{ fontSize: 13, color: '#020617', fontWeight: 500, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                    {item.title}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 8 }}>HIERARCHY</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>—</div>
            </div>
          )}

          {/* Siblings — only populated when parent is a Story (filtered at service layer) */}
          {siblings.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>SIBLINGS</span>
                <span style={{ fontSize: 11, color: '#64748B' }}>{doneSiblings}/{siblings.length} done</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 320, overflowY: 'auto' }} className="r3-siblings-list">
                {siblings.map(sib => {
                  const sibSs = resolveStatusStyle(sib);
                  const sibLabel = sib.status_name || sib.status || 'Unknown';
                  const isCurrent = sib.item_key === item.item_key;
                  return (
                    <div
                      key={sib.id || sib.item_key}
                      className={`r3-sibling-row ${isCurrent ? 'current' : ''}`}
                      onClick={() => !isCurrent && onSiblingClick(sib)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Sibling ${sib.item_key} ${sib.title}${isCurrent ? ' (current)' : ''}`}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !isCurrent) onSiblingClick(sib); }}
                    >
                      <span style={{ flexShrink: 0 }}>{getJiraIcon(sib.item_type || 'Task')}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 600, width: 72, flexShrink: 0 }}>
                        {sib.item_key}
                      </span>
                      <span className="r3-status-pill" style={{ background: sibSs.bg, color: sibSs.text, fontSize: 10, border: 'none' }}>
                        <span className="r3-status-dot" style={{ background: sibSs.dot, width: 6, height: 6, borderRadius: '50%' }} />
                        {sibLabel}
                      </span>
                      <span style={{ flex: 1, fontSize: 12, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sib.title}
                      </span>
                      <span className="r3-age-badge" style={{ color: getAgeColor(sib.age_days ?? 0) }}>{sib.age_days ?? 0}d</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
