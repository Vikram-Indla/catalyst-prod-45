/**
 * R360 Ring View — V12 Precision
 * Extracted from R360MemberDetail.tsx
 * Fixed 8-slot ring geometry around center avatar
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { CalendarX2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { initials } from '@/utils/r360Utils';
import { getJiraIcon } from '@/components/r360/R360JiraIcons';
import type { R360WorkItem } from '@/types/r360';
import {
  CARD_W, RING_CANVAS_H, SLOT_POSITIONS, PAGE_SIZE,
  getCardPixelPos, getSpokeEndpoints,
  getFromTagClass, getFromTagPrefix,
} from './helpers';
import { StatusLozenge } from './StatusLozenge';
import { MiniAvatar } from './SmallComponents';

export function RingView({ items, name, role, avatarUrl, onSelect, selected, overview, onAvatarClick }: {
  items: R360WorkItem[]; name: string; role: string; avatarUrl?: string | null;
  onSelect: (i: R360WorkItem) => void; selected: R360WorkItem | null;
  overview?: { department?: string } | null;
  onAvatarClick?: () => void;
}) {
  const { isDark } = useTheme();
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
  const CY = RING_CANVAS_H * 0.44;

  const isHighPriority = (p: string) => {
    const l = (p || '').toLowerCase();
    return l === 'high' || l === 'highest' || l === 'critical';
  };
  const isMediumPriority = (p: string) => (p || '').toLowerCase() === 'medium';

  // Compute connector spokes with avatar-edge -> card-edge offsets
  const spokes = useMemo(() => {
    return visible.map((_, i) => {
      const cardCenter = getCardPixelPos(i, W);
      return getSpokeEndpoints(CX, CY, cardCenter.x, cardCenter.y);
    });
  }, [visible.length, W, CX, CY]);

  // Stale count for summary card
  const staleItems = nonDone.filter(i => (i.age_days || 0) > 14);

  // ── COMPLETED BADGE (shared between both modes) ──
  const completedBadge = (
    <div ref={doneRef} className="r3-completed-badge"
      tabIndex={0} role="button" aria-label="View completed items"
      data-testid="r360-completed-badge"
      onClick={() => setShowDone(prev => !prev)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowDone(prev => !prev); } }}
    >
      <div className={`r3-completed-circle ${doneCount === 0 ? 'empty' : ''}`}>
        {doneCount > 0 ? doneCount : '\u2014'}
      </div>
      <span className={`r3-completed-text ${doneCount === 0 ? 'empty' : ''}`}>COMPLETED</span>

      {/* COMPLETED PANEL POPOVER */}
      {showDone && doneCount > 0 && (
        <div className="r3-completed-panel" role="dialog" aria-label="Completed items this week" aria-modal="true"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${'var(--cp-bg-sunken, #F1F5F9)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', background: '#1B7F37',
                border: '1.5px solid #16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="var(--ds-text-success, #16A34A)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 650, color: 'var(--cp-text-primary, #0F172A)' }}>Completed This Week</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-inverse, #FFFFFF)', background: '#1B7F37', padding: '2px 8px', borderRadius: '12px' }}>{doneCount}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setShowDone(false); }}
              style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: '4px', background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFF)', cursor: 'pointer', color: 'var(--cp-text-tertiary, #64748B)', fontSize: '14px' }}
              aria-label="Close completed panel"
            >{'\u2715'}</button>
          </div>
          {/* Throughput */}
          <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--cp-text-tertiary, #64748B)', borderBottom: `1px solid ${'var(--cp-bg-sunken, #F1F5F9)'}` }}>
            {doneCount} of {totalItems} total resolved ({totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0}%)
          </div>
          {/* Item list */}
          <div style={{ maxHeight: '280px', overflowY: 'auto', scrollbarWidth: 'thin' }}>
            {doneItems.map(item => {
              const closedDate = item.resolved_at || item.updated_at;
              const resolvedLabel = closedDate ? new Date(closedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
              return (
                <div key={item.id} onClick={(e) => { e.stopPropagation(); onSelect(item); setShowDone(false); }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #F8FAFC', transition: 'background 80ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-interact-hover, rgba(15,23,42,0.04))')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ flexShrink: 0, marginTop: '2px' }}>{getJiraIcon(item.item_type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ds-text-brand, #2563EB)', fontFamily: 'var(--cp-font-mono)' }}>{item.item_key}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--cp-bg-sunken, #F1F5F9)', color: 'var(--cp-text-tertiary, #64748B)' }}>{item.project_key}</span>
                      <StatusLozenge status="Done" />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 400, color: 'var(--cp-text-primary, #0F172A)', lineHeight: '1.35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--cp-text-tertiary, #64748B)', marginTop: '2px', fontStyle: 'italic' }}>Resolved{resolvedLabel ? ` \u00B7 ${resolvedLabel}` : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${'var(--cp-bg-sunken, #F1F5F9)'}`, fontSize: '11px', color: 'var(--cp-text-muted, #94A3B8)', textAlign: 'center', fontStyle: 'italic' }}>
            Click any item to view details
          </div>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════
  // ADAPTIVE EMPTY STATE -- Summary Card (<=2 open items)
  // ══════════════════════════════════════════
  if (showSummaryCard) {
    return (
      <div ref={canvasRef} className="r3-ring-canvas" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          maxWidth: '520px', width: '100%', padding: '40px 32px',
          background: 'var(--cp-bg-elevated, #FFFFFF)', border: '1px solid rgba(15,23,42,0.08)',
          borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          textAlign: 'center' as const,
        }}>
          {/* Avatar */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 8px',
            overflow: 'hidden',
            background: avatarUrl ? 'var(--ds-text-inverse, #FFFFFF)' : 'linear-gradient(135deg,var(--ds-text-brand, #2563EB),#0D9488)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '2px solid var(--ds-text-inverse, #FFFFFF)',
            outline: '1px solid rgba(15,23,42,0.08)',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <span style={{ fontSize: '22px', fontWeight: 700, color: 'white', fontFamily: 'var(--cp-font-heading)' }}>{initials(name)}</span>
            )}
          </div>

          {/* Name + Role */}
          <div style={{ fontSize: '16px', fontWeight: 650, color: 'var(--cp-text-primary, #0F172A)', fontFamily: 'var(--cp-font-heading)' }}>{name}</div>
          <div style={{ fontSize: '13px', color: 'var(--cp-text-tertiary, #64748B)', marginBottom: '16px' }}>{role}</div>

          {/* Week Stats Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', fontSize: '13px' }}>
            <span style={{ fontWeight: 650, color: 'var(--cp-text-secondary, #334155)' }}>{nonDone.length} open</span>
            <span style={{ color: 'var(--cp-text-muted, #94A3B8)' }}>&middot;</span>
            <span style={{ fontWeight: 650, color: staleItems.length > 0 ? 'var(--ds-text-danger, #DC2626)' : 'var(--ds-text-subtle, #334155)' }}>{staleItems.length} stale</span>
            <span style={{ color: 'var(--cp-text-muted, #94A3B8)' }}>&middot;</span>
            <span style={{ fontWeight: 650, color: doneCount > 0 ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--ds-text-subtle, #334155)' }}>{doneCount} done</span>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--cp-bg-sunken, #F1F5F9)', margin: '20px 0', width: '100%' }} />

          {/* Open Items Section */}
          {nonDone.length > 0 && (
            <div style={{ textAlign: 'left' as const, marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--cp-text-tertiary, #64748B)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '10px' }}>Open Items</div>
              {nonDone.map(item => {
                const hasHighP = isHighPriority(item.priority);
                const hasMedP = isMediumPriority(item.priority);
                const borderColor = hasHighP ? 'var(--ds-text-danger, #DC2626)' : hasMedP ? 'var(--ds-text-warning, #D97706)' : 'var(--ds-text-subtlest, #94A3B8)';
                const fromClass = getFromTagClass(item.age_days);
                return (
                  <div key={item.id} onClick={() => onSelect(item)} style={{
                    width: '100%', padding: '12px 16px', border: '1px solid rgba(15,23,42,0.08)',
                    borderRadius: '6px', borderInlineStart: `3px solid ${borderColor}`,
                    marginBottom: '8px', cursor: 'pointer', background: 'var(--cp-bg-elevated, #FFFFFF)',
                    transition: 'box-shadow 0.15s ease',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {/* Row 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {getJiraIcon(item.item_type)}
                        <span style={{ fontSize: '11px', fontWeight: 650, textTransform: 'uppercase' as const, color: 'var(--cp-text-secondary, #334155)' }}>{item.item_type}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--cp-text-tertiary, #64748B)' }}>{item.priority}</span>
                    </div>
                    {/* Row 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text-brand, #2563EB)', fontFamily: 'var(--cp-font-mono)' }}>{item.item_key}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--cp-bg-sunken, #F1F5F9)', color: 'var(--cp-text-tertiary, #64748B)' }}>{item.project_key}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: 'var(--cp-bg-page, #F8FAFC)', color: item.age_days > 30 ? 'var(--ds-text-warning, #D97706)' : 'var(--ds-text-subtlest, #64748B)', fontFamily: 'var(--cp-font-mono)' }}>{item.age_days}d</span>
                    </div>
                    {/* Row 3 -- full title */}
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--cp-text-primary, #0F172A)', lineHeight: '1.35', marginBottom: '5px' }}>{item.title}</div>
                    {/* Row 4 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <StatusLozenge status={item.status} statusCategory={item.status_category} />
                      {item.carried_from_label && (
                        <span className={`r3-from-tag ${fromClass}`}>
                          {getFromTagPrefix(item.age_days)}{item.carried_from_label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed Section */}
          {doneItems.length > 0 && (
            <div style={{ textAlign: 'left' as const, borderInlineStart: '3px solid #16A34A', paddingInlineStart: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-inverse, #FFFFFF)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '10px' }}>Completed</div>
              {doneItems.map(item => {
                const closedDate = item.resolved_at || item.updated_at;
                const resolvedLabel = closedDate ? new Date(closedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                return (
                  <div key={item.id} onClick={() => onSelect(item)} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#1B7F37', border: '1px solid #16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <svg width="8" height="8" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="var(--ds-text-success, #16A34A)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ds-text-brand, #2563EB)', fontFamily: 'var(--cp-font-mono)' }}>{item.item_key}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--cp-bg-sunken, #F1F5F9)', color: 'var(--cp-text-tertiary, #64748B)' }}>{item.project_key}</span>
                        <StatusLozenge status="Done" />
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--cp-text-primary, #0F172A)', marginTop: '2px' }}>{item.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--cp-text-muted, #94A3B8)', marginTop: '2px' }}>Resolved{resolvedLabel ? ` \u00B7 ${resolvedLabel}` : ''}</div>
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: '12px', color: 'var(--cp-text-tertiary, #64748B)', marginTop: '8px' }}>
                {doneCount} of {totalItems} total resolved ({totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0}%)
              </div>
            </div>
          )}

          {/* Zero-Everything State */}
          {nonDone.length === 0 && doneItems.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px 0' }}>
              <CalendarX2 size={32} style={{ color: '#D4D4D8' }} />
              <span style={{ fontSize: '13px', color: 'var(--cp-text-muted, #94A3B8)', fontStyle: 'italic' }}>No activity recorded this week</span>
            </div>
          )}
        </div>

        {/* Completed badge hidden in summary mode -- items shown inline */}
      </div>
    );
  }

  // ══════════════════════════════════════════
  // NORMAL RING VIEW (3+ open items)
  // ══════════════════════════════════════════
  return (
    <div ref={canvasRef} className="r3-ring-canvas" style={{ marginTop: '8px', overflow: 'visible', position: 'relative' }}>
      {/* SVG CONNECTORS -- 2px solid var(--ds-text-disabled, #CBD5E1), avatar-edge to card-edge */}
      <svg width={W} height={RING_CANVAS_H} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none', overflow: 'visible' }}>
        {spokes.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke="var(--ds-text-disabled, #CBD5E1)" strokeWidth={2} opacity={1} />
        ))}
      </svg>

      {/* CENTER AVATAR -- 56px, z-index 2 */}
      <div
        onClick={onAvatarClick}
        style={{
        position: 'absolute', left: `${CX}px`, top: `${CY}px`,
        transform: 'translate(-50%,-50%)', zIndex: 2, cursor: onAvatarClick ? 'pointer' : 'default',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          overflow: 'hidden',
          background: avatarUrl ? 'var(--ds-text-inverse, #FFFFFF)' : 'linear-gradient(135deg,var(--ds-text-brand, #2563EB),#0D9488)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '2px solid var(--ds-text-inverse, #FFFFFF)',
          outline: '1px solid rgba(15,23,42,0.08)',
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>{initials(name)}</span>
          )}
        </div>
      </div>

      {/* ORBITAL CARDS -- 8-slot elliptical layout */}
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
        return (
          <div key={item.id} style={{ position: 'absolute', left: slotPos.left, top: slotPos.top }}>
            <div
              className={`r3-ring-card ${priorityClass} ${isSelected ? 'selected' : ''} ${hasCarryover ? 'carryover' : ''}`}
              onClick={() => onSelect(item)}
              tabIndex={0}
              data-testid={`r360-ring-card-${item.item_key}`}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--cp-interact-hover, rgba(15,23,42,0.04))'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--cp-bg-elevated, #FFFFFF)'; }}
            >
              {/* Row 1: type + priority -- fixed 18px */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexShrink: 0, height: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {getJiraIcon(item.item_type)}
                  <span style={{ fontSize: '11px', fontWeight: 650, textTransform: 'uppercase' as const, color: 'var(--cp-text-secondary, #334155)' }}>{item.item_type}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--cp-text-tertiary, #64748B)' }}>{item.priority}</span>
              </div>
              {/* Row 2: key + project badge + age -- fixed 18px */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', flexShrink: 0, height: '18px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text-brand, #2563EB)', fontFamily: 'var(--cp-font-mono)' }}>{item.item_key}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--cp-bg-sunken, #F1F5F9)', color: 'var(--cp-text-tertiary, #64748B)' }}>{item.project_key}</span>
                <span style={{
                  marginLeft: 'auto', fontSize: '10px', fontWeight: 600,
                  padding: '1px 6px', borderRadius: '4px', background: 'var(--cp-bg-page, #F8FAFC)',
                  color: item.age_days > 30 ? 'var(--ds-text-warning, #D97706)' : 'var(--ds-text-subtlest, #64748B)',
                  fontFamily: 'var(--cp-font-mono)',
                }}>{item.age_days}d</span>
              </div>
              {/* Row 3: title -- 11px, 2-line clamp, flex fills remaining space */}
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--cp-text-primary, #0F172A)', lineHeight: '1.3', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis', flex: '1 1 auto', minHeight: 0 } as React.CSSProperties}>{item.title}</div>
              {/* Row 4: status lozenge + from tag -- fixed 24px, pinned to bottom */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', flexShrink: 0, height: '24px' }}>
                <StatusLozenge status={item.status} statusCategory={item.status_category} />
                {item.carried_from_label && (
                  <span className={`r3-from-tag ${fromClass}`} title="Carried over from an earlier period">
                    {getFromTagPrefix(item.age_days)}{item.carried_from_label}
                  </span>
                )}
                {isContributor && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 500, color: 'var(--cp-text-tertiary, #64748B)' }}>{'\u2192'} <MiniAvatar name={item.assignee_name} size={16} /> {item.assignee_name}</span>
                )}
              </div>
            </div>
            {/* Updated Xd ago label below card */}
            <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '11px', color: 'var(--cp-text-muted, #94A3B8)', width: `${CARD_W}px`, pointerEvents: 'none' }}>
              Updated {item.age_days}d ago
            </div>
          </div>
        );
      })}

      {/* SHOWING X OF N INDICATOR */}
      {nonDone.length > PAGE_SIZE && (
        <div style={{
          position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '11px', fontWeight: 600, color: 'var(--cp-text-tertiary, #64748B)', background: 'var(--cp-bg-page, #F8FAFC)',
          border: `1px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: '12px', padding: '3px 8px',
          fontFamily: 'var(--cp-font-mono)', zIndex: 8,
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); setRingPage(p => Math.max(0, p - 1)); }}
            disabled={safePage === 0}
            style={{
              background: 'none', border: 'none', cursor: safePage === 0 ? 'default' : 'pointer',
              color: safePage === 0 ? 'var(--ds-text-disabled, #CBD5E1)' : 'var(--ds-text-brand, #2563EB)', fontSize: '13px', fontWeight: 700,
              padding: '0 4px', lineHeight: 1,
            }}
            aria-label="Previous page"
          >{'\u2039'}</button>
          <span>
            {safePage * PAGE_SIZE + 1}&ndash;{Math.min((safePage + 1) * PAGE_SIZE, nonDone.length)} of {nonDone.length}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setRingPage(p => Math.min(totalPages - 1, p + 1)); }}
            disabled={safePage >= totalPages - 1}
            style={{
              background: 'none', border: 'none', cursor: safePage >= totalPages - 1 ? 'default' : 'pointer',
              color: safePage >= totalPages - 1 ? 'var(--ds-text-disabled, #CBD5E1)' : 'var(--ds-text-brand, #2563EB)', fontSize: '13px', fontWeight: 700,
              padding: '0 4px', lineHeight: 1,
            }}
            aria-label="Next page"
          >{'\u203A'}</button>
        </div>
      )}

      {/* COMPLETED BADGE -- always shown */}
      {completedBadge}

      {/* EMPTY STATE */}
      {items.length === 0 && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', color: 'var(--cp-text-tertiary, #64748B)', fontSize: '14px' }}>
          No work items found for this week
        </div>
      )}
    </div>
  );
}
