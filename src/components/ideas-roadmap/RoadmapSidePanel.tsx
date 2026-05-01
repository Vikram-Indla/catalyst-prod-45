import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { MILESTONE_CONFIGS } from '@/types/ideasRoadmap';
import type { RoadmapIdea, RoadmapMilestones, RoadmapQuarter } from '@/types/ideasRoadmap';

interface RoadmapSidePanelProps {
  idea: RoadmapIdea;
  onClose: () => void;
  onSaveMilestones: (ideaId: string, milestones: Partial<RoadmapMilestones>) => void;
  onToggleCommitted: (idea: RoadmapIdea) => void;
  onConvertToInitiative: (idea: RoadmapIdea) => void;
  onQuarterChange: (idea: RoadmapIdea, quarter: RoadmapQuarter) => void;
  isSaving: boolean;
}

const QUARTERS: RoadmapQuarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
const QUARTER_STYLES: Record<string, { bg: string; color: string }> = {
  Q1: { bg: '#F3E8FF', color: '#6D28D9' },
  Q2: { bg: 'var(--ds-background-selected, #EFF6FF)', color: 'var(--ds-background-brand-bold-hovered, #1D4ED8)' },
  Q3: { bg: '#ECFDF5', color: '#065F46' },
  Q4: { bg: '#FFF7ED', color: '#92400E' },
};
const isConverted = (status: string) => status.toLowerCase() === 'converted';

export function RoadmapSidePanel({
  idea, onClose, onSaveMilestones, onToggleCommitted, onConvertToInitiative, onQuarterChange, isSaving,
}: RoadmapSidePanelProps) {
  const [milestones, setMilestones] = useState<RoadmapMilestones>({ ...idea.milestones });
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  useEffect(() => { setMilestones({ ...idea.milestones }); }, [idea.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // DS-05: Focus trap
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    panel.addEventListener('keydown', trap);
    return () => panel.removeEventListener('keydown', trap);
  }, [visible]);

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
    fontSize: 10, fontWeight: 700, color: 'var(--ds-text-subtlest, #94A3B8)', textTransform: 'uppercase',
    letterSpacing: '0.05em', fontFamily: 'var(--cp-font-body)',
  };

  const fieldRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: 32, fontSize: 13, color: 'var(--ds-text, #0F172A)', fontFamily: 'var(--cp-font-body)',
  };

  return (
    <div onKeyDown={handleKeyDown} style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div
        onClick={handleClose}
        style={{
          position: 'absolute', inset: 0,
          background: visible ? 'rgba(15,23,42,0.2)' : 'transparent',
          transition: 'background 200ms',
        }}
      />

      <div ref={panelRef} style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 480,
        background: 'var(--bg-app)', boxShadow: '-4px 0 24px rgba(0,0,0,.12)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 200ms ease',
        display: 'flex', flexDirection: 'column', fontFamily: 'var(--cp-font-body)',
      }}>
        {/* Header — sticky */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 20px', borderBottom: '1px solid var(--divider)', flexShrink: 0,
          position: 'sticky', top: 0, background: 'var(--bg-app)', zIndex: 1,
        }}>
          <button onClick={handleClose} style={{
            width: 32, height: 32, borderRadius: 6, border: '1px solid var(--divider)',
            background: 'var(--bg-app)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} color="var(--ds-text-subtlest, #64748B)" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontFamily: 'var(--cp-font-mono)', color: 'var(--fg-4)' }}>
              {idea.ideaKey}
            </span>
            <div style={{
              fontSize: 14, fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-heading)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {idea.title}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {idea.isCommitted && (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sem-success)' }}>Committed</span>
            )}
            <button
              onClick={() => onToggleCommitted(idea)}
              style={{
                width: 32, height: 18, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: idea.isCommitted ? 'var(--sem-success)' : 'var(--ds-text-disabled, #CBD5E1)', position: 'relative',
                transition: 'background 150ms',
              }}
            >
              <span style={{
                position: 'absolute', top: 3, width: 12, height: 12, borderRadius: 6,
                background: 'var(--bg-app)', left: idea.isCommitted ? 17 : 3, transition: 'left 150ms',
              }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quarter selector */}
          {idea.isCommitted && (
            <div>
              <div style={{ ...labelStyle, marginBottom: 8 }}>TARGET QUARTER</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {QUARTERS.map(q => {
                  const qs = QUARTER_STYLES[q];
                  const active = idea.quarter === q;
                  return (
                    <button key={q} onClick={() => onQuarterChange(idea, q)} style={{
                      flex: 1, height: 32, borderRadius: 6, cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, fontFamily: 'var(--cp-font-body)',
                      border: active ? 'none' : '1px solid var(--divider)',
                      background: active ? qs.bg : 'var(--bg-app)',
                      color: active ? qs.color : 'var(--fg-3)',
                      transition: 'all 150ms',
                    }}>
                      {q}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Convert CTA — EC-07 */}
          {idea.isCommitted && (
            isConverted(idea.status) ? (
              <div style={{
                padding: '10px 16px', borderRadius: 6, background: '#1B7F37',
                color: 'var(--bg-app)', fontSize: 13, fontWeight: 650, textAlign: 'center',
                border: '1px solid #B7EBD1',
              }}>
                ✓ Already converted to Request
              </div>
            ) : (
              <button
                onClick={() => onConvertToInitiative(idea)}
                style={{
                  width: '100%', height: 50, borderRadius: 6, border: 'none',
                  background: 'var(--sem-success)', color: 'var(--bg-app)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 13, fontWeight: 650, fontFamily: 'var(--cp-font-body)',
                  transition: 'all 150ms',
                }}
              >
                Convert to Request
                <ArrowRight size={14} />
              </button>
            )
          )}

          {/* Milestone Dates */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 10 }}>DELIVERY MILESTONES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MILESTONE_CONFIGS.map(m => {
                const DOT_COLORS: Record<string, string> = {
                  req: 'var(--ds-background-brand-bold-hovered, #1D4ED8)', des: '#5B21B6', dev: '#15803D',
                  uat: '#92400E', beta: '#0F766E', prod: '#065F46',
                };
                return (
                <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: DOT_COLORS[m.key] || m.color, flexShrink: 0 }} />
                  <span style={{ width: 100, fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>
                    {m.fullLabel}
                  </span>
                  <input
                    type="date"
                    value={milestones[m.key] ?? ''}
                    onChange={e => setMilestones(prev => ({ ...prev, [m.key]: e.target.value || null }))}
                    style={{
                      flex: 1, height: 50, border: '1px solid var(--divider)', borderRadius: 4,
                      padding: '0 10px', fontSize: 12, fontFamily: 'var(--cp-font-body)',
                      color: milestones[m.key] ? 'var(--fg-2)' : 'var(--fg-4)', outline: 'none',
                      transition: 'border-color 150ms',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--ds-text-brand, #2563EB)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--bd-default, #E2E8F0)')}
                  />
                  {milestones[m.key] && (
                    <button
                      onClick={() => setMilestones(prev => ({ ...prev, [m.key]: null }))}
                      style={{
                        width: 24, height: 24, borderRadius: 4, border: '1px solid var(--divider)',
                        background: 'var(--bg-app)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--fg-4)', fontSize: 12, transition: 'all 150ms',
                      }}
                    >✕</button>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          {/* Details */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 10 }}>DETAILS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={fieldRowStyle}>
                <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>Theme</span>
                <span>{idea.theme ?? '—'}</span>
              </div>
              <div style={fieldRowStyle}>
                <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>Priority</span>
                <span>{idea.priority ?? '—'}</span>
              </div>
              <div style={fieldRowStyle}>
                <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>Status</span>
                <span>{idea.status}</span>
              </div>
            </div>
          </div>

          {idea.description && (
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>DESCRIPTION</div>
              <div style={{
                fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5,
                background: 'var(--bg-1)', borderRadius: 6, padding: 12,
                whiteSpace: 'pre-wrap',
              }}>
                {idea.description}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 20px', borderTop: '1px solid var(--divider)', flexShrink: 0,
        }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: 1, height: 50, borderRadius: 6, border: 'none',
              background: isSaving ? 'var(--fg-4)' : 'var(--cp-blue)', color: 'var(--bg-app)',
              cursor: isSaving ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 650, fontFamily: 'var(--cp-font-body)',
              transition: 'background 150ms',
            }}
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
          <span style={{ fontSize: 10, color: 'var(--fg-4)' }}>⌘S to save</span>
        </div>
      </div>
    </div>
  );
}
