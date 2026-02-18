/**
 * OkrTree — Widget 3: Collapsible theme/goal tree
 * Row 2, span 6
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ProgressBar } from '../shared/ProgressBar';

interface GoalItem {
  name: string;
  progress: number;
}

interface ThemeSection {
  name: string;
  color: string;
  progress: number;
  goals: GoalItem[];
}

const MOCK: ThemeSection[] = [
  { name: 'Digital Transformation', color: '#2563EB', progress: 75, goals: [
    { name: 'Digitize 80% of permits', progress: 82 },
    { name: 'Launch AI analytics platform', progress: 65 },
    { name: 'Integrate 5 ministry systems', progress: 78 },
  ]},
  { name: 'Workforce Development', color: '#0D9488', progress: 83, goals: [
    { name: 'Train 10K engineers', progress: 91 },
    { name: 'Saudization rate → 45%', progress: 85 },
    { name: 'STEM scholarship pipeline', progress: 72 },
  ]},
  { name: 'Supply Chain Excellence', color: '#D97706', progress: 58, goals: [
    { name: 'Reduce import dependency 30%', progress: 76 },
    { name: '3 new logistics hubs', progress: 41 },
    { name: 'Supplier quality certification', progress: 56 },
  ]},
  { name: 'Sustainability & ESG', color: '#16A34A', progress: 77, goals: [
    { name: 'Carbon reduction 25%', progress: 88 },
    { name: 'ESG compliance framework', progress: 63 },
    { name: 'Renewable energy adoption 40%', progress: 80 },
  ]},
];

function getProgressColor(v: number) {
  if (v >= 70) return '#0D9488';
  if (v >= 50) return '#D97706';
  return '#EF4444';
}

export function OkrTree() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MOCK.map(t => [t.name, true]))
  );

  const toggleAll = () => {
    const allExpanded = Object.values(expanded).every(Boolean);
    setExpanded(Object.fromEntries(MOCK.map(t => [t.name, !allExpanded])));
  };

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={toggleAll}
          style={{ fontSize: 10, color: 'var(--catalyst-text-link)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
        >
          {Object.values(expanded).every(Boolean) ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {MOCK.map(theme => {
          const isOpen = expanded[theme.name] ?? true;
          const Chevron = isOpen ? ChevronDown : ChevronRight;
          return (
            <div key={theme.name} style={{ marginBottom: 4 }}>
              <button
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => setExpanded(p => ({ ...p, [theme.name]: !p[theme.name] }))}
                className="flex items-center gap-2 w-full"
                style={{
                  padding: '8px 6px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'background 120ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--catalyst-bg-hover, #F8FAFC)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: theme.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--catalyst-text-primary)', flex: 1, textAlign: 'left' }}>
                  {theme.name}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: getProgressColor(theme.progress), marginRight: 4 }}>
                  {theme.progress}%
                </span>
                <Chevron size={14} style={{ color: 'var(--catalyst-text-tertiary)', transition: 'transform 150ms' }} />
              </button>

              {isOpen && (
                <div style={{ paddingLeft: 20 }}>
                  {theme.goals.map(goal => (
                    <div key={goal.name} className="flex items-center gap-2" style={{ padding: '6px 0' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: getProgressColor(goal.progress), flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--catalyst-text-primary)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {goal.name}
                      </span>
                      <div style={{ width: 80 }}>
                        <ProgressBar value={goal.progress} height={6} showLabel />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
