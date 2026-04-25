import React, { useState, useEffect } from 'react';
import type { RoadmapIdea, RoadmapQuarter } from '@/types/ideasRoadmap';

interface Props {
  ideas: RoadmapIdea[];
  onClose: () => void;
}

const QUARTERS: RoadmapQuarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
const Q_COLORS: Record<string, string> = { Q1: '#7C3AED', Q2: '#2563EB', Q3: '#0D9488', Q4: '#D97706' };
const Q_LABELS: Record<string, string> = { Q1: 'Jan – Mar', Q2: 'Apr – Jun', Q3: 'Jul – Sep', Q4: 'Oct – Dec' };
const TOTAL_SLIDES = 5;

export function PresentationModal({ ideas, onClose }: Props) {
  const [slide, setSlide] = useState(0);
  const committed = ideas.filter(i => i.isCommitted);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') setSlide(s => Math.min(TOTAL_SLIDES - 1, s + 1));
      if (e.key === 'ArrowLeft') setSlide(s => Math.max(0, s - 1));
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--fg-1)',
      display: 'flex', flexDirection: 'column', fontFamily: 'var(--cp-font-body)',
    }}>
      {/* Top bar */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
        background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid #292929',
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 24, borderRadius: 4, background: '#0D2242',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--bg-app)', fontSize: 9, fontWeight: 800,
        }}>MIM</div>
        <div style={{ width: 1, height: 20, background: '#2E2E2E' }} />
        <span style={{ color: 'var(--divider)', fontSize: 14, fontWeight: 600, flex: 1 }}>
          {slide === 0 ? 'Ideas Roadmap — FY 2026' : `${QUARTERS[slide - 1]} 2026 — Delivery Plan`}
        </span>
        <span style={{ color: 'var(--fg-4)', fontSize: 12 }}>
          {slide === 0 ? 'Overview' : QUARTERS[slide - 1]}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: '#292929', flexShrink: 0 }}>
        <div style={{
          height: '100%', background: 'var(--sem-success)', transition: 'width 300ms',
          width: `${((slide + 1) / TOTAL_SLIDES) * 100}%`,
        }} />
      </div>

      {/* Slide content */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        {slide === 0 ? (
          <CoverSlide committed={committed} ideas={ideas} />
        ) : (
          <QuarterSlide quarter={QUARTERS[slide - 1]!} ideas={committed} color={Q_COLORS[QUARTERS[slide - 1]!]} />
        )}
      </div>

      {/* Navigation */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexShrink: 0,
        background: 'rgba(15,23,42,0.95)', borderTop: '1px solid #292929',
      }}>
        <button onClick={() => setSlide(s => Math.max(0, s - 1))} disabled={slide === 0}
          style={{
            width: 30, height: 30, borderRadius: '50%', background: '#2E2E2E',
            border: 'none', color: '#fff', cursor: 'pointer', opacity: slide === 0 ? 0.3 : 1,
            fontSize: 14,
          }}>←</button>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {Array.from({ length: TOTAL_SLIDES }, (_, i) => (
            <div key={i} onClick={() => setSlide(i)} style={{
              width: 6, height: 6, borderRadius: '50%', cursor: 'pointer',
              background: i === slide ? 'var(--sem-success)' : 'rgba(255,255,255,0.2)',
              transform: i === slide ? 'scale(1.4)' : 'scale(1)',
              transition: 'all 200ms',
            }} />
          ))}
        </div>
        <button onClick={() => setSlide(s => Math.min(TOTAL_SLIDES - 1, s + 1))} disabled={slide === TOTAL_SLIDES - 1}
          style={{
            width: 30, height: 30, borderRadius: '50%', background: '#2E2E2E',
            border: 'none', color: '#fff', cursor: 'pointer', opacity: slide === TOTAL_SLIDES - 1 ? 0.3 : 1,
            fontSize: 14,
          }}>→</button>
        <span style={{ color: 'var(--fg-3)', fontSize: 11, marginLeft: 8, fontFamily: 'var(--cp-font-mono)' }}>
          {slide + 1} / {TOTAL_SLIDES}
        </span>
      </div>

      {/* Close button */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 10, right: 16, background: 'none', border: 'none',
        color: 'var(--fg-4)', fontSize: 22, cursor: 'pointer', zIndex: 1,
      }}>✕</button>
    </div>
  );
}

function CoverSlide({ committed, ideas }: { committed: RoadmapIdea[]; ideas: RoadmapIdea[] }) {
  const qs: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  committed.forEach(i => { if (i.quarter) qs[i.quarter]++; });
  const qColors = ['#7C3AED', '#2563EB', '#0D9488', '#D97706'];

  return (
    <div style={{ display: 'flex', gap: 60, alignItems: 'center', maxWidth: 1200, width: '100%' }}>
      {/* Left */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
          Ministry of Industry & Mineral Resources
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--bg-app)', fontFamily: 'var(--cp-font-heading)', lineHeight: 1.1, marginBottom: 8 }}>
          MIM Digital
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--sem-success)', fontFamily: 'var(--cp-font-heading)', lineHeight: 1.1, marginBottom: 24 }}>
          Transformation Roadmap
        </div>
        <div style={{ width: 40, height: 4, background: 'var(--sem-success)', borderRadius: 4, marginBottom: 24 }} />
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'COMMITTED IDEAS', value: String(committed.length), sub: `of ${ideas.length} total` },
            { label: 'FISCAL YEAR', value: '2026', sub: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) },
          ].map(s => (
            <div key={s.label} style={{
              background: '#292929', border: '1px solid #2E2E2E',
              borderRadius: 8, padding: '16px 20px', minWidth: 140,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--fg-3)', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--bg-app)', fontFamily: 'var(--cp-font-heading)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Q breakdown */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', letterSpacing: '0.1em', marginBottom: 16 }}>
          DELIVERY BY QUARTER
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q, i) => (
            <div key={q} style={{
              background: '#1F1F1F', border: '1px solid #292929',
              borderRadius: 8, padding: '16px 20px', borderTop: `3px solid ${qColors[i]}`, minWidth: 140,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-4)', marginBottom: 8 }}>{q} {Q_LABELS[q]}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: qColors[i], fontFamily: 'var(--cp-font-heading)' }}>{qs[q]}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>committed ideas</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuarterSlide({ quarter, ideas, color }: { quarter: string; ideas: RoadmapIdea[]; color: string }) {
  const qIdeas = ideas.filter(i => i.quarter === quarter).slice(0, 20);
  const Q_MONTHS: Record<string, string[]> = { Q1: ['Jan', 'Feb', 'Mar'], Q2: ['Apr', 'May', 'Jun'], Q3: ['Jul', 'Aug', 'Sep'], Q4: ['Oct', 'Nov', 'Dec'] };
  const months = Q_MONTHS[quarter] || [];

  if (!qIdeas.length) {
    return (
      <div style={{ color: 'var(--fg-3)', fontSize: 18, textAlign: 'center' }}>
        No committed ideas in {quarter} 2026
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', marginBottom: 16, borderBottom: `2px solid ${color}`, paddingBottom: 8 }}>
        <div style={{ width: 240, fontSize: 11, fontWeight: 700, color: 'var(--fg-4)', letterSpacing: '0.06em' }}>
          IDEA
        </div>
        <div style={{ flex: 1, display: 'flex' }}>
          {months.map(m => (
            <div key={m} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--fg-4)', letterSpacing: '0.06em' }}>
              {m.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      {qIdeas.map((idea, ri) => {
        const t = idea.title.length > 45 ? idea.title.slice(0, 43) + '…' : idea.title;
        return (
          <div key={idea.id} style={{
            display: 'flex', alignItems: 'center', height: 40,
            background: ri % 2 === 1 ? '#1F1F1F' : 'transparent',
            borderBottom: '1px solid #1F1F1F',
          }}>
            <div style={{ width: 240, paddingRight: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-mono)' }}>{idea.ideaKey}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--divider)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t}</div>
            </div>
            <div style={{ flex: 1, display: 'flex', position: 'relative', height: '100%', alignItems: 'center' }}>
              {months.map((m, mi) => (
                <div key={m} style={{
                  flex: 1, height: '100%',
                  borderLeft: mi > 0 ? '1px solid #1F1F1F' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {/* Show a diamond if PROD date falls in this month */}
                  {idea.milestones.prod && new Date(idea.milestones.prod + 'T00:00:00').toLocaleString('en', { month: 'short' }) === m && (
                    <div style={{
                      width: 10, height: 10, background: color, transform: 'rotate(45deg)',
                    }} />
                  )}
                  {/* Show a diamond if DEV date falls in this month */}
                  {idea.milestones.dev && new Date(idea.milestones.dev + 'T00:00:00').toLocaleString('en', { month: 'short' }) === m && !idea.milestones.prod?.startsWith(idea.milestones.dev?.slice(0, 7) || '___') && (
                    <div style={{
                      width: 8, height: 8, background: 'var(--fg-3)', transform: 'rotate(45deg)',
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
