/**
 * PriorityIcon — canonical Atlassian priority glyph.
 *
 * Renders the standard Jira priority icon (double-up / up / horizontal /
 * down / double-down) with the matching ADS color. Hand-rolled SVGs match
 * Atlassian's published priority pack — Lucide chevrons are too generic
 * and `@atlaskit/icon-priority` isn't installed in this repo.
 *
 * Accepts both `priority` (incidents/issues) and `severity` (QA defects)
 * column values — they share the Highest/High/Medium/Low/Lowest range.
 *
 * Empty / null values render an empty span (per L13 — never silently
 * misclassify into a default like "Medium").
 */
import { type CSSProperties } from 'react';

export type PriorityLevel = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

interface PriorityIconProps {
  level: string | null | undefined;
  size?: number;
  className?: string;
}

const COLORS: Record<PriorityLevel, string> = {
  Highest: 'var(--ds-icon-danger, #C9372C)',
  High: 'var(--ds-icon-danger, #C9372C)',
  Medium: 'var(--ds-icon-warning, #B65C02)',
  Low: 'var(--ds-icon-information, #0055CC)',
  Lowest: 'var(--ds-icon-subtle, #758195)',
};

function normalize(raw: string | null | undefined): PriorityLevel | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'highest' || v === 'p1' || v === 'critical' || v === 'blocker') return 'Highest';
  if (v === 'high' || v === 'p2' || v === 'major') return 'High';
  if (v === 'medium' || v === 'p3' || v === 'normal') return 'Medium';
  if (v === 'low' || v === 'p4' || v === 'minor') return 'Low';
  if (v === 'lowest' || v === 'p5' || v === 'trivial') return 'Lowest';
  return null;
}

export default function PriorityIcon({ level, size = 16, className }: PriorityIconProps) {
  const norm = normalize(level);
  if (!norm) {
    return <span aria-hidden style={{ display: 'inline-block', width: size, height: size }} />;
  }
  const color = COLORS[norm];
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    role: 'img' as const,
    'aria-label': `Priority: ${norm}`,
    className,
  };

  switch (norm) {
    // Highest — double chevron up
    case 'Highest':
      return (
        <svg {...props}>
          <path d="M3 9l5-5 5 5M3 13l5-5 5 5" />
        </svg>
      );
    // High — single chevron up
    case 'High':
      return (
        <svg {...props}>
          <path d="M3 11l5-5 5 5" />
        </svg>
      );
    // Medium — horizontal bars (equals)
    case 'Medium':
      return (
        <svg {...props}>
          <path d="M3 6h10M3 10h10" />
        </svg>
      );
    // Low — single chevron down
    case 'Low':
      return (
        <svg {...props}>
          <path d="M3 5l5 5 5-5" />
        </svg>
      );
    // Lowest — double chevron down
    case 'Lowest':
      return (
        <svg {...props}>
          <path d="M3 3l5 5 5-5M3 7l5 5 5-5" />
        </svg>
      );
  }
}

PriorityIcon.normalize = normalize;
