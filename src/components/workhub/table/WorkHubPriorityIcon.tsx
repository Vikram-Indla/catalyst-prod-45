/**
 * WorkHubPriorityIcon — 5-level priority icons using Lucide arrows
 */
import { ChevronUp, ChevronsUp, Minus, ChevronDown, ChevronsDown } from 'lucide-react';

interface WorkHubPriorityIconProps {
  priority: string;
  size?: number;
  showLabel?: boolean;
}

const PRIORITY_CONFIG: Record<string, { icon: typeof ChevronUp; color: string; label: string }> = {
  highest: { icon: ChevronsUp, color: 'var(--sem-danger)', label: 'Highest' },
  high:    { icon: ChevronUp,  color: 'var(--sem-danger)', label: 'High' },
  medium:  { icon: Minus,      color: 'var(--sem-warning)', label: 'Medium' },
  low:     { icon: ChevronDown, color: 'var(--cp-blue)', label: 'Low' },
  lowest:  { icon: ChevronsDown, color: 'var(--cp-blue)', label: 'Lowest' },
};

export default function WorkHubPriorityIcon({ priority, size = 16, showLabel = false }: WorkHubPriorityIconProps) {
  const key = priority?.toLowerCase().trim() || 'medium';
  const config = PRIORITY_CONFIG[key] || PRIORITY_CONFIG.medium;
  const Icon = config.icon;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }} title={config.label}>
      <Icon size={size} color={config.color} strokeWidth={2.5} />
      {showLabel && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)' }}>{config.label}</span>}
    </span>
  );
}
