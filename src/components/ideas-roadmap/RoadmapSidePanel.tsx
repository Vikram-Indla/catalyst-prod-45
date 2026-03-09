import React, { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { MILESTONE_CONFIGS } from '@/types/ideasRoadmap';
import type { RoadmapIdea, RoadmapMilestones, RoadmapQuarter } from '@/types/ideasRoadmap';

interface RoadmapSidePanelProps {
  idea: RoadmapIdea;
  onClose: () => void;
  onSaveMilestones: (ideaId: string, milestones: Partial<RoadmapMilestones>) => void;
  onToggleCommitted: (idea: RoadmapIdea) => void;
  onConvertToInitiative: (ideaId: string) => void;
}

const QUARTERS: RoadmapQuarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export function RoadmapSidePanel({
  idea, onClose, onSaveMilestones, onToggleCommitted, onConvertToInitiative,
}: RoadmapSidePanelProps) {
  const [milestones, setMilestones] = useState<RoadmapMilestones>({ ...idea.milestones });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    setMilestones({ ...idea.milestones });
  }, [idea.id]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  function handleSave() {
    onSaveMilestones(idea.id, milestones);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase',
    letterSpacing: '0.05em', fontFamily: "'Inter', sans-serif",
  };

  const fieldRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: 32, fontSize: 13, color: '#0F172A', fontFamily: "'Inter', sans-serif",
  };

  return (
    <div onKeyDown={handleKeyDown} style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute', inset: 0,
          background: visible ? 'rgba(15,23,42,0.2)' : 'transparent',
          transition: 'background 200ms',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 480,
        background: '#FFFFFF',
        boxShadow: '-4px 0 24px rgba(0,0,0,.12)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 200ms ease',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 20px', borderBottom: '1px solid #E2E8F0', flexShrink: 0,
        }}>
          <button
            onClick={handleClose}
            style={{
              width: 32, height: 32, borderRadius: 6, border: '1px solid #E2E8F0',
              background: '#FFFFFF', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} color="#64748B" />
          </button>
          <div style={{ flex: 1 }}>
            <span style={{
              fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#94A3B8',
            }}>
              {idea.ideaKey}
            </span>
            <div style={{
              fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif",
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {idea.title}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {idea.isCommitted && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#0D9488',
                fontFamily: "'Inter', sans-serif",
              }}>
                Committed
              </span>
            )}
            <button
              onClick={() => onToggleCommitted(idea)}
              style={{
                width: 32, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer',
                background: idea.isCommitted ? '#0D9488' : '#CBD5E1',
                position: 'relative',
              }}
            >
              <span style={{
                position: 'absolute', top: 3, width: 12, height: 12, borderRadius: 6,
                background: '#FFFFFF',
                left: idea.isCommitted ? 17 : 3, transition: 'left 150ms',
              }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quarter selector (if committed) */}
          {idea.isCommitted && (
            <div>
              <div style={{ ...labelStyle, marginBottom: 8 }}>TARGET QUARTER</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {QUARTERS.map(q => (
                  <button
                    key={q}
                    onClick={() => {
                      // Note: quarter change is handled via onToggleCommitted flow
                    }}
                    style={{
                      flex: 1, height: 32, borderRadius: 6, border: '1px solid #E2E8F0',
                      cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                      background: idea.quarter === q ? '#0D9488' : '#FFFFFF',
                      color: idea.quarter === q ? '#FFFFFF' : '#64748B',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Convert CTA */}
          {idea.isCommitted && (
            <button
              onClick={() => onConvertToInitiative(idea.id)}
              style={{
                width: '100%', height: 36, borderRadius: 6, border: 'none',
                background: '#0D9488', color: '#FFFFFF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: 13, fontWeight: 650, fontFamily: "'Inter', sans-serif",
              }}
            >
              Convert to Initiative
              <ArrowRight size={14} />
            </button>
          )}

          {/* Milestone Dates */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 10 }}>DELIVERY MILESTONES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MILESTONE_CONFIGS.map(m => (
                <div key={m.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: 4, background: m.color, flexShrink: 0,
                  }} />
                  <span style={{
                    width: 100, fontSize: 12, fontWeight: 600, color: '#334155',
                  }}>
                    {m.fullLabel}
                  </span>
                  <input
                    type="date"
                    value={milestones[m.key] ?? ''}
                    onChange={e => setMilestones(prev => ({ ...prev, [m.key]: e.target.value || null }))}
                    style={{
                      flex: 1, height: 36, border: '1px solid #E2E8F0', borderRadius: 4,
                      padding: '0 10px', fontSize: 12, fontFamily: "'Inter', sans-serif",
                      color: '#334155', outline: 'none',
                    }}
                  />
                  {milestones[m.key] && (
                    <button
                      onClick={() => setMilestones(prev => ({ ...prev, [m.key]: null }))}
                      style={{
                        width: 24, height: 24, borderRadius: 4, border: '1px solid #E2E8F0',
                        background: '#FFFFFF', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#94A3B8', fontSize: 12,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 10 }}>DETAILS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={fieldRowStyle}>
                <span style={{ color: '#64748B', fontSize: 12 }}>Theme</span>
                <span>{idea.theme ?? '—'}</span>
              </div>
              <div style={fieldRowStyle}>
                <span style={{ color: '#64748B', fontSize: 12 }}>Priority</span>
                <span>{idea.priority ?? '—'}</span>
              </div>
              <div style={fieldRowStyle}>
                <span style={{ color: '#64748B', fontSize: 12 }}>Status</span>
                <span>{idea.status}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {idea.description && (
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>DESCRIPTION</div>
              <div style={{
                fontSize: 13, color: '#334155', lineHeight: 1.5,
                background: '#F8FAFC', borderRadius: 6, padding: 12,
              }}>
                {idea.description}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 20px', borderTop: '1px solid #E2E8F0', flexShrink: 0,
        }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1, height: 36, borderRadius: 6, border: 'none',
              background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
              fontSize: 13, fontWeight: 650, fontFamily: "'Inter', sans-serif",
            }}
          >
            Save Changes
          </button>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>⌘S to save</span>
        </div>
      </div>
    </div>
  );
}
