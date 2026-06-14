/**
 * StandupHistoryPanel — right-side panel (kebab → "Standup history").
 * Lazy-loaded; shows the last 14 days of standup sessions grouped by day.
 * Today is expanded by default; older days collapse behind a date divider.
 * Each session lists the driver, timing, and the tickets the driver touched
 * (type icon + key + what changed) — click a ticket to open it.
 *
 * Summary text is shown when present (generated lazily by the AI step). When a
 * session ran under 5 minutes it is marked "no summary" and carries no detail.
 * ADS-only: @atlaskit/tokens + primitives, no hardcoded hex.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import CopyIcon from '@atlaskit/icon/glyph/copy';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { useStandupHistory, type StandupSession } from '../data/useStandupHistory';
import type { StandupChange } from '../data/standupCapture';

interface Props {
  projectKey: string | undefined;
  open: boolean;
  onClose: () => void;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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

function changeDesc(c: StandupChange): string {
  if (c.from != null && c.to != null) return `${c.field ?? c.action}: ${c.from} → ${c.to}`;
  if (c.to != null) return `${c.field ?? c.action}: ${c.to}`;
  return c.field ?? c.action;
}

function buildCopyText(s: StandupSession, whatsapp: boolean): string {
  const b = whatsapp ? '*' : '';
  const lines: string[] = [`${b}Standup — ${dayLabel(s.started_at)}${b} (${fmtTime(s.started_at)}–${fmtTime(s.ended_at)})`, `Driven by ${s.driver_name ?? 'Unknown'}`];
  if (!s.is_valid) { lines.push('Ran under 5 minutes — no summary.'); return lines.join('\n'); }
  if (s.summary_text) { lines.push('', s.summary_text); }
  if (s.changes_json.length) {
    lines.push('', `${b}Changes${b}:`);
    for (const c of s.changes_json) lines.push(`• ${c.key} — ${changeDesc(c)}`);
  }
  if (s.comments_json.length) {
    lines.push('', `${b}Comments${b}:`);
    for (const c of s.comments_json) lines.push(`• ${c.key}: ${c.snippet}`);
  }
  return lines.join('\n');
}

/** Group a session's changes by ticket so each ticket renders once. */
function groupByTicket(changes: StandupChange[]) {
  const map = new Map<string, { key: string; type: string; items: StandupChange[] }>();
  for (const c of changes) {
    if (!map.has(c.key)) map.set(c.key, { key: c.key, type: c.type, items: [] });
    map.get(c.key)!.items.push(c);
  }
  return Array.from(map.values());
}

const SessionCard: React.FC<{ s: StandupSession; onOpenTicket: (key: string) => void }> = ({ s, onOpenTicket }) => {
  const [copied, setCopied] = useState<'plain' | 'whatsapp' | null>(null);
  const [summary, setSummary] = useState<string | null>(s.summary_text);
  const [genLoading, setGenLoading] = useState(false);
  const tickets = useMemo(() => groupByTicket(s.changes_json ?? []), [s.changes_json]);

  // Lazy AI summary: generate on first view of a valid session with none yet.
  useEffect(() => {
    if (!s.is_valid || summary) return;
    let cancelled = false;
    setGenLoading(true);
    supabase.functions.invoke('standup-summary', { body: { sessionId: s.id } })
      .then(({ data }) => { if (!cancelled && data?.summary) setSummary(data.summary as string); })
      .catch(() => { /* leave summary null; raw changes still render */ })
      .finally(() => { if (!cancelled) setGenLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.id]);
  const copy = (whatsapp: boolean) => {
    navigator.clipboard?.writeText(buildCopyText({ ...s, summary_text: summary }, whatsapp));
    setCopied(whatsapp ? 'whatsapp' : 'plain');
    setTimeout(() => setCopied(null), 1500);
  };
  return (
    <div style={{ border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 8, padding: 12, marginBottom: 10, background: token('elevation.surface', '#FFFFFF') }}>
      {/* Driver + timing */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Avatar size="small" src={s.driver_avatar_url ?? undefined} name={s.driver_name ?? 'Unknown'} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: token('color.text', '#172B4D') }}>{s.driver_name ?? 'Unknown'} drove this standup</div>
          <div style={{ fontSize: 11, color: token('color.text.subtlest', '#626F86') }}>
            {fmtTime(s.started_at)}–{fmtTime(s.ended_at)}{s.duration_sec ? ` · ${fmtDur(s.duration_sec)}` : ''}
          </div>
        </div>
        {s.is_valid && (
          <div style={{ display: 'flex', gap: 2 }}>
            <button type="button" aria-label="Copy summary" title={copied === 'plain' ? 'Copied' : 'Copy summary'} onClick={() => copy(false)}
              style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 4, cursor: 'pointer' }}>
              <CopyIcon label="" size="small" primaryColor={token('color.icon.subtle', '#44546F')} />
            </button>
            <button type="button" aria-label="Copy WhatsApp summary" title={copied === 'whatsapp' ? 'Copied' : 'WhatsApp summary'} onClick={() => copy(true)}
              style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 4, cursor: 'pointer' }}>
              <WhatsAppGlyph color={token('color.icon.success', '#22A06B')} />
            </button>
          </div>
        )}
      </div>

      {/* Invalid (< 5 min) */}
      {!s.is_valid ? (
        <div style={{ fontSize: 12, color: token('color.text.subtlest', '#626F86'), fontStyle: 'italic' }}>
          Ran under 5 minutes — no summary captured.
        </div>
      ) : (
        <>
          {genLoading && !summary && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: token('color.text.subtlest', '#626F86'), marginBottom: 10 }}>
              <Spinner size="small" /> Generating summary…
            </div>
          )}
          {summary && (
            <div style={{ fontSize: 13, color: token('color.text', '#172B4D'), lineHeight: '18px', marginBottom: tickets.length ? 10 : 0, whiteSpace: 'pre-wrap' }}>{summary}</div>
          )}
          {tickets.length === 0 && !summary && !genLoading && (
            <div style={{ fontSize: 12, color: token('color.text.subtlest', '#626F86') }}>No tracked changes by the driver.</div>
          )}
          {tickets.map((t) => (
            <div key={t.key} style={{ marginBottom: 8 }}>
              <button type="button" onClick={() => onOpenTicket(t.key)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t.type ? <JiraIssueTypeIcon type={t.type} size={16} /> : null}
                <span style={{ fontSize: 13, fontWeight: 600, color: token('color.link', '#0C66E4') }}>{t.key}</span>
              </button>
              <div style={{ paddingLeft: 22 }}>
                {t.items.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: token('color.text.subtle', '#44546F'), lineHeight: '18px' }}>{changeDesc(c)}</div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export const StandupHistoryPanel: React.FC<Props> = ({ projectKey, open, onClose }) => {
  const { data: sessions, isLoading } = useStandupHistory(projectKey, open);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const openDetail = (key: string) => useGlobalSearchStore.getState().openDetail({ id: key });

  const groups = useMemo(() => {
    const map = new Map<string, StandupSession[]>();
    for (const s of sessions ?? []) {
      const label = dayLabel(s.started_at);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(s);
    }
    return Array.from(map.entries());
  }, [sessions]);

  if (!open) return null;

  const isCollapsed = (label: string) => label !== 'Today' && collapsedDays.has(label);
  const toggleDay = (label: string) => setCollapsedDays((s) => { const n = new Set(s); n.has(label) ? n.delete(label) : n.add(label); return n; });

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: token('color.blanket', 'rgba(9,30,66,0.36)'), zIndex: 9998 }} />
      <aside style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, maxWidth: '92vw', background: token('elevation.surface', '#FFFFFF'), borderLeft: `1px solid ${token('color.border', '#DFE1E6')}`, boxShadow: token('elevation.shadow.overlay', '-8px 0 24px rgba(9,30,66,0.16)'), zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: `1px solid ${token('color.border', '#091E4224')}` }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: token('color.text', '#172B4D') }}>Standup history</span>
          <button type="button" aria-label="Close" onClick={onClose}
            style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 4, cursor: 'pointer' }}>
            <CrossIcon label="" size="medium" primaryColor={token('color.icon.subtle', '#44546F')} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="medium" /></div>
          ) : groups.length === 0 ? (
            <div style={{ fontSize: 13, color: token('color.text.subtlest', '#626F86'), textAlign: 'center', padding: 32 }}>No standups in the last 14 days.</div>
          ) : (
            groups.map(([label, daySessions]) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <button type="button" onClick={() => toggleDay(label)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', border: 'none', background: 'transparent', padding: '4px 0 8px', cursor: label === 'Today' ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                  {label !== 'Today' && (isCollapsed(label) ? <ChevronRightIcon label="" size="small" primaryColor={token('color.icon.subtle', '#44546F')} /> : <ChevronDownIcon label="" size="small" primaryColor={token('color.icon.subtle', '#44546F')} />)}
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: token('color.text.subtlest', '#626F86') }}>{label}</span>
                  <span style={{ flex: 1, height: 1, background: token('color.border', '#091E4224'), marginLeft: 8 }} />
                </button>
                {!isCollapsed(label) && daySessions.map((s) => <SessionCard key={s.id} s={s} onOpenTicket={openDetail} />)}
              </div>
            ))
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
};

function WhatsAppGlyph({ color }: { color: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.97L2 22l5.25-1.38c1.46.8 3.1 1.22 4.79 1.22 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.02c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.04c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.82c0 4.55-3.7 8.07-8.18 8.07zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z"/>
    </svg>
  );
}
