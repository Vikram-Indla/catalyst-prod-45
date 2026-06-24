/**
 * R360 Ring View — V13 ADS Token + Visual Redesign
 * Extracted from R360MemberDetail.tsx
 *
 * V13 changes (2026-05-11 — preflight Row 4+5):
 * - All --cp-* CSS vars → token() from @atlaskit/tokens (CLAUDE.md 2026-05-11 ban)
 * - All raw hex / --ds-text-* misuse → proper ADS semantic tokens
 * - Centre avatar 56px → 72px (ring-view visual redesign)
 * - Ring canvas height viewport-proportional: clamp(480px, W×0.62, 700px)
 * - SVG spokes: token(color.border) dashed 1.5px (subtle, not text-disabled)
 * - Orbital card layout: 3 rows (icon+key+age compact · title · status)
 *   removed noisy uppercase item_type text label and priority text
 * - fontFamily: system monospace stack (was --cp-font-mono)
 * - isDark usage removed — token() resolves dark/light natively via --ds-* vars
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { token } from '@atlaskit/tokens';
import { CalendarX2 } from '@/lib/atlaskit-icons';
import { useTheme } from '@/hooks/useTheme';
import { initials } from '@/utils/r360Utils';
import { getJiraIcon } from '@/components/r360/R360JiraIcons';
import type { R360WorkItem } from '@/types/r360';
import {
  CARD_W, CARD_H, SLOT_POSITIONS, PAGE_SIZE,
  getCardPixelPosDynH, getSpokeEndpoints,
  getFromTagClass, getFromTagPrefix,
} from './helpers';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';
import { MiniAvatar } from './SmallComponents';
import { PresenceRing } from '@/components/shared/PresenceRing';
import type { PresenceState } from '@/lib/presence';

// ── Monospace font stack (replaces --cp-font-mono) ──────────────────────────
const MONO = '"ui-monospace","SFMono-Regular","SF Mono",Menlo,monospace';

// ── Token aliases ──────────────────────────────────────────────────────────
// Using function-call form so they resolve correctly in both light + dark modes
// via the --ds-* CSS variable system at runtime.
const T = {
  surface:           () => token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
  surfaceRaised:     () => token('elevation.surface.raised', 'var(--ds-surface, #FFFFFF)'),
  bgNeutral:         () => token('color.background.neutral', 'var(--ds-background-neutral, #F1F2F4)'),
  bgNeutralSubtle:   () => token('color.background.neutral.subtle', 'var(--ds-surface-sunken, #F7F8F9)'),
  bgNeutralHovered:  () => token('color.background.neutral.hovered', '#E9EAEB'),
  bgSuccessBold:     () => token('color.background.success.bold', 'var(--ds-background-success-bold, #1F845A)'),
  bgInfoBold:        () => token('color.background.information.bold', 'var(--cp-primary-60, #0052CC)'),
  text:              () => token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
  textSubtle:        () => token('color.text.subtle', 'var(--ds-icon-subtle, #626F86)'),
  textSubtlest:      () => token('color.text.subtlest', 'var(--ds-text-disabled, #8590A2)'),
  textDisabled:      () => token('color.text.disabled', 'var(--ds-text-disabled, #8590A2)'),
  textInverse:       () => token('color.text.inverse', 'var(--ds-surface, #FFFFFF)'),
  textInfo:          () => token('color.text.information', 'var(--ds-link, #0C66E4)'),
  textWarning:       () => token('color.text.warning', 'var(--ds-text-warning, #974F0C)'),
  textDanger:        () => token('color.text.danger', 'var(--ds-text-danger, #AE2A19)'),
  textSuccess:       () => token('color.text.success', 'var(--ds-text-success, #216E4E)'),
  iconSuccess:       () => token('color.icon.success', 'var(--ds-background-success-bold, #1F845A)'),
  iconInverse:       () => token('color.icon.inverse', 'var(--ds-surface, #FFFFFF)'),
  iconDisabled:      () => token('color.icon.disabled', 'var(--ds-text-disabled, #8590A2)'),
  border:            () => token('color.border', '#091E4224'),
  borderBold:        () => token('color.border.bold', 'var(--ds-text-disabled, #8590A2)'),
  borderSuccess:     () => token('color.border.success', 'var(--ds-background-success-bold, #1F845A)'),
} as const;

export function RingView({ items, name, role, avatarUrl, onSelect, selected, overview, onAvatarClick, presenceState }: {
  items: R360WorkItem[]; name: string; role: string; avatarUrl?: string | null;
  onSelect: (i: R360WorkItem) => void; selected: R360WorkItem | null;
  overview?: { department?: string } | null;
  onAvatarClick?: () => void;
  presenceState?: PresenceState | null;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1000);
  const [showDone, setShowDone] = useState(false);
  const [ringPage, setRingPage] = useState(0);

  const measure = useCallback(() => {
    if (canvasRef.current) setW(canvasRef.current.offsetWidth);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    if (!showDone) return;
    const handler = (e: MouseEvent) => {
      if (doneRef.current && !doneRef.current.contains(e.target as Node)) setShowDone(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDone]);

  useEffect(() => {
    if (!showDone) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDone(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showDone]);

  // Viewport-proportional canvas height — Decision C (preflight 2026-05-11)
  const ringH = useMemo(() => Math.max(480, Math.min(700, Math.round(W * 0.62))), [W]);

  const nonDone = items.filter(i => i.status_category !== 'done');
  // Reset page when items change
  useEffect(() => { setRingPage(0); }, [items.length]);
  const doneItems = items.filter(i => i.status_category === 'done');
  const doneCount = doneItems.length;
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(nonDone.length / PAGE_SIZE));
  const safePage = Math.min(ringPage, totalPages - 1);
  const visible = nonDone.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const showSummaryCard = nonDone.length <= 2;

  const CX = W / 2;
  const CY = ringH * 0.44;

  const isHighPriority = (p: string) => {
    const l = (p || '').toLowerCase();
    return l === 'high' || l === 'highest' || l === 'critical';
  };
  const isMediumPriority = (p: string) => (p || '').toLowerCase() === 'medium';

  // Connector spokes — computed against dynamic ringH
  const spokes = useMemo(() => {
    return visible.map((_, i) => {
      const cardCenter = getCardPixelPosDynH(i, W, ringH);
      return getSpokeEndpoints(CX, CY, cardCenter.x, cardCenter.y);
    });
  }, [visible.length, W, ringH, CX, CY]);

  // Stale count for summary card
  const staleItems = nonDone.filter(i => (i.age_days || 0) > 14);

  // Avatar gradient (brand blue → teal, resolves in both modes via token())
  const avatarGradient = `linear-gradient(135deg,${T.bgInfoBold()},${T.bgSuccessBold()})`;

  // ── COMPLETED BADGE (shared between both modes) ──────────────────────────
  const completedBadge = (
    <div ref={doneRef} className="r3-completed-badge"
      tabIndex={0} role="button" aria-label="View completed items"
      data-testid="r360-completed-badge"
      onClick={() => setShowDone(prev => !prev)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowDone(prev => !prev); } }}
    >
      <div className={`r3-completed-circle ${doneCount === 0 ? 'empty' : ''}`}>
        {doneCount > 0 ? doneCount : '—'}
      </div>
      <span className={`r3-completed-text ${doneCount === 0 ? 'empty' : ''}`}>Completed</span>

      {/* COMPLETED PANEL POPOVER
          2026-05-31 BUG FIX: previously gated on `doneCount > 0`, which meant
          clicking the empty (dashed) badge did nothing visible — the click
          fired and showDone flipped, but the popover never rendered. Now the
          popover always renders when showDone is true; an empty-state body
          is shown when doneCount === 0 so the user gets feedback instead of
          assuming the button is broken. */}
      {showDone && (
        <div className="r3-completed-panel" role="dialog" aria-label="Completed items this week" aria-modal="true"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border()}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: T.bgSuccessBold(),
                border: `1.5px solid ${T.borderSuccess()}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke={T.iconInverse()} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text() }}>Completed This Week</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.textInverse(), background: T.bgSuccessBold(), padding: '2px 8px', borderRadius: 12 }}>{doneCount}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setShowDone(false); }}
              style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.border()}`, borderRadius: 4, background: T.surface(), cursor: 'pointer', color: T.textSubtle(), fontSize: 14 }}
              aria-label="Close completed panel"
            >{'✕'}</button>
          </div>

          {/* Throughput */}
          <div style={{ padding: '8px 16px', fontSize: 12, color: T.textSubtle(), borderBottom: `1px solid ${T.border()}` }}>
            {doneCount} of {totalItems} total resolved ({totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0}%)
          </div>

          {/* Empty state — when doneCount === 0, replace item list with
              a friendly message so the click feels intentional, not broken. */}
          {doneCount === 0 && (
            <div style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: T.textSubtle(),
              fontSize: 13,
              lineHeight: '18px',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✨</div>
              <div style={{ fontWeight: 600, color: T.text(), marginBottom: 4 }}>
                Nothing completed yet this week
              </div>
              <div style={{ fontSize: 12 }}>
                Resolve work items to fill this badge.
              </div>
            </div>
          )}

          {/* Item list — only when there are items to show */}
          <div style={{ maxHeight: 280, overflowY: 'auto', scrollbarWidth: 'thin' }}>
            {doneItems.map(item => {
              const closedDate = item.resolved_at || item.updated_at;
              const resolvedLabel = closedDate ? new Date(closedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
              return (
                <div key={item.id}
                  onClick={(e) => { e.stopPropagation(); onSelect(item); setShowDone(false); }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', cursor: 'pointer', borderBottom: `1px solid ${T.border()}`, transition: 'background 80ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.bgNeutral())}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ flexShrink: 0, marginTop: 2 }}>{getJiraIcon(item.item_type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.textInfo(), fontFamily: MONO }}>{item.item_key}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: T.bgNeutral(), color: T.textSubtle() }}>{item.project_key}</span>
                      <CatalystStatusPill status="Done" statusCategory="done" interactive={false} compact />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 400, color: T.text(), lineHeight: '1.35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: T.textSubtle(), marginTop: 2, fontStyle: 'italic' }}>Resolved{resolvedLabel ? ` · ${resolvedLabel}` : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer — only when there are items the user can click into */}
          {doneCount > 0 && (
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border()}`, fontSize: 11, color: T.textSubtlest(), textAlign: 'center', fontStyle: 'italic' }}>
              Click any item to view details
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════
  // SUMMARY CARD (≤2 open items)
  // ══════════════════════════════════════════
  if (showSummaryCard) {
    return (
      <div ref={canvasRef} className="r3-ring-canvas" style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          maxWidth: 520, width: '100%', padding: '40px 32px',
          background: T.surface(),
          border: `1px solid ${T.border()}`,
          borderRadius: 12,
          boxShadow: '0 1px 3px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.08))',
          textAlign: 'center' as const,
        }}>
          {/* Avatar — 72px */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 8px',
            overflow: 'hidden',
            background: avatarUrl ? T.surface() : avatarGradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.08))',
            border: `2px solid ${T.surface()}`,
            outline: `1px solid ${T.border()}`,
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <span style={{ fontSize: 22, fontWeight: 700, color: T.textInverse() }}>{initials(name)}</span>
            )}
          </div>

          {/* Name + Role */}
          <div style={{ fontSize: 16, fontWeight: 600, color: T.text() }}>{name}</div>
          <div style={{ fontSize: 13, color: T.textSubtle(), marginBottom: 16 }}>{role}</div>

          {/* Week Stats Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: T.text() }}>{nonDone.length} open</span>
            <span style={{ color: T.textSubtlest() }}>&middot;</span>
            <span style={{ fontWeight: 600, color: staleItems.length > 0 ? T.textDanger() : T.text() }}>{staleItems.length} stale</span>
            <span style={{ color: T.textSubtlest() }}>&middot;</span>
            <span style={{ fontWeight: 600, color: doneCount > 0 ? T.textSuccess() : T.text() }}>{doneCount} done</span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: T.border(), margin: '20px 0', width: '100%' }} />

          {/* Open Items */}
          {nonDone.length > 0 && (
            <div style={{ textAlign: 'left' as const, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textSubtle(), letterSpacing: '0.04em', marginBottom: 10 }}>Open items</div>
              {nonDone.map(item => {
                const hasHighP = isHighPriority(item.priority);
                const hasMedP = isMediumPriority(item.priority);
                const borderColor = hasHighP ? T.textDanger() : hasMedP ? T.textWarning() : T.textSubtlest();
                const fromClass = getFromTagClass(item.age_days);
                return (
                  <div key={item.id} onClick={() => onSelect(item)} style={{
                    width: '100%', padding: '10px 14px',
                    border: `1px solid ${T.border()}`,
                    borderRadius: 6, borderInlineStart: `3px solid ${borderColor}`,
                    marginBottom: 8, cursor: 'pointer', background: T.surface(),
                    transition: 'box-shadow 0.15s ease',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 1px 4px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.12))'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {/* Compact header: icon + key + project + age */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                      {getJiraIcon(item.item_type)}
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.textInfo(), fontFamily: MONO }}>{item.item_key}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: T.bgNeutral(), color: T.textSubtle() }}>{item.project_key}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: item.age_days > 30 ? T.textWarning() : T.textSubtlest(), fontFamily: MONO }}>since {item.age_days} days</span>
                    </div>
                    {/* Title */}
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.text(), lineHeight: '1.35', marginBottom: 6 }}>{item.title}</div>
                    {/* Status + from-tag */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <CatalystStatusPill status={item.status} statusCategory={item.status_category} interactive={false} compact />
                      {item.carried_from_label && (
                        <span className={`r3-from-tag ${fromClass}`}>{getFromTagPrefix(item.age_days)}{item.carried_from_label}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed Section */}
          {doneItems.length > 0 && (
            <div style={{ textAlign: 'left' as const, borderInlineStart: `3px solid ${T.borderSuccess()}`, paddingInlineStart: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textSuccess(), letterSpacing: '0.04em', marginBottom: 10 }}>Completed</div>
              {doneItems.map(item => {
                const closedDate = item.resolved_at || item.updated_at;
                const resolvedLabel = closedDate ? new Date(closedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                return (
                  <div key={item.id} onClick={() => onSelect(item)} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: T.bgSuccessBold(), border: `1px solid ${T.borderSuccess()}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <svg width="8" height="8" viewBox="0 0 12 12">
                        <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke={T.iconInverse()} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: T.textInfo(), fontFamily: MONO }}>{item.item_key}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: T.bgNeutral(), color: T.textSubtle() }}>{item.project_key}</span>
                        <CatalystStatusPill status="Done" statusCategory="done" interactive={false} compact />
                      </div>
                      <div style={{ fontSize: 12, color: T.text(), marginTop: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: T.textSubtlest(), marginTop: 2 }}>Resolved{resolvedLabel ? ` · ${resolvedLabel}` : ''}</div>
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: 12, color: T.textSubtle(), marginTop: 8 }}>
                {doneCount} of {totalItems} total resolved ({totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0}%)
              </div>
            </div>
          )}

          {/* Zero-Everything State */}
          {nonDone.length === 0 && doneItems.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 0' }}>
              <CalendarX2 size={32} style={{ color: T.iconDisabled() }} />
              <span style={{ fontSize: 13, color: T.textSubtlest(), fontStyle: 'italic' }}>No activity recorded this week</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // NORMAL RING VIEW (3+ open items)
  // ══════════════════════════════════════════
  return (
    <div ref={canvasRef} className="r3-ring-canvas" style={{ marginTop: 8, overflow: 'visible', position: 'relative' }}>
      {/* SVG CONNECTORS — ADS border token, dashed, 1.5px (V13: was solid 2px text-disabled) */}
      <svg width={W} height={ringH} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none', overflow: 'visible' }}>
        {spokes.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke={T.borderBold()} strokeWidth={1.5} strokeDasharray="5 4" opacity={1} />
        ))}
      </svg>

      {/* CENTRE AVATAR — 72px with PresenceRing, z-index 2 */}
      <div
        onClick={onAvatarClick}
        style={{
          position: 'absolute', left: `${CX}px`, top: `${CY}px`,
          transform: 'translate(-50%,-50%)', zIndex: 2, cursor: onAvatarClick ? 'pointer' : 'default',
        }}>
        <PresenceRing name={name} src={avatarUrl} size="xlarge" state={presenceState ?? undefined} />
      </div>

      {/* ORBITAL CARDS — 8-slot, viewport-proportional positions */}
      {visible.map((item, i) => {
        if (i >= SLOT_POSITIONS.length) return null;
        const slotPos = SLOT_POSITIONS[i];
        const isSelected = selected?.id === item.id;
        const isContributor = item.role_on_item === 'Contributor';
        const hasHighPriority = isHighPriority(item.priority);
        const hasMedPriority = isMediumPriority(item.priority);
        const hasCarryover = !!item.carried_from_label;
        const fromClass = getFromTagClass(item.age_days);
        const priorityClass = hasHighPriority ? 'priority-high' : hasMedPriority ? 'priority-medium' : 'priority-low';
        const ageColor = item.age_days > 30 ? T.textWarning() : item.age_days > 14 ? T.textDanger() : T.textSubtlest();
        return (
          <div key={item.id} style={{ position: 'absolute', left: slotPos.left, top: slotPos.top }}>
            <div
              className={`r3-ring-card ${priorityClass} ${isSelected ? 'selected' : ''} ${hasCarryover ? 'carryover' : ''}`}
              onClick={() => onSelect(item)}
              tabIndex={0}
              data-testid={`r360-ring-card-${item.item_key}`}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.bgNeutralHovered(); }}
              onMouseLeave={e => { e.currentTarget.style.background = T.surface(); }}
            >
              {/* Row 1 (compact header): icon + key + project + age ── 20px */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, height: 20, marginBottom: 4 }}>
                {getJiraIcon(item.item_type)}
                <span style={{ fontSize: 11, fontWeight: 600, color: T.textInfo(), fontFamily: MONO, letterSpacing: '-0.01em' }}>{item.item_key}</span>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: T.bgNeutral(), color: T.textSubtle(), lineHeight: '14px', whiteSpace: 'nowrap' }}>{item.project_key}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: ageColor, fontFamily: MONO, whiteSpace: 'nowrap' }}>since {item.age_days} days</span>
              </div>

              {/* Row 2 (title): 2-line clamp, 12px/500 ── flex fills remaining space */}
              <div style={{ fontSize: 12, fontWeight: 500, color: T.text(), lineHeight: '1.35', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis', flex: '1 1 auto', minHeight: 0 } as React.CSSProperties}>{item.title}</div>

              {/* Row 3 (status bar): lozenge + from-tag + contributor ── 24px, pinned to bottom */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 'auto', flexShrink: 0, minHeight: 24 }}>
                {item.status && (
                  <CatalystStatusPill status={item.status} statusCategory={item.status_category} interactive={false} compact />
                )}
                {item.carried_from_label && (
                  <span className={`r3-from-tag ${fromClass}`} title="Carried over from an earlier period">
                    {getFromTagPrefix(item.age_days)}{item.carried_from_label}
                  </span>
                )}
                {isContributor && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, color: T.textSubtle() }}>
                    {'→'} <MiniAvatar name={item.assignee_name} size={16} /> {item.assignee_name}
                  </span>
                )}
              </div>
            </div>

          </div>
        );
      })}

      {/* PAGINATION INDICATOR */}
      {nonDone.length > PAGE_SIZE && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 600, color: T.textSubtle(),
          background: T.bgNeutralSubtle(),
          border: `1px solid ${T.border()}`,
          borderRadius: 12, padding: '3px 8px',
          fontFamily: MONO, zIndex: 8,
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); setRingPage(p => Math.max(0, p - 1)); }}
            disabled={safePage === 0}
            style={{
              background: 'none', border: 'none',
              cursor: safePage === 0 ? 'default' : 'pointer',
              color: safePage === 0 ? T.textDisabled() : T.textInfo(),
              fontSize: 13, fontWeight: 700, padding: '0 4px', lineHeight: 1,
            }}
            aria-label="Previous page"
          >{'‹'}</button>
          <span>
            {safePage * PAGE_SIZE + 1}&ndash;{Math.min((safePage + 1) * PAGE_SIZE, nonDone.length)} of {nonDone.length}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setRingPage(p => Math.min(totalPages - 1, p + 1)); }}
            disabled={safePage >= totalPages - 1}
            style={{
              background: 'none', border: 'none',
              cursor: safePage >= totalPages - 1 ? 'default' : 'pointer',
              color: safePage >= totalPages - 1 ? T.textDisabled() : T.textInfo(),
              fontSize: 13, fontWeight: 700, padding: '0 4px', lineHeight: 1,
            }}
            aria-label="Next page"
          >{'›'}</button>
        </div>
      )}

      {/* COMPLETED BADGE */}
      {completedBadge}

      {/* EMPTY STATE */}
      {items.length === 0 && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', color: T.textSubtle(), fontSize: 14 }}>
          No work items found for this week
        </div>
      )}
    </div>
  );
}
