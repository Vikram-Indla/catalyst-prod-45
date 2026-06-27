import React, { useState } from 'react';
import { Button, Lozenge, Textfield } from '@/components/ads';
import { T } from './tokens';
import { Icon, ICONS, catIcon } from './icons';
import { RiskLozenge, BulkTag } from './RiskLozenge';
import type { CommandGroup, ConfirmState } from './aiAdminConsole.types';

const ENTITY_BADGE: Record<string, { color: string; label: string }> = {
  person:     { color: 'var(--ds-background-information-bold)', label: 'P' },
  role:       { color: 'var(--ds-background-success-bold)',     label: 'R' },
  department: { color: 'var(--ds-background-warning-bold)',     label: 'D' },
};

type Console = ReturnType<typeof import('./useAiCommandConsole').useAiCommandConsole>;

/** Autocomplete palette — renders IN-FLOW under the input (never absolute). */
function Palette({ groups, empty, query, entitySuggestions, onPickEntity }: {
  groups: CommandGroup[];
  empty: boolean;
  query: string;
  entitySuggestions: Console['entitySuggestions'];
  onPickEntity: Console['pickEntity'];
}) {
  const hasEntities = entitySuggestions.length > 0;
  return (
    <div style={{ marginTop: 8, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: T.shadowRaised, maxHeight: 360, overflowY: 'auto', padding: 6 }}>
      {hasEntities && (
        <div>
          <div style={{ padding: '6px 8px 2px', fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: T.subtlest }}>People, roles &amp; departments</div>
          {entitySuggestions.map((s, i) => {
            const badge = ENTITY_BADGE[s.type] ?? ENTITY_BADGE.department;
            return (
              <button key={i} onMouseDown={() => onPickEntity(s)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', background: 'transparent', borderRadius: 5, padding: '8px 10px', cursor: 'pointer', font: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.selected)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: badge.color, color: 'var(--ds-text-inverse)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flex: '0 0 auto' }}>
                  {badge.label}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                  <span style={{ display: 'block', fontSize: 12, color: T.subtlest }}>{s.subtitle}</span>
                </span>
                <span style={{ fontSize: 11, color: T.disabled, textTransform: 'capitalize', flex: '0 0 auto' }}>{s.type}</span>
              </button>
            );
          })}
          {groups.length > 0 && <div style={{ height: 1, background: T.borderSubtle, margin: '4px 8px' }} />}
        </div>
      )}
      {empty && (
        <div style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ color: T.textDiscovery, flex: '0 0 auto', marginTop: 1 }}><Icon path={ICONS.spark} size={16} fill={T.textDiscovery} /></span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Not a saved request — run it anyway</div>
            <div style={{ fontSize: 12, color: T.subtlest, marginTop: 2 }}>The assistant will prepare "{query}", run it step by step, and remember it so it's quicker next time.</div>
          </div>
        </div>
      )}
      {groups.map(g => (
        <div key={g.cat}>
          <div style={{ padding: '6px 8px 2px', fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: T.subtlest }}>{g.cat}</div>
          {g.items.map((it, i) => (
            <button key={i} onMouseDown={it.onPick} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', background: 'transparent', borderRadius: 5, padding: '8px 10px', cursor: 'pointer', font: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.background = T.selected)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ color: T.iconSubtle, flex: '0 0 auto' }}><Icon path={catIcon(it.cat)} size={15} w={1.8} /></span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{it.title}</span>{it.bulk && <BulkTag />}
                </span>
                <span style={{ display: 'block', fontSize: 12, color: T.subtlest, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.desc}</span>
              </span>
              <RiskLozenge risk={it.risk} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Plan preview + confirm bar. Always shown before any execution. */
function InlineConfirm({ confirm, onCancel, onConfirm }: { confirm: ConfirmState; onCancel: () => void; onConfirm: () => void }) {
  const high = confirm.risk === 'High';
  const bg = high ? T.bgDanger : T.bgInfo;
  const accent = high ? T.textDanger : T.textDiscovery;
  const iconPath = high ? ICONS.warn : ICONS.spark;
  return (
    <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 6, background: bg, border: `1px solid ${high ? T.textDanger : T.borderSubtle}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ color: accent, flex: '0 0 auto', marginTop: 1 }}>
          <Icon path={iconPath} size={16} w={2} fill={high ? undefined : accent} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{confirm.title}</div>
          <div style={{ fontSize: 12, color: T.subtle, marginTop: 2, lineHeight: 1.4 }}>{confirm.body}</div>
          {confirm.steps && confirm.steps.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {confirm.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: T.text }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, flex: '0 0 auto' }} />
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flex: '0 0 auto', alignSelf: 'flex-start' }}>
          <Button appearance="subtle" onClick={onCancel}>Cancel</Button>
          <Button appearance={high ? 'danger' : 'primary'} onClick={onConfirm}>Confirm & run</Button>
        </div>
      </div>
    </div>
  );
}

export function AiCommandComposer({ c }: { c: ReturnType<typeof import('./useAiCommandConsole').useAiCommandConsole> }) {
  const [hoverClear, setHoverClear] = useState(false);
  const statusLoz =
    c.statusKind === 'ready' ? <Lozenge appearance="default">Ready</Lozenge>
    : c.statusKind === 'match' ? <Lozenge appearance="inprogress">Ready to run</Lozenge>
    : <Lozenge appearance="new">New request</Lozenge>;

  return (
    <div style={{ background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: T.shadowRaised }}>
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.subtle }}>Your request</span>
        <span style={{ fontSize: 11, color: T.subtlest }}>Type <Kbd>/</Kbd> to browse · <Kbd>Enter</Kbd> to run</span>
        <span style={{ marginLeft: 'auto' }}>{statusLoz}</span>
      </div>

      <div style={{ padding: '12px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `2px solid ${c.focused ? T.link : T.border}`, background: T.bgInput, borderRadius: 6, padding: '0 12px', height: 48, transition: 'border-color .12s' }}>
          <span style={{ color: T.link, flex: '0 0 auto' }}><Icon path={ICONS.plane} size={18} w={2} /></span>
          <input
            value={c.composer}
            onChange={e => c.setComposer(e.target.value)}
            onFocus={c.onFocus} onBlur={c.onBlur}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); c.run(); } if (e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
            placeholder="e.g. Make Vikram a Product Owner   ·   Reset password for maria@catalyst.io"
            aria-label="Admin request"
            style={{ flex: 1, alignSelf: 'stretch', border: 'none', outline: 'none', background: 'transparent', font: 'inherit', fontSize: 15, color: T.text, minWidth: 0 }}
          />
          {c.composer && (
            <button onMouseEnter={() => setHoverClear(true)} onMouseLeave={() => setHoverClear(false)} onClick={() => c.setComposer('')}
              style={{ border: 'none', background: 'transparent', color: hoverClear ? T.text : T.subtlest, cursor: 'pointer', fontSize: 12, padding: 4, font: 'inherit' }}>Clear</button>
          )}
          <Button appearance="primary" onClick={c.run} iconAfter={<Icon path={ICONS.send} size={14} w={2} />}>Run</Button>
        </div>

        {c.paletteOpen && !c.confirm && (
          <Palette
            groups={c.paletteGroups}
            empty={c.paletteEmpty}
            query={c.composer}
            entitySuggestions={c.entitySuggestions}
            onPickEntity={c.pickEntity}
          />
        )}
        {c.confirm && <InlineConfirm confirm={c.confirm} onCancel={c.cancelConfirm} onConfirm={c.confirmRun} />}

        {c.composer.trim() === '' && !c.focused && !c.running && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            <span style={{ fontSize: 11, color: T.subtlest, alignSelf: 'center', marginRight: 2 }}>Try:</span>
            {c.chips.map((chip, i) => (
              <button key={i} onClick={chip.onPick}
                style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 12px', border: `1px solid ${T.border}`, background: T.surface, color: T.subtle, borderRadius: 14, font: 'inherit', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.surfaceSunken)} onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                {chip.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, color: T.subtlest, marginTop: 8 }}>The assistant prepares a plan first. No change is made without your confirmation.</div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd style={{ fontFamily: 'var(--ds-font-family-monospace, monospace)', fontSize: 10, border: `1px solid ${T.border}`, borderRadius: 3, padding: '0 4px' }}>{children}</kbd>;
}
