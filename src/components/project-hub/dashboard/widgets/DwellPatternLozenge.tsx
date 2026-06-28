/**
 * DwellPatternLozenge — colored chip naming the dwell pathology
 * (outlier #5). Sits in the hover-card header beside the status pill;
 * compact variant sits inline next to the duration text on the matrix
 * cell.
 *
 * Colours via ADS subtler-accent tokens. No animation. Atlassian Sans
 * 11/653 caps style.
 */
import type { DwellPattern } from '@/lib/tis-dwell-classifier/classifier';

// 2026-06-10 Fix 2 — Emoji glyphs banned per CLAUDE.md L2 (no non-Jira
// icons). Replaced with 2-letter ADS-style code prefix + colored chip.
// Code reads like a status pill: "PP" / "SD" / "PL" / "SR" / "XD".
const PATTERN_META: Record<Exclude<DwellPattern, 'none'>, { code: string; label: string; bg: string; color: string; dot: string }> = {
  ping_pong: {
    code: 'PP',
    label: 'Ping-pong',
    bg: 'var(--ds-background-accent-red-subtler, #FFD5D2)',
    color: 'var(--ds-text-accent-red, #AE2A19)',
    dot: 'var(--ds-text-accent-red, #AE2A19)',
  },
  pl_gap: {
    code: 'PL',
    label: 'PL gap',
    bg: 'var(--ds-background-accent-yellow-subtler, #F8E6A0)',
    color: 'var(--ds-text-accent-yellow, #7F5F01)',
    dot: 'var(--ds-text-accent-yellow, #7F5F01)',
  },
  spec_rewrite: {
    code: 'SR',
    label: 'Spec rewrite',
    bg: 'var(--ds-background-accent-purple-subtler, #DFD8FD)',
    color: 'var(--ds-text-accent-purple, #5E4DB2)',
    dot: 'var(--ds-text-accent-purple, #5E4DB2)',
  },
  external_dep: {
    code: 'XD',
    label: 'External dep',
    bg: 'var(--ds-background-accent-blue-subtler, #CCE0FF)',
    color: 'var(--ds-text-accent-blue, #0055CC)',
    dot: 'var(--ds-text-accent-blue, #0055CC)',
  },
  silent: {
    code: 'SD',
    label: 'Silent',
    bg: 'var(--ds-background-neutral, #F1F2F4)',
    color: 'var(--ds-text-subtle, #42526E)',
    dot: 'var(--ds-text-subtle, #42526E)',
  },
};

export interface DwellPatternLozengeProps {
  pattern: DwellPattern;
  confidence: number;
  description?: string;
  /** Compact = emoji only (for inline-on-cell). Default = emoji + label (header). */
  compact?: boolean;
}

export function DwellPatternLozenge({
  pattern,
  confidence,
  description,
  compact = false,
}: DwellPatternLozengeProps) {
  if (pattern === 'none') return null;
  const meta = PATTERN_META[pattern];
  const titleText = description
    ? `${meta.label} (${Math.round(confidence * 100)}% confidence) — ${description}`
    : `${meta.label} (${Math.round(confidence * 100)}% confidence)`;

  return (
    <span
      data-testid="tis-dwell-lozenge"
      data-pattern={pattern}
      title={titleText}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: compact ? '0 4px' : '1px 6px',
        height: compact ? 14 : 18,
        lineHeight: compact ? '14px' : '18px',
        borderRadius: compact ? 3 : 9,
        background: meta.bg,
        color: meta.color,
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: 653,
        fontFamily: 'Atlassian Sans, -apple-system, system-ui, sans-serif',
        letterSpacing: 0,
        textTransform: 'none',
        whiteSpace: 'nowrap',
        cursor: 'help',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: meta.dot,
          flexShrink: 0,
        }}
      />
      {compact ? (
        <span style={{ fontWeight: 653 }}>{meta.code}</span>
      ) : (
        <span>{meta.label}</span>
      )}
    </span>
  );
}

export default DwellPatternLozenge;
