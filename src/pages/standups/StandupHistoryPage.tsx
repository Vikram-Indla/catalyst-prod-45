/**
 * StandupHistoryPage — /:hub/:key/standups
 *
 * 2026-06-15: standalone list-view page for past standup sessions. Replaces
 * both the retired sidebar Standups tab and the in-board slide-in panel.
 * Reachable from the board kebab → "Standup history".
 *
 * Data: useStandupHistory (last 14 days of standup_sessions for this
 * projectKey — `projectKey` accepts product codes too).
 *
 * Layout: page-level header + flat session list. No overlay, no portal.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Spinner from '@atlaskit/spinner';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { supabase } from '@/integrations/supabase/client';
import { useStandupHistory, type StandupSession } from '@/features/kanban-board/data/useStandupHistory';
import type { StandupChange } from '@/features/kanban-board/data/standupCapture';

/* ── Date helpers (mirror panel logic) ─────────────────────────────── */
function fmtTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function fmtDur(sec: number | null): string {
  if (!sec) return '';
  const m = Math.round(sec / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
function dayLabel(iso: string): string {
  const today = startOfDay(new Date());
  const day = startOfDay(new Date(iso));
  const diff = Math.round((today - day) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByTicket(changes: StandupChange[]) {
  const map = new Map<string, { key: string; type: string; items: StandupChange[] }>();
  for (const c of changes) {
    if (!map.has(c.key)) map.set(c.key, { key: c.key, type: c.type, items: [] });
    map.get(c.key)!.items.push(c);
  }
  return Array.from(map.values());
}

function changeDesc(c: StandupChange): string {
  if (c.from != null && c.to != null) return `${c.field ?? c.action}: ${c.from} → ${c.to}`;
  if (c.to != null) return `${c.field ?? c.action}: ${c.to}`;
  return c.field ?? c.action;
}

/* ── SessionRow ────────────────────────────────────────────────────── */
function SessionRow({ s, onOpenTicket }: { s: StandupSession; onOpenTicket: (key: string) => void }) {
  const [summary, setSummary] = useState<string | null>(s.summary_text);
  const tickets = useMemo(() => groupByTicket(s.changes_json ?? []), [s.changes_json]);

  useEffect(() => {
    if (!s.is_valid || summary) return;
    let cancelled = false;
    supabase.functions.invoke('standup-summary', { body: { sessionId: s.id } })
      .then(({ data }) => { if (!cancelled && data?.summary) setSummary(data.summary as string); })
      .catch(() => { /* leave null; raw changes still show */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.id]);

  return (
    <div
      style={{
        border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        background: token('elevation.surface', 'var(--ds-surface)'),
      }}
    >
      {/* Driver row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Avatar size="medium" src={s.driver_avatar_url ?? undefined} name={s.driver_name ?? 'Unknown'} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: token('color.text', 'var(--ds-text)') }}>
            {s.driver_name ?? 'Unknown driver'}
          </div>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-icon-subtle)') }}>
            {fmtTime(s.started_at)} – {fmtTime(s.ended_at)} · {fmtDur(s.duration_sec)}
          </div>
        </div>
      </div>

      {/* Summary or "no summary" */}
      {!s.is_valid ? (
        <div style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtlest', 'var(--ds-icon-subtle)'), fontStyle: 'italic' }}>
          Ran under 5 minutes — no summary.
        </div>
      ) : summary ? (
        <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-300)', lineHeight: '20px', color: token('color.text', 'var(--ds-text)'), whiteSpace: 'pre-wrap' }}>
          {summary}
        </p>
      ) : null}

      {/* Tickets touched */}
      {tickets.length > 0 && (
        <div>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: token('color.text.subtlest', 'var(--ds-icon-subtle)'), marginBottom: 4 }}>
            Tickets touched
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tickets.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => onOpenTicket(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
                  border: 'none', background: 'transparent', borderRadius: 4,
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  fontSize: 'var(--ds-font-size-300)', color: token('color.text', 'var(--ds-text)'),
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral, var(--ds-background-neutral))'); }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <JiraIssueTypeIcon type={t.type} size={16} />
                <span style={{ color: token('color.link', 'var(--ds-link)'), fontWeight: 500, flexShrink: 0 }}>{t.key}</span>
                <span style={{ flex: 1, color: token('color.text.subtle', 'var(--ds-icon)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.items.map(changeDesc).join(' · ')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function StandupHistoryPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isProduct = pathname.startsWith('/product-hub');
  const hubBase = isProduct ? '/product-hub' : '/project-hub';
  const projectKey = key?.toUpperCase();

  const { data: sessions = [], isLoading } = useStandupHistory(projectKey, true);

  /* Group sessions by day label so the page reads as a timeline. */
  const groups = useMemo(() => {
    const m = new Map<string, StandupSession[]>();
    for (const s of sessions) {
      const label = dayLabel(s.started_at);
      if (!m.has(label)) m.set(label, []);
      m.get(label)!.push(s);
    }
    return Array.from(m.entries());
  }, [sessions]);

  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const isCollapsed = (label: string) => label !== 'Today' && collapsedDays.has(label);
  const toggleDay = (label: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const openDetail = (issueKey: string) => {
    useGlobalSearchStore.getState().openDetail({ id: issueKey });
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 0, overflow: 'hidden',
      background: token('elevation.surface', 'var(--ds-surface)'),
    }}>
      {/* Page header */}
      <div style={{
        padding: '16px 32px',
        borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-icon-subtle)'), marginBottom: 4 }}>
          <Link to={`${hubBase}/${key}/boards`} style={{ color: token('color.text.subtle', 'var(--ds-icon)'), textDecoration: 'none' }}>
            ← Back to boards
          </Link>
        </div>
        <h1 style={{ margin: 0, fontSize: 'var(--ds-font-size-800)', fontWeight: 600, color: token('color.text', 'var(--ds-text)'), letterSpacing: 0 }}>
          Standup history
        </h1>
        <div style={{ marginTop: 4, fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtlest', 'var(--ds-icon-subtle)') }}>
          Last 14 days · {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner size="large" />
          </div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: token('color.text.subtlest', 'var(--ds-icon-subtle)') }}>
            <p style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 600, marginBottom: 8 }}>No standups in the last 14 days.</p>
            <p style={{ fontSize: 'var(--ds-font-size-300)' }}>Start one from the board's kebab menu → Start standup.</p>
            <button
              type="button"
              onClick={() => navigate(`${hubBase}/${key}/boards`)}
              style={{
                marginTop: 16, padding: '8px 16px',
                background: token('color.background.brand.bold', 'var(--ds-link)'),
                color: token('color.text.inverse', 'var(--ds-text-inverse)'),
                border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 'var(--ds-font-size-400)', fontFamily: 'inherit',
              }}
            >
              Go to board
            </button>
          </div>
        ) : (
          groups.map(([label, daySessions]) => (
            <div key={label} style={{ marginBottom: 24 }}>
              <button
                type="button"
                onClick={() => toggleDay(label)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, width: '100%',
                  border: 'none', background: 'transparent', padding: '4px 0 12px',
                  cursor: label === 'Today' ? 'default' : 'pointer', fontFamily: 'inherit',
                }}
              >
                {label !== 'Today' && (
                  isCollapsed(label)
                    ? <ChevronRightIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon)')} />
                    : <ChevronDownIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon)')} />
                )}
                <span style={{
                  fontSize: 'var(--ds-font-size-200)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                  color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
                }}>
                  {label} · {daySessions.length} {daySessions.length === 1 ? 'session' : 'sessions'}
                </span>
                <span style={{ flex: 1, height: 1, background: token('color.border', '#091E4224'), marginLeft: 8 }} />
              </button>
              {!isCollapsed(label) && daySessions.map((s) => (
                <SessionRow key={s.id} s={s} onOpenTicket={openDetail} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
