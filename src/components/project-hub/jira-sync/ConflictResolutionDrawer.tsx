/**
 * ConflictResolutionDrawer — Right-side drawer with side-by-side diff
 * C7: Catalyst version left, Jira version right
 */
import React from 'react';
import { X } from 'lucide-react';

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
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(15,23,42,0.30)',
        }}
      />
      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 51,
          width: 720,
          background: '#FFFFFF',
          boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.12))',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', fontFamily: 'Sora, sans-serif', margin: 0 }}>
              Resolve Conflict — {itemKey}
            </h2>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              Choose which version to keep. The rejected version will be discarded.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer',
              color: '#64748B',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {conflicts.map(conflict => (
            <div key={conflict.id} style={{ marginBottom: 24, padding: '0 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Field: {conflict.field}
              </div>
              <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.12))' }}>
                {/* Catalyst side */}
                <div style={{ flex: 1, background: '#EFF6FF', borderRight: '0.75px solid #BFDBFE', padding: 16 }}>
                  <div className="flex items-center gap-[5px]" style={{ marginBottom: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#2563EB', color: '#FFF', fontSize: 7, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>C</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catalyst Version</span>
                    <span style={{ fontSize: 10, color: '#64748B', marginLeft: 4 }}>Your edit</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 500, padding: '8px 12px', background: 'rgba(37,99,235,0.06)', borderRadius: 4 }}>
                    {conflict.catalystValue}
                  </div>
                </div>
                {/* Jira side */}
                <div style={{ flex: 1, background: '#FFF7ED', borderLeft: '0.75px solid #FED7AA', padding: 16 }}>
                  <div className="flex items-center gap-[5px]" style={{ marginBottom: 8 }}>
                    <span className="flex items-center" dangerouslySetInnerHTML={{ __html: JIRA_DIAMOND_SVG }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9A3412', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jira Version</span>
                    <span style={{ fontSize: 10, color: '#64748B', marginLeft: 4 }}>From Jira</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 500, padding: '8px 12px', background: 'rgba(154,52,18,0.06)', borderRadius: 4 }}>
                    {conflict.jiraValue}
                  </div>
                </div>
              </div>
              {/* Footer per conflict */}
              <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>
                  Detected {relativeTime(conflict.detectedAt)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onResolve(conflict.id, 'keep_catalyst')}
                    style={{
                      height: 32, padding: '0 14px', borderRadius: 4,
                      background: '#EFF6FF', color: '#2563EB', border: '0.75px solid #BFDBFE',
                      fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                    }}
                  >
                    Keep Catalyst
                  </button>
                  <button
                    onClick={() => onResolve(conflict.id, 'keep_jira')}
                    style={{
                      height: 32, padding: '0 14px', borderRadius: 4,
                      background: '#FFF7ED', color: '#9A3412', border: '0.75px solid #FED7AA',
                      fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                    }}
                  >
                    Keep Jira
                  </button>
                </div>
              </div>
            </div>
          ))}
          {conflicts.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 13 }}>
              No conflicts to resolve
            </div>
          )}
        </div>
      </div>
    </>
  );
}
