/**
 * ConflictResolutionDrawer — Right-side drawer with side-by-side diff
 * C7: Catalyst version left, Jira version right. Slide 250ms in, 200ms out.
 */
import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ConflictItem {
  id: string;
  field: string;
  catalystValue: string;
  jiraValue: string;
  detectedAt: string;
}

interface ConflictResolutionDrawerProps {
  open: boolean;
  onClose: () => void;
  itemKey: string;
  conflicts: ConflictItem[];
  onResolve: (conflictId: string, resolution: 'keep_catalyst' | 'keep_jira') => void;
}

const JIRA_DIAMOND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24"><path fill="#9A3412" d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.96 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84zM6.77 6.8a4.362 4.362 0 0 0 4.34 4.34h1.78v1.71a4.362 4.362 0 0 0 4.35 4.35V7.63a.839.839 0 0 0-.84-.83zM2 11.6c0 2.4 1.96 4.34 4.35 4.34h1.78v1.72c.01 2.39 1.97 4.34 4.35 4.34v-9.57a.84.84 0 0 0-.84-.83z"/></svg>`;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ConflictResolutionDrawer({ open, onClose, itemKey, conflicts, onResolve }: ConflictResolutionDrawerProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else if (visible) {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(15,23,42,0.30)',
          opacity: animating ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
      />
      {/* Drawer */}
      <div
        className="bg-[var(--cp-float)]"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 51,
          width: 720,
          boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'var(--cp-font-body)',
          transform: animating ? 'translateX(0)' : 'translateX(100%)',
          transition: animating ? 'transform 250ms ease-out' : 'transform 200ms ease-in',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.12))',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-heading)', margin: 0 }}>
              Resolve Conflict — {itemKey}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
              Choose which version to keep. The rejected version will be discarded.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer',
              color: 'var(--fg-3)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {conflicts.map(conflict => {
            const isIdentical = conflict.catalystValue === conflict.jiraValue;

            return (
              <div key={conflict.id} style={{ marginBottom: 24, padding: '0 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Field: {conflict.field}
                </div>

                {isIdentical ? (
                  /* Identical values — no diff needed */
                  <div className="flex items-center gap-2 bg-[var(--bg-1)]" style={{
                    padding: '12px 16px', borderRadius: 6,
                    border: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.12))',
                  }}>
                    <AlertCircle size={14} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                      No difference detected — both versions have the same value: <strong style={{ color: 'var(--fg-1)' }}>{conflict.catalystValue}</strong>
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.12))' }}>
                    {/* Catalyst side */}
                    <div className="bg-[var(--cp-blue-wash)]" style={{ flex: 1, borderRight: '0.75px solid var(--cp-primary-20)', padding: 16 }}>
                      <div className="flex items-center gap-[5px]" style={{ marginBottom: 8 }}>
                        <span className="bg-[var(--cp-blue)]" style={{ width: 10, height: 10, borderRadius: 4, color: '#FFF', fontSize: 7, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>C</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cp-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catalyst Version</span>
                        <span style={{ fontSize: 10, color: 'var(--fg-3)', marginLeft: 4 }}>Your edit</span>
                      </div>
                      <div className="bg-[rgba(37,99,235,0.06)]" style={{ fontSize: 13, color: 'var(--fg-1)', fontWeight: 500, padding: '8px 12px', borderRadius: 4 }}>
                        {conflict.catalystValue}
                      </div>
                    </div>
                    {/* Jira side */}
                    <div className="bg-[var(--sem-warning-bg)]" style={{ flex: 1, borderLeft: '0.75px solid var(--sem-warning-accent)', padding: 16 }}>
                      <div className="flex items-center gap-[5px]" style={{ marginBottom: 8 }}>
                        <span className="flex items-center" dangerouslySetInnerHTML={{ __html: JIRA_DIAMOND_SVG }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sem-warning-fg)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jira Version</span>
                        <span style={{ fontSize: 10, color: 'var(--fg-3)', marginLeft: 4 }}>From Jira</span>
                      </div>
                      <div className="bg-[rgba(154,52,18,0.06)]" style={{ fontSize: 13, color: 'var(--fg-1)', fontWeight: 500, padding: '8px 12px', borderRadius: 4 }}>
                        {conflict.jiraValue}
                      </div>
                    </div>
                  </div>
                )}
                {/* Footer per conflict */}
                <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>
                    Detected {relativeTime(conflict.detectedAt)}
                  </span>
                  {!isIdentical && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onResolve(conflict.id, 'keep_catalyst')}
                        className="bg-[var(--cp-blue-wash)]"
                        style={{
                          height: 32, padding: '0 14px', borderRadius: 4,
                          color: 'var(--cp-blue)', border: '0.75px solid var(--cp-primary-20)',
                          fontSize: 12, fontWeight: 600, fontFamily: 'var(--cp-font-body)', cursor: 'pointer',
                        }}
                      >
                        Keep Catalyst
                      </button>
                      <button
                        onClick={() => onResolve(conflict.id, 'keep_jira')}
                        className="bg-[var(--sem-warning-bg)]"
                        style={{
                          height: 32, padding: '0 14px', borderRadius: 4,
                          color: 'var(--sem-warning-fg)', border: '0.75px solid var(--sem-warning-accent)',
                          fontSize: 12, fontWeight: 600, fontFamily: 'var(--cp-font-body)', cursor: 'pointer',
                        }}
                      >
                        Keep Jira
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {conflicts.length === 0 && (
            <div className="flex flex-col items-center justify-center" style={{ padding: 40 }}>
              <AlertCircle size={32} style={{ color: 'var(--fg-4)', marginBottom: 8 }} />
              <p style={{ color: 'var(--fg-4)', fontSize: 13 }}>No conflicts to resolve</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
