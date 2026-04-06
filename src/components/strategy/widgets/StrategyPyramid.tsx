/**
 * StrategyPyramid — Widget 1: Interactive SVG pyramid + label cards
 * Row 1, span 6
 * DATA SOURCE: es_missions, es_visions, es_strategic_themes, es_goals, es_key_results
 */

import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { Drawer } from '../shared/Drawer';
import { KrListItem } from '../shared/KrListItem';
import { SectionTitle } from '../shared/SectionTitle';
import { ProgressBar } from '../shared/ProgressBar';
import {
  useMission, useVision, useStrategicThemes, useGoals, useKeyResults,
} from '@/hooks/strategy/useStrategyData';

interface LayerDisplay {
  key: string;
  label: string;
  description: string;
  color: string;
  letter: string;
  letterColor: string;
  count?: number;
  points: string;
}

/* Monochromatic blue gradient — darkest at top */
const LAYER_COLORS: Record<string, string> = {
  mission: '#1E3A5F',
  vision: '#7DB8FC',
  themes: '#3B82F6',
  goals: '#93C5FD',
  krs: '#DBEAFE',
};

const LETTER_COLORS: Record<string, string> = {
  mission: 'rgba(255,255,255,0.30)',
  vision: 'rgba(255,255,255,0.30)',
  themes: 'rgba(255,255,255,0.25)',
  goals: 'rgba(30,58,95,0.20)',
  krs: 'rgba(30,58,95,0.20)',
};

const LAYER_POINTS: Record<string, string> = {
  mission: '100,0 120,56 80,56',
  vision: '80,56 120,56 140,112 60,112',
  themes: '60,112 140,112 160,168 40,168',
  goals: '40,168 160,168 180,224 20,224',
  krs: '20,224 180,224 200,280 0,280',
};

const SEPARATORS = [
  { y: 56, x1: 80, x2: 120 },
  { y: 112, x1: 60, x2: 140 },
  { y: 168, x1: 40, x2: 160 },
  { y: 224, x1: 20, x2: 180 },
];

const LETTER_POS: Record<string, { x: number; y: number }> = {
  mission: { x: 100, y: 38 },
  vision: { x: 100, y: 84 },
  themes: { x: 100, y: 140 },
  goals: { x: 100, y: 196 },
  krs: { x: 100, y: 252 },
};

const FONT_SIZES: Record<string, number> = {
  mission: 20, vision: 28, themes: 34, goals: 36, krs: 38,
};

export function StrategyPyramid() {
  const { data: mission, isLoading: mL } = useMission();
  const { data: vision, isLoading: vL } = useVision();
  const { data: themes, isLoading: tL } = useStrategicThemes();
  const { data: goals, isLoading: gL } = useGoals();
  const { data: keyResults, isLoading: kL } = useKeyResults();

  const isLoading = mL || vL || tL || gL || kL;

  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLayer, setDrawerLayer] = useState<string | null>(null);

  const layers: LayerDisplay[] = useMemo(() => {
    const themeNames = themes?.map(t => t.title).join(' · ') || '';
    const goalsPerTheme = themes?.length ? Math.round((goals?.length || 0) / themes.length) : 0;
    return [
      {
        key: 'mission', label: 'Mission',
        description: mission?.title || 'No mission defined',
        color: LAYER_COLORS.mission, letterColor: LETTER_COLORS.mission, letter: 'M', points: LAYER_POINTS.mission,
      },
      {
        key: 'vision', label: 'Vision',
        description: vision?.title || 'No vision defined',
        color: LAYER_COLORS.vision, letterColor: LETTER_COLORS.vision, letter: 'V', points: LAYER_POINTS.vision,
      },
      {
        key: 'themes', label: 'Strategic Themes',
        description: themeNames || 'No themes defined',
        color: LAYER_COLORS.themes, letterColor: LETTER_COLORS.themes, letter: 'S', count: themes?.length || 0,
        points: LAYER_POINTS.themes,
      },
      {
        key: 'goals', label: 'Goals',
        description: `${goalsPerTheme} per theme · owner-assigned · quarterly cadence`,
        color: LAYER_COLORS.goals, letterColor: LETTER_COLORS.goals, letter: 'G', count: goals?.length || 0,
        points: LAYER_POINTS.goals,
      },
      {
        key: 'krs', label: 'Key Results',
        description: 'Measurable outcomes · progress-tracked',
        color: LAYER_COLORS.krs, letterColor: LETTER_COLORS.krs, letter: 'K', count: keyResults?.length || 0,
        points: LAYER_POINTS.krs,
      },
    ];
  }, [mission, vision, themes, goals, keyResults]);

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
              {mission?.title || 'No mission defined'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--catalyst-text-secondary)', lineHeight: 1.7 }}>
              {mission?.description || 'Set a mission statement to define your organization\'s purpose.'}
            </p>
          </div>
        );
      case 'vision':
        return (
          <div>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--catalyst-text-primary)', marginBottom: 16 }}>
              {vision?.title || 'No vision defined'}
            </p>
            {goals && goals.length > 0 && (
              <>
                <SectionTitle title="Progress Indicators" />
                {goals.slice(0, 3).map(g => (
                  <KrListItem
                    key={g.id}
                    status={g.status === 'on_track' ? 'on_track' : g.status === 'at_risk' ? 'at_risk' : 'off_track'}
                    title={g.title}
                    meta={`Progress: ${g.progress_pct ?? 0}%`}
                    progress={Number(g.progress_pct) || 0}
                  />
                ))}
              </>
            )}
          </div>
        );
      case 'themes':
        return (
          <div>
            <SectionTitle title={`Strategic Themes (${themes?.length || 0})`} />
            {themes?.map(t => {
              const themeGoals = goals?.filter(g => g.theme_id === t.id) || [];
              const themeKrs = keyResults?.filter(kr => themeGoals.some(g => g.id === kr.goal_id)) || [];
              const avgProgress = themeGoals.length
                ? Math.round(themeGoals.reduce((s, g) => s + (Number(g.progress_pct) || 0), 0) / themeGoals.length)
                : 0;
              return (
                <div key={t.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--exec-border, var(--bd-default, rgba(255,255,255,0.10)))' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7DB8FC', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--exec-text-primary)' }}>{t.title}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: avgProgress >= 70 ? '#7DB8FC' : avgProgress >= 40 ? '#D97706' : '#DC2626' }}>{avgProgress}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--exec-text-tertiary)', marginBottom: 6, paddingLeft: 16 }}>
                    {themeGoals.length} Goals · {themeKrs.length} KRs
                  </div>
                  <div style={{ paddingLeft: 16 }}>
                    <ProgressBar value={avgProgress} height={4} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      case 'goals':
        return (
          <div>
            {themes?.map(t => {
              const themeGoals = goals?.filter(g => g.theme_id === t.id) || [];
              if (themeGoals.length === 0) return null;
              return (
                <div key={t.id} style={{ marginBottom: 16 }}>
                  <SectionTitle title={t.title} />
                  {themeGoals.map(g => (
                    <KrListItem
                      key={g.id}
                      status={Number(g.progress_pct) >= 70 ? 'on_track' : Number(g.progress_pct) >= 50 ? 'at_risk' : 'off_track'}
                      title={g.title}
                      meta={`Q${g.quarter || '?'} · ${g.status}`}
                      progress={Number(g.progress_pct) || 0}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        );
      case 'krs':
        return (
          <div>
            <SectionTitle title="Key Results" />
            {keyResults?.slice(0, 6).map(kr => (
              <KrListItem
                key={kr.id}
                status={kr.status === 'on_track' ? 'on_track' : kr.status === 'at_risk' ? 'at_risk' : 'off_track'}
                title={kr.title}
                meta={`${kr.current_value ?? 0} / ${kr.target_value ?? 0} ${kr.unit || ''}`}
                progress={Number(kr.progress_pct) || 0}
              />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 280 }}>
        <div className="animate-pulse flex gap-4 w-full">
          <div style={{ width: 180, height: 280, background: 'var(--catalyst-bg-hover)', borderRadius: 8 }} />
          <div className="flex-1 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ height: 40, background: 'var(--catalyst-bg-hover)', borderRadius: 6 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const drawerTitle = drawerLayer ? layers.find(l => l.key === drawerLayer)?.label || '' : '';

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4" style={{ minHeight: 280 }}>
        {/* SVG Pyramid */}
        <div className="flex items-center justify-center" style={{ flexShrink: 0, width: 'auto', maxWidth: 180 }}>
          <svg viewBox="0 0 200 280" className="w-[140px] h-[220px] sm:w-[180px] sm:h-[280px]" aria-hidden="true">
            {layers.map(layer => (
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
            {layers.map(layer => {
              const pos = LETTER_POS[layer.key];
              return (
                <text
                  key={layer.key + '-letter'}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={layer.letterColor}
                  style={{ fontSize: FONT_SIZES[layer.key], fontWeight: 800, pointerEvents: 'none' }}
                >
                  {layer.letter}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Label Cards */}
        <div className="flex flex-col justify-center flex-1 gap-1 min-w-0">
          {layers.map(layer => (
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
                background: hoveredLayer === layer.key ? 'var(--exec-bg-hover, #1A1A1A)' : 'transparent',
                transition: 'background 120ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div style={{ width: 3, height: 28, borderRadius: 4, background: layer.color, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--exec-text-primary)' }}>{layer.label}</div>
                <div style={{ fontSize: 10, color: 'var(--exec-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {layer.description}
                </div>
              </div>
              {layer.count !== undefined && layer.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 600, background: 'var(--exec-blue-50, rgba(59,130,246,0.06))', color: 'var(--exec-blue-700, #7DB8FC)',
                  padding: '1px 8px', borderRadius: 9999, flexShrink: 0,
                }}>
                  {layer.count}
                </span>
              )}
              <span style={{ color: 'var(--exec-text-tertiary)', fontSize: 14 }}>›</span>
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
