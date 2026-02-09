import { useState } from 'react';
import { BarChart3, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useJiraIssueStats, IssueTypeStats } from '../hooks/useJiraIssueStats';
import '../../shared/tokens/workhub-tokens.css';

const STATUS_COLORS: Record<string, string> = {
  'To Do': '#94A3B8',
  'Open': '#94A3B8',
  'Backlog': '#94A3B8',
  'New': '#94A3B8',
  'In Progress': '#2563EB',
  'In Review': '#7C3AED',
  'In Development': '#2563EB',
  'Development': '#2563EB',
  'Done': '#10B981',
  'Closed': '#10B981',
  'Resolved': '#10B981',
  'Released': '#10B981',
  'Cancelled': '#EF4444',
  'Rejected': '#EF4444',
  'Blocked': '#EF4444',
  'On Hold': '#F59E0B',
  'Waiting': '#F59E0B',
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#94A3B8';
}

interface WorkItemsDashboardProps {
  isConnected: boolean;
}

export function WorkItemsDashboard({ isConnected }: WorkItemsDashboardProps) {
  const { data, isLoading, error, refetch, isFetching } = useJiraIssueStats(isConnected);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  if (!isConnected) return null;

  return (
    <div className="wh-card" style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 style={{ width: 18, height: 18, color: 'var(--wh-pri)' }} />
          <h3 style={{
            fontFamily: 'var(--wh-fh)', fontSize: 15, fontWeight: 700,
            color: 'var(--wh-tx)', margin: 0,
          }}>
            Work Items Overview
          </h3>
          {data && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--wh-tx4)',
              background: 'var(--wh-sf2)', padding: '2px 8px', borderRadius: 20,
              fontFamily: 'var(--wh-mo)',
            }}>
              {data.total.toLocaleString()} total
            </span>
          )}
        </div>
        <button
          className="wh-btn-secondary"
          onClick={() => refetch()}
          disabled={isFetching}
          style={{ height: 32, padding: '0 12px', fontSize: 12 }}
        >
          <RefreshCw style={{
            width: 13, height: 13,
            animation: isFetching ? 'spin 1s linear infinite' : 'none',
          }} />
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{
          padding: '32px 0', textAlign: 'center',
          fontSize: 13, color: 'var(--wh-tx3)',
        }}>
          Fetching work items from Jira...
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div style={{
          padding: '12px 14px', background: 'var(--wh-dng-bg)',
          borderRadius: 'var(--wh-rad)', border: '1px solid rgba(239,68,68,0.2)',
          fontSize: 13, color: 'var(--wh-dng)',
        }}>
          {error.message}
        </div>
      )}

      {/* Data */}
      {data && !isLoading && (
        <>
          {/* Status summary bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: 'var(--wh-fh)', fontSize: 11, fontWeight: 600,
              color: 'var(--wh-tx4)', textTransform: 'uppercase', letterSpacing: '0.04em',
              marginBottom: 10,
            }}>
              STATUS DISTRIBUTION
            </div>
            {/* Stacked bar */}
            <div style={{
              display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden',
              background: 'var(--wh-sf2)',
            }}>
              {data.statuses.map(s => (
                <div
                  key={s.status}
                  title={`${s.status}: ${s.count}`}
                  style={{
                    width: `${(s.count / data.scanned) * 100}%`,
                    background: getStatusColor(s.status),
                    minWidth: s.count > 0 ? 2 : 0,
                  }}
                />
              ))}
            </div>
            {/* Status chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {data.statuses.map(s => (
                <div key={s.status} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, color: 'var(--wh-tx3)',
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: getStatusColor(s.status),
                  }} />
                  <span style={{ fontFamily: 'var(--wh-fn)' }}>{s.status}</span>
                  <span style={{
                    fontFamily: 'var(--wh-mo)', fontSize: 11, color: 'var(--wh-tx4)',
                  }}>
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Types table */}
          <div style={{
            fontFamily: 'var(--wh-fh)', fontSize: 11, fontWeight: 600,
            color: 'var(--wh-tx4)', textTransform: 'uppercase', letterSpacing: '0.04em',
            marginBottom: 8,
          }}>
            BY ISSUE TYPE
          </div>
          <div style={{
            border: '1px solid var(--wh-bdr)', borderRadius: 'var(--wh-rad)',
            overflow: 'hidden',
          }}>
            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '28px 1fr 80px 1fr',
              padding: '8px 12px', background: 'var(--wh-sf)',
              borderBottom: '1px solid var(--wh-bdr)',
              fontSize: 11, fontWeight: 600, color: 'var(--wh-tx4)',
              fontFamily: 'var(--wh-fh)', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              <div />
              <div>Type</div>
              <div style={{ textAlign: 'right' }}>Count</div>
              <div style={{ paddingLeft: 16 }}>Status Breakdown</div>
            </div>

            {/* Data rows */}
            {data.types.map((t, idx) => (
              <TypeRow
                key={t.type}
                type={t}
                scanned={data.scanned}
                isLast={idx === data.types.length - 1}
                isExpanded={expandedType === t.type}
                onToggle={() => setExpandedType(expandedType === t.type ? null : t.type)}
              />
            ))}
          </div>

          {data.scanned < data.total && (
            <div style={{
              marginTop: 8, fontSize: 11, color: 'var(--wh-tx4)',
              fontFamily: 'var(--wh-fn)', fontStyle: 'italic',
            }}>
              Showing data from {data.scanned.toLocaleString()} of {data.total.toLocaleString()} issues (last 90 days)
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TypeRow({ type, scanned, isLast, isExpanded, onToggle }: {
  type: IssueTypeStats; scanned: number; isLast: boolean;
  isExpanded: boolean; onToggle: () => void;
}) {
  const pct = scanned > 0 ? ((type.count / scanned) * 100).toFixed(1) : '0';

  return (
    <>
      <div
        onClick={onToggle}
        style={{
          display: 'grid', gridTemplateColumns: '28px 1fr 80px 1fr',
          padding: '10px 12px', cursor: 'pointer',
          borderBottom: isLast && !isExpanded ? 'none' : '1px solid var(--wh-bdr)',
          background: isExpanded ? 'var(--wh-sf)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isExpanded
            ? <ChevronDown style={{ width: 14, height: 14, color: 'var(--wh-tx4)' }} />
            : <ChevronRight style={{ width: 14, height: 14, color: 'var(--wh-tx4)' }} />
          }
        </div>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--wh-tx)',
          fontFamily: 'var(--wh-fn)', display: 'flex', alignItems: 'center',
        }}>
          {type.type}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: 'var(--wh-tx)',
          fontFamily: 'var(--wh-mo)', textAlign: 'right',
        }}>
          {type.count}
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--wh-tx4)', marginLeft: 4 }}>
            ({pct}%)
          </span>
        </div>
        <div style={{ paddingLeft: 16, display: 'flex', alignItems: 'center' }}>
          {/* Mini bar */}
          <div style={{
            display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden',
            background: 'var(--wh-sf2)', flex: 1, maxWidth: 200,
          }}>
            {type.statuses.map(s => (
              <div
                key={s.status}
                title={`${s.status}: ${s.count}`}
                style={{
                  width: `${(s.count / type.count) * 100}%`,
                  background: getStatusColor(s.status),
                  minWidth: s.count > 0 ? 2 : 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Expanded status detail */}
      {isExpanded && (
        <div style={{
          padding: '8px 12px 12px 40px',
          borderBottom: isLast ? 'none' : '1px solid var(--wh-bdr)',
          background: 'var(--wh-sf)',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {type.statuses.map(s => (
              <span key={s.status} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'var(--wh-bg)', border: '1px solid var(--wh-bdr)',
                borderRadius: 20, padding: '3px 10px 3px 8px',
                fontSize: 12, fontFamily: 'var(--wh-fn)', color: 'var(--wh-tx2)',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: getStatusColor(s.status),
                }} />
                {s.status}
                <span style={{ fontFamily: 'var(--wh-mo)', fontSize: 11, color: 'var(--wh-tx4)' }}>
                  {s.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
