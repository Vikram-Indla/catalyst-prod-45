/**
 * Task¹⁰ Label Badge - Outline Style
 * Uses direct CSS classes (not CSS modules) for proper styling
 */
import type { AqdLabel } from '../types/aqd.types';

interface AqdLabelBadgeProps {
  label: AqdLabel;
}

// ISSUE 2 FIX: Map hex colors to outline style classes
const COLOR_TO_TAILWIND: Record<string, string> = {
  '#3b82f6': 'border-blue-500 text-blue-600',
  '#ef4444': 'border-red-500 text-red-600',
  '#8b5cf6': 'border-purple-500 text-purple-600',
  '#f97316': 'border-orange-500 text-orange-600',
  '#ec4899': 'border-pink-500 text-pink-600',
  '#22c55e': 'border-green-500 text-green-600',
  '#06b6d4': 'border-cyan-500 text-cyan-600',
  '#64748b': 'border-slate-500 text-slate-600',
};

export function AqdLabelBadge({ label }: AqdLabelBadgeProps) {
  const colorClass = COLOR_TO_TAILWIND[label.color.toLowerCase()] || '';
  
  return (
    <span 
      className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full border bg-transparent ${colorClass}`}
      style={!colorClass ? { color: label.color, borderColor: label.color } : undefined}
    >
      {label.name}
    </span>
  );
}

export default AqdLabelBadge;
