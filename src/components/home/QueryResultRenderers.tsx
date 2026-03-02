/**
 * QueryResultRenderers — Renderers for items, workload, release, narrative, etc.
 */
import React from 'react';
import type { QueryResult } from './PersonalizedQueryProcessor';

const F = {
  inter: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
  sora: "'Sora', sans-serif",
};

const PROJECT_COLORS: Record<string, string> = {
  BAU: '#4C6EF5', SIMP: '#FA8C16', MDT: '#52C41A', ICP: '#722ED1',
  IP: '#13C2C2', IRP: '#EB2F96', MWR: '#FAAD14', TAH: '#1890FF',
};

const STATUS_MAP: Record<string, { bg: string; color: string }> = {
  'to do': { bg: '#DFE1E6', color: '#44546F' },
  'backlog': { bg: '#DFE1E6', color: '#44546F' },
  'blocked': { bg: '#DFE1E6', color: '#44546F' },
  'on hold': { bg: '#DFE1E6', color: '#44546F' },
  'in progress': { bg: '#DEEBFF', color: '#0747A6' },
  're-open': { bg: '#DEEBFF', color: '#0747A6' },
  're-opened': { bg: '#DEEBFF', color: '#0747A6' },
  'code review': { bg: '#DEEBFF', color: '#0747A6' },
  'ready for qa': { bg: '#DEEBFF', color: '#0747A6' },
  'done': { bg: '#E3FCEF', color: '#006644' },
  'closed': { bg: '#E3FCEF', color: '#006644' },
  'resolved': { bg: '#E3FCEF', color: '#006644' },
};

function StatusLoz({ status }: { status: string }) {
  const s = STATUS_MAP[status.toLowerCase()] || { bg: '#DFE1E6', color: '#44546F' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 18,
      padding: '0 6px', borderRadius: 3,
      background: s.bg, color: s.color,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', fontFamily: F.inter,
      whiteSpace: 'nowrap',
    }}>{status}</span>
  );
}

export function QueryResultRenderer({ result, onItemClick, onFollowUp }: {
  result: QueryResult;
  onItemClick: (key: string) => void;
  onFollowUp: (query: string) => void;
}) {
  return (
    <div style={{ animation: 'ka-msg-in 200ms ease' }}>
      {/* Title */}
      <h3 style={{ fontSize: 14, fontWeight: 650, color: '#1A1D23', margin: '0 0 12px', fontFamily: F.sora }}>
        {result.title}
      </h3>

      {/* Narrative message */}
      {result.message && (
        <p style={{ fontSize: 13, color: '#5E6270', lineHeight: '20px', margin: '0 0 16px', fontFamily: F.inter }}>
          {result.message}
        </p>
      )}

      {/* Items list */}
      {result.type === 'items' && result.items && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          {result.items.map((item: any, i: number) => (
            <button
              key={item.issue_key || i}
              onClick={() => onItemClick(item.issue_key)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 3, width: '100%',
                padding: '10px 12px', background: '#FFFFFF',
                border: '1px solid #ECEEF2', borderRadius: 6,
                cursor: 'pointer', textAlign: 'left', transition: 'all 100ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F7F8FA'; e.currentTarget.style.borderColor = '#DFE1E6'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#ECEEF2'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: '#4C6EF5' }}>
                  {item.issue_key}
                </span>
                <StatusLoz status={item.status} />
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#8B8FA3' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: PROJECT_COLORS[item.project_key] || '#8B8FA3' }} />
                  {item.project_key}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1D23', fontFamily: F.inter, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.summary}
              </span>
              {item.reason && (
                <span style={{ fontSize: 11, color: '#8B8FA3', fontFamily: F.inter }}>{item.reason}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Workload view */}
      {result.type === 'workload' && result.members && (
        <div style={{ border: '1px solid #ECEEF2', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ height: 32, background: '#FAFBFC' }}>
                <th style={{ ...thStyle, textAlign: 'left' }}>MEMBER</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>OPEN</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>BLOCKED</th>
              </tr>
            </thead>
            <tbody>
              {result.members.map((m: any, i: number) => (
                <tr key={i} style={{ height: 34, borderBottom: '1px solid #ECEEF2' }}>
                  <td style={{ padding: '6px 12px', fontSize: 13, color: '#1A1D23', fontFamily: F.inter }}>{m.name}</td>
                  <td style={{ padding: '6px 12px', fontSize: 13, fontFamily: F.mono, textAlign: 'right', color: '#1A1D23', fontWeight: 600 }}>{m.open}</td>
                  <td style={{ padding: '6px 12px', fontSize: 13, fontFamily: F.mono, textAlign: 'right', color: m.blocked > 0 ? '#CF1322' : '#8B8FA3', fontWeight: 600 }}>{m.blocked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Workload alert */}
      {result.type === 'workload-alert' && (
        <div style={{ marginBottom: 16 }}>
          {result.alerts && result.alerts.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#CF1322', textTransform: 'uppercase', letterSpacing: '0.08em' }}>OVERLOADED</span>
              {result.alerts.map((a: any, i: number) => (
                <div key={i} style={{ padding: '8px 12px', border: '1px solid #FFD6D6', borderRadius: 6, background: '#FFF1F0', marginTop: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1D23' }}>{a.name}</span>
                  <span style={{ fontSize: 12, color: '#CF1322', marginLeft: 8 }}>{a.note}</span>
                </div>
              ))}
            </div>
          )}
          {result.healthy && result.healthy.length > 0 && (
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#52C41A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>AVAILABLE CAPACITY</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {result.healthy.map((h: any, i: number) => (
                  <span key={i} style={{ padding: '4px 10px', borderRadius: 4, background: '#F6FFED', border: '1px solid #B7EB8F', fontSize: 12, color: '#389E0D' }}>
                    {h.name} ({h.open})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Release readiness */}
      {result.type === 'release' && result.releases && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {result.releases.map((r: any, i: number) => {
            const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
            return (
              <div key={i} style={{ padding: '12px 14px', border: '1px solid #ECEEF2', borderRadius: 6, background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: PROJECT_COLORS[r.project] || '#8B8FA3' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1D23', fontFamily: F.inter }}>{r.project}</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: 3,
                    background: r.health === 'on-track' ? '#E3FCEF' : '#FFF7E6',
                    color: r.health === 'on-track' ? '#006644' : '#AD6800',
                  }}>
                    {r.health === 'on-track' ? 'ON TRACK' : 'AT RISK'}
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 6, borderRadius: 3, background: '#ECEEF2', overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: r.health === 'on-track' ? '#52C41A' : '#FAAD14', transition: 'width 300ms' }} />
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#8B8FA3', fontFamily: F.mono }}>
                  <span>Done: {r.done}</span>
                  <span>In Progress: {r.inProgress}</span>
                  <span style={{ color: r.blocked > 0 ? '#CF1322' : undefined }}>Blocked: {r.blocked}</span>
                  <span>Total: {r.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Follow-up chips */}
      {result.followUp && result.followUp.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {result.followUp.map(s => (
            <button
              key={s}
              onClick={() => onFollowUp(s)}
              style={{
                padding: '7px 13px', borderRadius: 8,
                border: '1.5px solid #ECEEF2', background: '#FFFFFF',
                cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#4C6EF5',
                fontFamily: F.inter, transition: 'all 100ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4C6EF5'; e.currentTarget.style.background = '#EDF2FF'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#ECEEF2'; e.currentTarget.style.background = '#FFFFFF'; }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '6px 12px', fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  color: '#8B8FA3', fontFamily: F.inter,
  borderBottom: '1px solid #ECEEF2',
};
