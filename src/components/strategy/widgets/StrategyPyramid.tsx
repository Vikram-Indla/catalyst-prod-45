/**
 * StrategyPyramid — Widget 1: Interactive SVG pyramid + label cards
 * Row 1, span 6
 */

import { useState } from 'react';
import { Drawer } from '../shared/Drawer';
import { KrListItem } from '../shared/KrListItem';
import { SectionTitle } from '../shared/SectionTitle';
import { ProgressBar } from '../shared/ProgressBar';

interface LayerData {
  key: string;
  label: string;
  description: string;
  color: string;
  letter: string;
  count?: number;
  points: string;
}

const LAYERS: LayerData[] = [
  { key: 'mission', label: 'Mission', description: "Transform SA's Industrial Sector into a Global Leader", color: '#1D4ED8', letter: 'M', points: '100,0 120,56 80,56' },
  { key: 'vision', label: 'Vision', description: 'Top-10 Global Manufacturing Hub by 2030', color: '#2563EB', letter: 'V', points: '80,56 120,56 140,112 60,112' },
  { key: 'themes', label: 'Strategic Themes', description: 'Digital · Workforce · Supply Chain · ESG', color: '#0D9488', letter: 'S', count: 4, points: '60,112 140,112 160,168 40,168' },
  { key: 'goals', label: 'Goals', description: '3 per theme · owner-assigned · quarterly cadence', color: '#D97706', letter: 'G', count: 12, points: '40,168 160,168 180,224 20,224' },
  { key: 'krs', label: 'Key Results', description: 'Measurable outcomes · progress-tracked', color: '#16A34A', letter: 'K', count: 32, points: '20,224 180,224 200,280 0,280' },
];

const SEPARATORS = [
  { y: 56, x1: 80, x2: 120 },
  { y: 112, x1: 60, x2: 140 },
  { y: 168, x1: 40, x2: 160 },
  { y: 224, x1: 20, x2: 180 },
];

// Centroids for each layer letter
const LETTER_POS: Record<string, { x: number; y: number }> = {
  mission: { x: 100, y: 30 },
  vision: { x: 100, y: 84 },
  themes: { x: 100, y: 140 },
  goals: { x: 100, y: 196 },
  krs: { x: 100, y: 252 },
};

export function StrategyPyramid() {
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLayer, setDrawerLayer] = useState<string | null>(null);

  const openDrawer = (key: string) => {
    setDrawerLayer(key);
    setDrawerOpen(true);
  };

  const renderDrawerContent = () => {
    switch (drawerLayer) {
      case 'mission':
        return (
          <div>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--catalyst-text-primary)', marginBottom: 12 }}>
              Transform SA's Industrial Sector into a Global Leader
            </p>
            <p style={{ fontSize: 13, color: 'var(--catalyst-text-secondary)', lineHeight: 1.7 }}>
              Drive the transformation of Saudi Arabia's industrial sector through strategic initiatives
              spanning digital innovation, workforce development, supply chain optimization, and
              sustainable practices aligned with Vision 2030.
            </p>
          </div>
        );
      case 'vision':
        return (
          <div>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--catalyst-text-primary)', marginBottom: 16 }}>
              Top-10 Global Manufacturing Hub by 2030
            </p>
            <SectionTitle title="Progress Indicators" />
            <KrListItem status="on_track" title="Manufacturing GDP Share" meta="Target: 20% · Current: 16.2%" progress={81} />
            <KrListItem status="at_risk" title="Global Ranking" meta="Target: Top 10 · Current: #15" progress={65} />
            <KrListItem status="on_track" title="Foreign Direct Investment" meta="Target: $20B · Current: $15.8B" progress={79} />
          </div>
        );
      case 'themes':
        return (
          <div>
            <SectionTitle title="Strategic Themes (4)" />
            {[
              { name: 'Digital Transformation', color: '#2563EB', goals: 3, krs: 8, budget: '840M', progress: 75, status: 'at_risk' as const },
              { name: 'Workforce Development', color: '#0D9488', goals: 3, krs: 8, budget: '600M', progress: 83, status: 'on_track' as const },
              { name: 'Supply Chain Excellence', color: '#D97706', goals: 3, krs: 8, budget: '576M', progress: 58, status: 'off_track' as const },
              { name: 'Sustainability & ESG', color: '#16A34A', goals: 3, krs: 8, budget: '384M', progress: 77, status: 'at_risk' as const },
            ].map(t => (
              <div key={t.name} style={{ padding: '12px 0', borderBottom: '1px solid var(--catalyst-border-default, #E2E8F0)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--catalyst-text-primary)' }}>{t.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: t.progress >= 70 ? '#0D9488' : t.progress >= 50 ? '#D97706' : '#EF4444' }}>{t.progress}%</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--catalyst-text-tertiary)', marginBottom: 6, paddingLeft: 16 }}>
                  {t.goals} Goals · {t.krs} KRs · Budget: SAR {t.budget}
                </div>
                <div style={{ paddingLeft: 16 }}>
                  <ProgressBar value={t.progress} height={4} />
                </div>
              </div>
            ))}
          </div>
        );
      case 'goals':
        return (
          <div>
            {[
              { theme: 'Digital Transformation', color: '#2563EB', goals: [
                { name: 'Digitize 80% of permits', owner: 'Ahmed H.', progress: 82 },
                { name: 'Launch AI analytics platform', owner: 'Sara R.', progress: 65 },
                { name: 'Integrate 5 ministry systems', owner: 'Khalid O.', progress: 78 },
              ]},
              { theme: 'Workforce Development', color: '#0D9488', goals: [
                { name: 'Train 10K engineers', owner: 'Mohammed K.', progress: 91 },
                { name: 'Saudization rate → 45%', owner: 'Fatima N.', progress: 85 },
                { name: 'STEM scholarship pipeline', owner: 'Sara R.', progress: 72 },
              ]},
            ].map(group => (
              <div key={group.theme} style={{ marginBottom: 16 }}>
                <SectionTitle title={group.theme} />
                {group.goals.map(g => (
                  <KrListItem
                    key={g.name}
                    status={g.progress >= 70 ? 'on_track' : g.progress >= 50 ? 'at_risk' : 'off_track'}
                    title={g.name}
                    meta={`Owner: ${g.owner}`}
                    progress={g.progress}
                  />
                ))}
              </div>
            ))}
          </div>
        );
      case 'krs':
        return (
          <div>
            <SectionTitle title="Sample Key Results" />
            <KrListItem status="on_track" title="Process 50K permits digitally by Q3" meta="Target: 50,000 · Current: 41,000" progress={82} />
            <KrListItem status="at_risk" title="Deploy ML models to 3 ministries" meta="Target: 3 · Current: 2" progress={67} />
            <KrListItem status="on_track" title="Achieve 98% system uptime" meta="Target: 98% · Current: 99.2%" progress={100} />
            <KrListItem status="off_track" title="3 new logistics hubs operational" meta="Target: 3 · Current: 1" progress={33} />
          </div>
        );
      default:
        return null;
    }
  };

  const drawerTitle = drawerLayer ? LAYERS.find(l => l.key === drawerLayer)?.label || '' : '';

  return (
    <>
      <div className="flex gap-4" style={{ minHeight: 280 }}>
        {/* SVG Pyramid */}
        <div style={{ width: 180, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 200 280" width="180" height="280" aria-hidden="true">
            {LAYERS.map(layer => (
              <polygon
                key={layer.key}
                points={layer.points}
                fill={layer.color}
                opacity={hoveredLayer && hoveredLayer !== layer.key ? 0.4 : 1}
                style={{ cursor: 'pointer', transition: 'opacity 120ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                onMouseEnter={() => setHoveredLayer(layer.key)}
                onMouseLeave={() => setHoveredLayer(null)}
                onClick={() => openDrawer(layer.key)}
              />
            ))}
            {SEPARATORS.map((s, i) => (
              <line key={i} x1={s.x1} y1={s.y} x2={s.x2} y2={s.y} stroke="white" strokeWidth={1} style={{ pointerEvents: 'none' }} />
            ))}
            {LAYERS.map(layer => {
              const pos = LETTER_POS[layer.key];
              return (
                <text
                  key={layer.key + '-letter'}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  opacity={0.3}
                  style={{ fontSize: 24, fontWeight: 700, pointerEvents: 'none' }}
                >
                  {layer.letter}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Label Cards */}
        <div className="flex flex-col justify-center flex-1 gap-1">
          {LAYERS.map(layer => (
            <div
              key={layer.key}
              role="button"
              tabIndex={0}
              onClick={() => openDrawer(layer.key)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(layer.key); } }}
              onMouseEnter={() => setHoveredLayer(layer.key)}
              onMouseLeave={() => setHoveredLayer(null)}
              className="flex items-center gap-2"
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                background: hoveredLayer === layer.key ? 'var(--catalyst-bg-hover, #F8FAFC)' : 'transparent',
                transition: 'background 120ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div style={{ width: 3, height: 28, borderRadius: 2, background: layer.color, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--catalyst-text-primary)' }}>{layer.label}</div>
                <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {layer.description}
                </div>
              </div>
              {layer.count && (
                <span style={{
                  fontSize: 10, fontWeight: 600, background: '#EFF6FF', color: '#2563EB',
                  padding: '1px 8px', borderRadius: 9999, flexShrink: 0,
                }}>
                  {layer.count}
                </span>
              )}
              <span style={{ color: 'var(--catalyst-text-tertiary)', fontSize: 14 }}>›</span>
            </div>
          ))}
        </div>
      </div>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={drawerTitle}>
        {renderDrawerContent()}
      </Drawer>
    </>
  );
}
