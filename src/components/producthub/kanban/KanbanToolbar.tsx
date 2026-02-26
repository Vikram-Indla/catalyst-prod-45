import React, { useState, useRef } from 'react';
import { ArrowUpDown, Rows3, Download, Plus, ChevronDown, Search } from 'lucide-react';
import type { SwimlaneField } from './KanbanColumn';
import type { Initiative } from '@/types/initiative';
import { ExportDropdown } from '@/components/producthub/listing/ExportDropdown';

const SORT_OPTIONS = [
  { key: 'score', label: 'Score' },
  { key: 'title', label: 'Title' },
  { key: 'created', label: 'Date Created' },
  { key: 'target', label: 'Target Date' },
];

const SWIMLANE_OPTIONS: { key: SwimlaneField; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'department', label: 'Department' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'priority', label: 'Priority' },
];

interface KanbanToolbarProps {
  sortBy: string;
  onSortChange: (sort: string) => void;
  swimlane: SwimlaneField;
  onSwimlaneChange: (value: SwimlaneField) => void;
  onNewInitiative: () => void;
  initiatives?: Initiative[];
}

export const KanbanToolbar: React.FC<KanbanToolbarProps> = ({
  sortBy,
  onSortChange,
  swimlane,
  onSwimlaneChange,
  onNewInitiative,
  initiatives = [],
}) => {
  const [showSort, setShowSort] = useState(false);
  const [showSwimlane, setShowSwimlane] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef<HTMLButtonElement>(null);

  const sortLabel = SORT_OPTIONS.find(s => s.key === sortBy)?.label ?? 'Score';
  const swimlaneLabel = SWIMLANE_OPTIONS.find(s => s.key === swimlane)?.label ?? 'None';

  return (
    <div className="pk-toolbar">
      {/* Swimlane dropdown */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowSwimlane(!showSwimlane)} className="pk-toolbar-btn">
          <Rows3 size={14} />
          <span>Swimlane: {swimlaneLabel}</span>
          <ChevronDown size={12} />
        </button>
        {showSwimlane && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSwimlane(false)} />
            <div className="pk-dropdown">
              {SWIMLANE_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { onSwimlaneChange(opt.key); setShowSwimlane(false); }}
                  className={`pk-dropdown-item ${swimlane === opt.key ? 'pk-dropdown-item--active' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sort dropdown */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowSort(!showSort)} className="pk-toolbar-btn">
          <ArrowUpDown size={14} />
          <span>Sort: {sortLabel}</span>
          <ChevronDown size={12} />
        </button>
        {showSort && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
            <div className="pk-dropdown">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { onSortChange(opt.key); setShowSort(false); }}
                  className={`pk-dropdown-item ${sortBy === opt.key ? 'pk-dropdown-item--active' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="pk-toolbar-divider" />

      <div className="pk-toolbar-spacer" />

      {/* Export */}
      <button ref={exportRef} onClick={() => setShowExport(!showExport)} className="pk-toolbar-btn">
        <Download size={14} />
        <span>Export</span>
      </button>
      <ExportDropdown data={initiatives} anchorRef={exportRef} isOpen={showExport} onClose={() => setShowExport(false)} />

      {/* New Initiative */}
      <button onClick={onNewInitiative} className="pk-btn-primary">
        <Plus size={14} />
        <span>New Initiative</span>
      </button>
    </div>
  );
};
