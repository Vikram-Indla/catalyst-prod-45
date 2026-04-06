/**
 * SidePanelHistory — Status Timeline + Full Audit Log (V12)
 */
import { ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { useTransitions, useChangelogs } from '@/hooks/useWorkHub';
import { AvatarCircle } from './WorkHubAssigneePicker';
import WorkHubStatusLozenge from './WorkHubStatusLozenge';
import { format } from 'date-fns';
import { deriveStatusCategory } from '@/services/workhub-service';

interface Props {
  workItemId: string;
  currentStatus?: string;
  currentStatusCategory?: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hours`;
  return `${(seconds / 86400).toFixed(1)} days`;
}

function durationColor(seconds: number): string {
  if (seconds > 30 * 86400) return '#DC2626';
  if (seconds > 14 * 86400) return '#D97706';
  return 'rgba(237,237,237,0.93)';
}

function nodeColor(cat: string | null): { bg: string; border: string } {
  if (!cat) return { bg: '#DFE1E6', border: '#DFE1E6' };
  const c = cat.toLowerCase().replace(/\s+/g, '_');
  if (c === 'done' || c === 'complete') return { bg: '#1B7F37', border: '#FFFFFF' };
  if (c === 'in_progress') return { bg: '#0C66E4', border: '#FFFFFF' };
  return { bg: '#DFE1E6', border: '#DFE1E6' };
}

function barColor(cat: string | null): string {
  if (!cat) return '#DFE1E6';
  const c = cat.toLowerCase().replace(/\s+/g, '_');
  if (c === 'done') return '#1B7F37';
  if (c === 'in_progress') return '#0C66E4';
  return '#DFE1E6';
}

export default function SidePanelHistory({ workItemId, currentStatus, currentStatusCategory }: Props) {
  const { data: transitions = [], isLoading: tLoading } = useTransitions(workItemId);
  const { data: changelogs = [], isLoading: cLoading } = useChangelogs(workItemId);

  if (tLoading || cLoading) {
    return (
      <div style={{ padding: '16px 0' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0' }}>
            <div className="wh-skeleton" style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="wh-skeleton" style={{ height: 14, width: '70%', borderRadius: 4, marginBottom: 6 }} />
              <div className="wh-skeleton" style={{ height: 10, width: '40%', borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Calculate durations between transitions
  const transWithDuration = transitions.map((t: any, i: number) => {
    const next = transitions[i + 1];
    const endTime = next ? new Date(next.transitioned_at).getTime() : Date.now();
    const startTime = new Date(t.transitioned_at).getTime();
    const durationSec = (endTime - startTime) / 1000;
    return { ...t, durationSec, isLast: i === transitions.length - 1 };
  });

  const totalSec = transWithDuration.reduce((a: number, t: any) => a + t.durationSec, 0);
  const longestIdx = transWithDuration.length > 0
    ? transWithDuration.reduce((maxI: number, t: any, i: number) => t.durationSec > transWithDuration[maxI].durationSec ? i : maxI, 0)
    : -1;

  // Group changelogs by date
  const clGrouped: Record<string, any[]> = {};
  for (const cl of changelogs) {
    const dateKey = format(new Date(cl.changed_at), 'MMM d, yyyy');
    if (!clGrouped[dateKey]) clGrouped[dateKey] = [];
    clGrouped[dateKey].push(cl);
  }

  return (
    <div>
      {/* STATUS TIMELINE */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)', marginBottom: 12 }}>
          Status Timeline
        </div>

        {transitions.length === 0 ? (
          <div style={{ padding: '20px 0', fontSize: 13, color: 'var(--fg-4)' }}>
            Status timeline will appear once transition history is synced from Jira.
            {currentStatus && (
              <span style={{ display: 'inline-flex', marginLeft: 8 }}>
                Currently: <WorkHubStatusLozenge status={currentStatus} statusCategory={currentStatusCategory} />
              </span>
            )}
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 28 }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, background: 'var(--bd-default, rgba(255,255,255,0.08))' }} />

            {transWithDuration.map((t: any, i: number) => {
              const nc = nodeColor(t.to_status_category);
              const isActive = t.isLast;

              return (
                <div key={t.id || i} style={{ position: 'relative', marginBottom: i < transWithDuration.length - 1 ? 0 : 0 }}>
                  {/* Node */}
                  <div style={{ position: 'absolute', left: -28 + (isActive ? -1 : 0), top: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      width: isActive ? 14 : 12, height: isActive ? 14 : 12, borderRadius: '50%',
                      background: nc.bg, border: `2px solid ${nc.border}`,
                      ...(isActive ? { boxShadow: `0 0 0 3px ${nc.bg}` } : {}),
                    }} />
                  </div>

                  {/* Transition label */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {t.from_status ? (
                        <>
                          <WorkHubStatusLozenge status={t.from_status} statusCategory={t.from_status_category} />
                          <ArrowRight size={14} color="rgba(237,237,237,0.40)" />
                          <WorkHubStatusLozenge status={t.to_status} statusCategory={t.to_status_category} />
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>Created</span>
                          <ArrowRight size={14} color="rgba(237,237,237,0.40)" />
                          <WorkHubStatusLozenge status={t.to_status} statusCategory={t.to_status_category} />
                        </>
                      )}
                    </div>
                    <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--fg-3)', flexShrink: 0 }}>
                      {format(new Date(t.transitioned_at), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {/* Actor */}
                  <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2, marginBottom: 8 }}>
                    by {t.transitioned_by}
                  </div>

                  {/* Duration card */}
                  <div style={{
                    background: 'var(--bg-1)', border: '1px solid var(--bd-subtle, rgba(255,255,255,0.05))', borderRadius: 4,
                    padding: '8px 12px', marginBottom: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={12} color="rgba(237,237,237,0.40)" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: durationColor(t.durationSec) }}>
                        {formatDuration(t.durationSec)} in {t.to_status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 4, background: 'var(--divider)', overflow: 'hidden', marginTop: 6 }}>
                      <div style={{
                        height: '100%', borderRadius: 4, transition: 'width 300ms',
                        width: `${totalSec > 0 ? (t.durationSec / totalSec) * 100 : 0}%`,
                        background: barColor(t.to_status_category),
                      }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      {i === longestIdx && transWithDuration.length > 1 && (
                        <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(251,191,36,0.10)', color: '#FBBF24', padding: '1px 6px', borderRadius: 3 }}>Longest phase</span>
                      )}
                      {t.durationSec > 30 * 86400 && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--sem-danger)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          <AlertTriangle size={10} /> Extended duration
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Current indicator on last item */}
                  {isActive && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-3)', marginBottom: 8 }}>
                      <span>Currently in</span>
                      <WorkHubStatusLozenge status={t.to_status} statusCategory={t.to_status_category} />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>← now</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AUDIT LOG */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)' }}>Audit Log</span>
          <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{changelogs.length} changes</span>
        </div>

        {changelogs.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--fg-4)', padding: '16px 0' }}>No audit log entries yet.</div>
        )}

        {Object.entries(clGrouped).map(([dateStr, entries]) => (
          <div key={dateStr} style={{ marginBottom: 16 }}>
            {/* Date header */}
            <div style={{
              fontSize: 11, fontWeight: 650, textTransform: 'uppercase', color: 'var(--fg-3)',
              background: 'var(--bg-1)', padding: '4px 8px', borderRadius: 4, marginBottom: 4, letterSpacing: '0.04em',
            }}>
              {dateStr}
            </div>

            {entries.map((cl: any) => (
              <div key={cl.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0',
                borderBottom: '0.75px solid var(--bd-subtle, rgba(255,255,255,0.05))',
              }}>
                <AvatarCircle name={cl.changed_by} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>{cl.changed_by}</span>
                    <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>changed {cl.field_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    {cl.field_name === 'status' ? (
                      <>
                        {cl.from_display && <WorkHubStatusLozenge status={cl.from_display} statusCategory={deriveStatusCategory(cl.from_display)} />}
                        <ArrowRight size={12} color="rgba(237,237,237,0.40)" />
                        {cl.to_display && <WorkHubStatusLozenge status={cl.to_display} statusCategory={deriveStatusCategory(cl.to_display)} />}
                      </>
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>
                        {cl.from_display ? (
                          <>
                            <span style={{ color: 'var(--fg-4)', textDecoration: 'line-through' }}>{(cl.from_display || '').slice(0, 60)}</span>
                            {' → '}
                            <span>{(cl.to_display || '').slice(0, 60)}</span>
                          </>
                        ) : (
                          <span>→ {(cl.to_display || cl.to_value || '').slice(0, 60)}</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--fg-4)', flexShrink: 0 }}>
                  {format(new Date(cl.changed_at), 'hh:mm a')}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
