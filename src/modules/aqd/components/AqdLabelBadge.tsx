/**
 * Task¹⁰ Label Badge - Outline Style
 */
import type { AqdLabel } from '../types/aqd.types';
import { getLabelCssClass } from '../types/aqd.types';
import styles from '../styles/aqd.module.css';

interface AqdLabelBadgeProps {
  label: AqdLabel;
}

// Map hex colors to CSS class names
const COLOR_TO_CLASS: Record<string, string> = {
  '#3b82f6': 'aqd-label-finance',
  '#ef4444': 'aqd-label-urgent',
  '#8b5cf6': 'aqd-label-tech',
  '#f97316': 'aqd-label-sales',
  '#ec4899': 'aqd-label-hr',
  '#22c55e': 'aqd-label-q1',
  '#06b6d4': 'aqd-label-ops',
  '#64748b': 'aqd-label-legal',
};

export function AqdLabelBadge({ label }: AqdLabelBadgeProps) {
  const colorClass = COLOR_TO_CLASS[label.color.toLowerCase()] || '';
  
  return (
    <span 
      className={`${styles['aqd-label']} ${styles[colorClass] || ''}`}
      style={!colorClass ? { color: label.color, borderColor: label.color } : undefined}
    >
      {label.name}
    </span>
  );
}

export default AqdLabelBadge;
