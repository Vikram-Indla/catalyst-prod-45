import React from 'react';
import { Sparkles } from 'lucide-react';
import { slugify, initials } from './r360-helpers';

interface Props {
  member: any;
  kpis: any;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = ['Ring', 'Chronology', 'Board'];

export const R360ProfileHeader: React.FC<Props> = ({ member, kpis, activeTab, onTabChange }) => {
  const name = member?.full_name || 'Unknown';
  const role = member?.role || 'Team Member';
  const dept = member?.department;
  const slug = slugify(name);

  return (
    <div className="r3-profile-card" role="banner">
      {/* Top row: avatar + name + KPIs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          {/* Avatar with fallback */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {member?.avatar_url ? (
              <img
                className="r3-avatar"
                src={member.avatar_url}
                alt={name}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  (e.currentTarget.nextElementSibling as HTMLElement)?.setAttribute('style', 'display:flex');
                }}
              />
            ) : null}
            <div className="r3-avatar-fallback" style={{ display: member?.avatar_url ? 'none' : 'flex' }}>
              {initials(name)}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 className="r3-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{name}</h2>
            <p className="r3-role">{role}{dept ? ` · ${dept}` : ''}</p>
          </div>
        </div>

        {/* KPI cards: Open + Stale */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <div className="r3-kpi-card warn" role="status" aria-label={`Open items: ${kpis?.open_items ?? 0}`}>
            <div className="r3-kpi-value">{kpis?.open_items ?? 0}</div>
            <div className="r3-kpi-label">Open</div>
          </div>
          <div className="r3-kpi-card neutral" role="status" aria-label={`Stale items: ${kpis?.stale_items ?? 0}`}>
            <div className="r3-kpi-value">{kpis?.stale_items ?? 0}</div>
            <div className="r3-kpi-label">Stale</div>
          </div>
        </div>
      </div>

      {/* Bottom bar: Tabs + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid #1A1A1A' }}>
        <div style={{ display: 'flex', gap: 4 }} role="tablist" aria-label="View mode">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`r3-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => onTabChange(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              aria-label={`${tab} view`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="r3-btn-outline" aria-label="Quarter filter">Q1-2026</button>
          <button className="r3-btn-intel" aria-label="Open Intelligence panel">
            <Sparkles size={14} />
            Intelligence
          </button>
        </div>
      </div>
    </div>
  );
};
