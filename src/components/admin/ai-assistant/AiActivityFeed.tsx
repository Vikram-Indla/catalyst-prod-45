import React from 'react';
import { T } from './tokens';
import { Icon, ICONS } from './icons';
import { RiskLozenge } from './RiskLozenge';
import { Lozenge, Button } from '@/components/ads';
import type { RunState, ConfirmationEntry } from './aiAdminConsole.types';

type Kind = 'done' | 'active' | 'pending';

function StepDot({ kind }: { kind: Kind }) {
  const base: React.CSSProperties = { display: 'flex', width: 18, height: 18, borderRadius: '50%', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' };
  if (kind === 'done') return <span style={{ ...base, background: T.textSuccess, color: T.inverse }}><Icon path={ICONS.check} size={11} w={3} /></span>;
  if (kind === 'active') return <span style={{ ...base, border: `2px solid ${T.link}`, color: T.link, animation: 'cc-spin 1s linear infinite' }}><Icon path={ICONS.spinner} size={11} w={3} /></span>;
  return <span style={{ ...base, border: `2px solid ${T.borderBold}` }} />;
}

/** Live checkpoint card: thinking (indeterminate) → steps (determinate). */
function RunningCard({ r }: { r: RunState }) {
  const thinking = r.phase === 'thinking';
  const pct = thinking ? 0 : Math.round((r.cur / r.labels.length) * 100);
  return (
    <div style={{ border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.link}`, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.borderSubtle}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: T.link, animation: 'cc-spin 1s linear infinite', display: 'inline-flex' }}><Icon path={ICONS.spinner} size={16} w={2.4} /></span>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{r.title}</span>
          <RiskLozenge risk={r.risk} />
          <span style={{ marginLeft: 'auto', fontSize: 12, color: T.subtlest, fontVariantNumeric: 'tabular-nums' }}>
            {thinking ? 'Working…' : `Step ${Math.min(r.cur + 1, r.labels.length)} of ${r.labels.length} · ${pct}%`}
          </span>
        </div>
        <div style={{ fontSize: 12, color: T.subtle, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.request}</div>
        {thinking ? (
          <div style={{ height: 6, borderRadius: 3, background: T.btnDefault, marginTop: 10, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, width: '30%', borderRadius: 3, background: T.link, animation: 'cc-bar 1.1s ease-in-out infinite' }} />
          </div>
        ) : (
          <div style={{ height: 6, borderRadius: 3, background: T.btnDefault, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: T.link, width: `${pct}%`, transition: 'width .35s' }} />
          </div>
        )}
      </div>

      {thinking ? (
        <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: T.subtle }}>
          <span style={{ color: T.link, animation: 'cc-spin 1s linear infinite', display: 'inline-flex' }}><Icon path={ICONS.spinner} size={15} w={2.4} /></span>
          Understanding your request…
        </div>
      ) : (
        <div style={{ padding: '8px 14px' }}>
          {r.labels.map((label, i) => {
            const kind: Kind = i < r.cur ? 'done' : (i === r.cur ? 'active' : 'pending');
            let detail = kind === 'done' ? 'Done' : kind === 'active' ? 'Working…' : 'Waiting';
            if (label.startsWith('Applying')) detail = kind === 'done' ? (r.bulk ? `${r.count} of ${r.count} done` : 'Applied') : kind === 'active' ? (r.bulk ? `${r.count} of ${r.count}…` : 'Applying…') : detail;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '7px 0' }}>
                <StepDot kind={kind} />
                <span style={{ fontSize: 13, color: kind === 'pending' ? T.subtlest : T.text, fontWeight: kind === 'active' ? 600 : kind === 'done' ? 500 : 400 }}>{label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: T.subtlest }}>{detail}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoryCard({ h, onAgain, onBulk }: { h: ConfirmationEntry; onAgain: () => void; onBulk: () => void }) {
  return (
    <div style={{ border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.textSuccess}`, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: T.bgSuccess, borderBottom: `1px solid ${T.borderSubtle}`, flexWrap: 'wrap' }}>
        <span style={{ color: T.textSuccess, display: 'inline-flex' }}><Icon path={ICONS.checkC} size={16} w={2.2} /></span>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.textSuccess }}>{h.headline}</span>
        <Lozenge appearance="success">{h.bulk ? 'Bulk · done' : 'Done'}</Lozenge>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: T.subtlest }}>{h.time}</span>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 12, color: T.subtle, marginBottom: 8, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{h.request}"</div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{h.summary}</div>
        {h.novel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, fontSize: 12, color: T.textDiscovery, background: T.bgDiscovery, borderRadius: 6, padding: '8px 10px' }}>
            <span style={{ display: 'inline-flex', flex: '0 0 auto' }}><Icon path={ICONS.spark} size={14} fill={T.textDiscovery} /></span>
            Saved so you can reuse this next time.
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.borderSubtle}`, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: T.subtle }}>Audit <span style={{ fontFamily: 'var(--ds-font-family-monospace, monospace)', fontWeight: 600, color: T.text }}>{h.auditId}</span></span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Button appearance="default" onClick={onAgain}>Run again</Button>
            <Button appearance="subtle" onClick={onBulk}>{h.bulk ? 'Run again' : 'Make it bulk'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type Console = ReturnType<typeof import('./useAiCommandConsole').useAiCommandConsole>;

export function AiActivityFeed({ c }: { c: Console }) {
  const empty = !c.running && c.history.length === 0;
  return (
    <section style={{ background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: T.shadowRaised, minHeight: 340 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${T.borderSubtle}` }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Activity</span>
        <span style={{ fontSize: 12, color: T.subtlest }}>{empty ? 'Nothing run yet' : `${c.history.length} recent · this session`}</span>
      </div>
      <div style={{ padding: 16 }}>
        {c.running && <RunningCard r={c.running} />}
        {empty && (
          <div style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: T.btnDefault, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.iconSubtle }}><Icon path={ICONS.terminal} size={22} w={1.7} /></div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginTop: 12 }}>Nothing running yet</div>
            <p style={{ fontSize: 13, color: T.subtle, margin: '5px auto 0', maxWidth: 400, lineHeight: 1.5 }}>Describe a change above, or pick one from the library. Each request shows live progress here, then a clear confirmation of what changed.</p>
          </div>
        )}
        {c.history.map(h => (
          <HistoryCard key={h.id} h={h} onAgain={() => c.setComposer(h.request)} onBulk={() => c.setComposer(h.request)} />
        ))}
      </div>
    </section>
  );
}
