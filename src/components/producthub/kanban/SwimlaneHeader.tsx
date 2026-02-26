import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SwimlaneHeaderProps {
  label: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const SwimlaneHeader: React.FC<SwimlaneHeaderProps> = ({
  label,
  count,
  isCollapsed,
  onToggle,
}) => (
  <button onClick={onToggle} className="pk-swimlane">
    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
    <span className="pk-swimlane-label">{label || 'Unassigned'}</span>
    <span className="pk-swimlane-count">({count})</span>
  </button>
);
