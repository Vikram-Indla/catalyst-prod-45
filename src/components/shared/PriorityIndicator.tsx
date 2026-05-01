/**
 * PriorityIndicator — Canonical priority display for the entire Catalyst platform.
 *
 * Ring-fenced: ALL priority rendering (tables, modals, filters, cards, dropdowns)
 * MUST use this component. No inline priority styling or duplicate components.
 *
 * Values:  Critical | High | Medium | Low
 * Visual:  4 colored bars (filled count = level) + optional text label
 * Colors:  Critical=#DC2626  High=#F97316  Medium=#EAB308  Low=#94A3B8
 */

import React from 'react';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface PriorityConfig {
  label: string;
  level: number;      // 4=Critical, 3=High, 2=Medium, 1=Low
  filledColor: string; // bar fill color
  textColor: string;   // label text color (light mode)
  textColorDark: string; // label text color (dark mode)
}

export const PRIORITY_MAP: Record<PriorityLevel, PriorityConfig> = {
  critical: { label: 'Critical', level: 4, filledColor: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', textColor: 'var(--ds-text-danger, var(--ds-text-danger, #991B1B))', textColorDark: '#F87171' },
  high:     { label: 'High',     level: 3, filledColor: '#F97316', textColor: '#C2410C', textColorDark: '#FB923C' },
  medium:   { label: 'Medium',   level: 2, filledColor: '#EAB308', textColor: '#A16207', textColorDark: '#FBBF24' },
  low:      { label: 'Low',      level: 1, filledColor: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))', textColor: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', textColorDark: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' },
};

/** Normalise any priority string to our canonical PriorityLevel. */
export function normalisePriority(raw: string | null | undefined): PriorityLevel {
  if (!raw) return 'medium';
  const v = raw.toLowerCase().trim();
  if (v === 'critical' || v === 'highest' || v === 'urgent' || v === 'p1') return 'critical';
  if (v === 'high' || v === 'p2') return 'high';
  if (v === 'low' || v === 'lowest' || v === 'p4') return 'low';
  return 'medium'; // default — medium, p3, or anything else
}

const EMPTY_BAR_LIGHT = 'var(--ds-border, var(--ds-border, #E2E8F0))';
const EMPTY_BAR_DARK  = 'var(--ds-border, var(--ds-border, #292929))';

interface PriorityBarsProps {
  priority: PriorityLevel;
  /** Override: pass true when parent knows we're in dark mode */
  isDark?: boolean;
  /** Bar dimensions — defaults: width 4px, height 14px */
  barWidth?: number;
  barHeight?: number;
}

/** Pure bar-icon — no text, no wrapper. Use inside table cells, badges, etc. */
export function PriorityBars({ priority, isDark = false, barWidth = 4, barHeight = 14 }: PriorityBarsProps) {
  const cfg = PRIORITY_MAP[priority];
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end', flexShrink: 0 }}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          style={{
            width: barWidth,
            height: barHeight - (4 - i) * 2, // bars grow taller left→right
            borderRadius: 1,
            background: i <= cfg.level ? cfg.filledColor : (isDark ? EMPTY_BAR_DARK : EMPTY_BAR_LIGHT),
          }}
        />
      ))}
    </span>
  );
}

interface PriorityIndicatorProps {
  /** Priority value — accepts any variant (critical, Critical, CRITICAL, P1, highest, etc.) */
  priority: string | null | undefined;
  /** Show text label next to bars (default: true) */
  showLabel?: boolean;
  /** Dark mode flag — auto-detected from CSS var if omitted */
  isDark?: boolean;
  /** Font size for label (default: 13) */
  fontSize?: number;
  /** Bar dimensions */
  barWidth?: number;
  barHeight?: number;
}

export function PriorityIndicator({
  priority: raw,
  showLabel = true,
  isDark = false,
  fontSize = 13,
  barWidth,
  barHeight,
}: PriorityIndicatorProps) {
  const p = normalisePriority(raw);
  const cfg = PRIORITY_MAP[p];

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <PriorityBars priority={p} isDark={isDark} barWidth={barWidth} barHeight={barHeight} />
      {showLabel && (
        <span style={{
          fontFamily: 'var(--cp-font-body)',
          fontSize,
          fontWeight: 600,
          color: isDark ? cfg.textColorDark : cfg.textColor,
          whiteSpace: 'nowrap',
        }}>
          {cfg.label}
        </span>
      )}
    </span>
  );
}

export default PriorityIndicator;
