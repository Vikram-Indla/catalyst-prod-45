/**
 * Cards View — Grid card layout for releases
 * Extracted from AllReleasesPage.tsx
 */

import { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import {
  ViewRelease,
  getHealthLabel,
  getHealthDisplay,
  getHealthColor,
  StatusPill,
} from './ReleaseTableView';

const HEALTH_BADGE: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' },
  'at-risk': { bg: 'rgba(217,119,6,0.1)', text: '#d97706' },
  attention: { bg: 'rgba(37,99,235,0.1)', text: '#2563eb' },
  healthy: { bg: 'rgba(13,148,136,0.1)', text: '#0d9488' },
};

interface CardsViewProps {
  releases: ViewRelease[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onCardClick: (r: ViewRelease) => void;
}

export function CardsView({ releases, selectedIds, onToggle, onCardClick }: CardsViewProps) {
  return (
    <div style={{ padding: '16px 0', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="max-[1199px]:!grid-cols-2 max-[767px]:!grid-cols-1">
        {releases.map((r, i) => {
          const selected = selectedIds.has(r.id);
          const hl = getHealthLabel(r.health);
          const hBadge = HEALTH_BADGE[hl] || HEALTH_BADGE.critical;
          return (
            <div
              key={r.id}
              onClick={() => onCardClick(r)}
              className="group cursor-pointer transition-all relative"
              style={{
                background: selected ? '#eff6ff' : '#fff',
                border: `1px solid ${selected ? '#2563eb' : '#e2e8f0'}`,
                borderRadius: '8px', padding: '16px',
                animation: `fadeInUp 0.3s ease both`,
                animationDelay: `${i * 30}ms`,
              }}
              onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; } }}
              onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; } }}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={e => { e.stopPropagation(); onToggle(r.id); }}
                onClick={e => e.stopPropagation()}
                className="absolute transition-opacity"
                style={{ top: '12px', left: '12px', opacity: selected ? 1 : 0, cursor: 'pointer', accentColor: '#2563eb' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.opacity = '0'; }}
              />
              <div className="flex items-center gap-1.5 mb-2">
                <span style={{ padding: '1px 6px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{r.version}</span>
                <span className="flex-1 truncate" style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{r.name}</span>
                <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: hBadge.bg, color: hBadge.text, flexShrink: 0 }}>
                  {getHealthDisplay(r.health)}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div style={{ flex: 1, height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${r.health}%`, height: '100%', background: getHealthColor(r.health), borderRadius: '4px', transition: 'width 400ms ease-out' }} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>{r.health}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '12px' }}>
                <StatusPill status={r.status} />
                <span style={{ color: '#64748b' }}><Calendar className="w-3 h-3 inline-block mr-0.5" style={{ verticalAlign: 'middle' }} /> {r.targetDate}</span>
                {r.overdue && (
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', padding: '1px 6px' }}>
                    {r.daysRemaining}d overdue
                  </span>
                )}
                {r.owner === 'Unassigned' ? (
                  <div className="ml-auto flex items-center gap-1" style={{ color: '#94a3b8' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus className="w-2.5 h-2.5" style={{ color: '#94a3b8' }} />
                    </div>
                  </div>
                ) : (
                  <span className="ml-auto" style={{ color: '#334155', fontSize: '12px' }}>{r.owner}</span>
                )}
              </div>
              <div className="flex items-center gap-4" style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '8px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{r.testsPass}/{r.testsTotal}</span> Tests
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  <span style={{ fontWeight: 600, color: r.defects > 0 ? '#ef4444' : '#64748b' }}>{r.defects}</span> Defects
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {r.coverage !== null ? (
                    <span className="inline-flex items-center gap-1">
                      <span style={{ display: 'inline-block', width: '32px', height: '3px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', verticalAlign: 'middle' }}>
                        <span style={{ display: 'block', width: `${r.coverage}%`, height: '100%', background: r.coverage <= 30 ? '#ef4444' : r.coverage <= 60 ? '#d97706' : '#0d9488', borderRadius: '4px' }} />
                      </span>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{r.coverage}%</span>
                    </span>
                  ) : (
                    <span style={{ fontWeight: 600, color: '#94a3b8' }}>—</span>
                  )} Coverage
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
