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
  const slug = slugify(name);

  return (
    <div className="r3-profile-card">
      {/* Top row: avatar + name + KPIs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Avatar with fallback */}
          <div style={{ position: 'relative' }}>
            <img
              className="r3-avatar"
              src={`/admin/users/${slug}/avatar`}
              alt={name}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement)?.setAttribute('style', 'display:flex');
              }}
            />
            <div className="r3-avatar-fallback" style={{ display: 'none' }}>
              {initials(name)}
            </div>
          </div>
          <div>
            <h2 className="r3-name">{name}</h2>
            <p className="r3-role">{role}</p>
          </div>
        </div>

        {/* KPI cards: Open + Stale */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="r3-kpi-card warn">
            <div className="r3-kpi-value">{kpis?.open_items ?? '—'}</div>
            <div className="r3-kpi-label">Open</div>
          </div>
          <div className="r3-kpi-card neutral">
            <div className="r3-kpi-value">{kpis?.stale_items ?? '—'}</div>
            <div className="r3-kpi-label">Stale</div>
          </div>
        </div>
      </div>

      {/* Bottom bar: Tabs + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(tab => (
            <button
              key={tab}
              className={`r3-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => onTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="r3-btn-outline">Q1-2026</button>
          <button className="r3-btn-intel">
            <Sparkles size={14} />
            Intelligence
          </button>
        </div>
      </div>
    </div>
  );
};
