import React from 'react';
import { LayoutList, Columns3 } from 'lucide-react';

export type SubtaskView = 'list' | 'board';

interface ViewToggleProps {
  view: SubtaskView;
  onChange: (view: SubtaskView) => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  const next: SubtaskView = view === 'list' ? 'board' : 'list';
  const Icon = view === 'list' ? Columns3 : LayoutList;
  const label = view === 'list' ? 'Switch to board view' : 'Switch to list view';

  return (
    <button
      type="button"
      className="sp-icon-btn"
      onClick={() => onChange(next)}
      title={label}
      aria-label={label}
    >
      <Icon size={16} />
    </button>
  );
}
