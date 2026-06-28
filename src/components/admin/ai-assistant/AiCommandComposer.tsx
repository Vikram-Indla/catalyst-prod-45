import React, { useState, useRef } from 'react';
import { Button, Lozenge } from '@/components/ads';
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
          <div style={{ padding: '6px 8px 2px', fontSize: 'var(--ds-font-size-50)', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: T.subtlest }}>People, roles &amp; departments</div>
          {entitySuggestions.map((s, i) => {
            const badge = ENTITY_BADGE[s.type] ?? ENTITY_BADGE.department;
            return (
              <button key={i} onMouseDown={() => onPickEntity(s)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', background: 'transparent', borderRadius: 5, padding: '8px 10px', cursor: 'pointer', font: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.selected)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: badge.color, color: 'var(--ds-text-inverse)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--ds-font-size-50)', fontWeight: 700, flex: '0 0 auto' }}>
                  {badge.label}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                  <span style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>{s.subtitle}</span>
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.disabled, textTransform: 'capitalize', flex: '0 0 auto' }}>{s.type}</span>
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
            <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text }}>Not a saved request — run it anyway</div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtlest, marginTop: 2 }}>The assistant will prepare "{query}", run it step by step, and remember it so it's quicker next time.</div>
          </div>
        </div>
      )}
      {groups.map(g => (
        <div key={g.cat}>
          <div style={{ padding: '6px 8px 2px', fontSize: 'var(--ds-font-size-50)', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: T.subtlest }}>{g.cat}</div>
          {g.items.map((it, i) => (
            <button key={i} onMouseDown={it.onPick} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', background: 'transparent', borderRadius: 5, padding: '8px 10px', cursor: 'pointer', font: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.background = T.selected)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ color: T.iconSubtle, flex: '0 0 auto' }}><Icon path={catIcon(it.cat)} size={15} w={1.8} /></span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text }}>{it.title}</span>{it.bulk && <BulkTag />}
                </span>
                <span style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', color: T.subtlest, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.desc}</span>
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
          <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text }}>{confirm.title}</div>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle, marginTop: 2, lineHeight: 1.4 }}>{confirm.body}</div>
          {confirm.steps && confirm.steps.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {confirm.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--ds-font-size-200)', color: T.text }}>
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

/** Chip/token input — used when 1+ entities have been picked. */
function ChipInput({ chips, onRemove, onRemoveLast, composer, onChange, onFocus, onBlur, onKeyDown, isBulk }: {
  chips: Console['entityChips'];
  onRemove: (i: number) => void;
  onRemoveLast: () => void;
  composer: string;
  onChange: (v: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isBulk: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, cursor: 'text' }}
      onClick={() => inputRef.current?.focus()}
    >
      {chips.map((chip, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 26, padding: '0 6px 0 9px',
          background: 'var(--ds-background-selected)',
          border: '1px solid var(--ds-border-focused)',
          borderRadius: 13,
          fontSize: 'var(--ds-font-size-200)', fontWeight: 500,
          color: 'var(--ds-text-selected)',
          flexShrink: 0,
          maxWidth: 200,
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {chip.label}
          </span>
          <button
            onMouseDown={e => { e.preventDefault(); onRemove(i); }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, borderRadius: '50%',
              border: 'none', background: 'transparent',
              color: 'var(--ds-text-subtle)', cursor: 'pointer',
              fontSize: 'var(--ds-font-size-400)', lineHeight: 1, padding: 0, flexShrink: 0,
            }}
            aria-label={`Remove ${chip.label}`}
          >×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={composer}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={e => {
          if (e.key === 'Backspace' && composer === '' && chips.length > 0) {
            e.preventDefault();
            onRemoveLast();
            return;
          }
          onKeyDown(e);
        }}
        placeholder={isBulk ? 'Add more people or type role…' : 'Type role or action…'}
        aria-label="Admin request"
        style={{
          flex: 1, minWidth: 120, height: 28,
          border: 'none', outline: 'none', background: 'transparent',
          font: 'inherit', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)',
        }}
      />
    </div>
  );
}

export function AiCommandComposer({ c }: { c: ReturnType<typeof import('./useAiCommandConsole').useAiCommandConsole> }) {
  const hasChips = c.entityChips.length > 0;
  const hasContent = hasChips || c.composer.trim() !== '';

  const statusLoz =
    c.statusKind === 'ready' ? <Lozenge appearance="default">Ready</Lozenge>
    : c.statusKind === 'match' ? <Lozenge appearance="inprogress">Ready to run</Lozenge>
    : <Lozenge appearance="new">New request</Lozenge>;

  const inputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); c.run(); }
    if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
  };

  return (
    <div style={{ background: 'var(--ds-surface-raised)', border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: T.shadowRaised }}>
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.subtle }}>Your request</span>
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>Type <Kbd>/</Kbd> to browse · <Kbd>Enter</Kbd> to run</span>
        <span style={{ marginLeft: 'auto' }}>{statusLoz}</span>
      </div>

      <div style={{ padding: '12px 16px 16px' }}>
        {/* Input row — chips variant when entities picked, plain input otherwise */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: `2px solid ${c.focused ? T.link : T.border}`,
          background: T.bgInput, borderRadius: 6,
          padding: hasChips ? '6px 10px' : '0 12px',
          minHeight: 48, transition: 'border-color .12s',
        }}>
          <span style={{ color: T.link, flex: '0 0 auto', alignSelf: 'center' }}>
            <Icon path={ICONS.plane} size={18} w={2} />
          </span>

          {hasChips ? (
            <ChipInput
              chips={c.entityChips}
              onRemove={c.removeChip}
              onRemoveLast={c.removeLastChip}
              composer={c.composer}
              onChange={v => c.setComposer(v)}
              onFocus={c.onFocus}
              onBlur={c.onBlur}
              onKeyDown={inputKeyDown}
              isBulk={c.isBulkMode}
            />
          ) : (
            <input
              value={c.composer}
              onChange={e => c.setComposer(e.target.value)}
              onFocus={c.onFocus}
              onBlur={c.onBlur}
              onKeyDown={inputKeyDown}
              placeholder="e.g. Make Vikram Indla a Product Owner   ·   Reset password for Sikander Ahmad"
              aria-label="Admin request"
              style={{ flex: 1, alignSelf: 'stretch', border: 'none', outline: 'none', background: 'transparent', font: 'inherit', fontSize: 'var(--ds-font-size-400)', color: T.text, minWidth: 0 }}
            />
          )}

          {hasContent && (
            <button
              onClick={c.clearAll}
              style={{ border: 'none', background: 'transparent', color: T.subtlest, cursor: 'pointer', fontSize: 'var(--ds-font-size-200)', padding: '4px 6px', font: 'inherit', flexShrink: 0, alignSelf: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.color = T.text)}
              onMouseLeave={e => (e.currentTarget.style.color = T.subtlest)}
            >Clear</button>
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

        {!hasContent && !c.focused && !c.running && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, alignSelf: 'center', marginRight: 2 }}>Try:</span>
            {c.quickChips.map((chip, i) => (
              <button key={i} onClick={chip.onPick}
                style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 12px', border: `1px solid ${T.border}`, background: T.surface, color: T.subtle, borderRadius: 14, font: 'inherit', fontSize: 'var(--ds-font-size-200)', fontWeight: 500, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.surfaceSunken)} onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                {chip.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtlest, marginTop: 8 }}>The assistant prepares a plan first. No change is made without your confirmation.</div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd style={{ fontFamily: 'var(--ds-font-family-monospace, monospace)', fontSize: 'var(--ds-font-size-50)', border: `1px solid ${T.border}`, borderRadius: 3, padding: '0 4px' }}>{children}</kbd>;
}
