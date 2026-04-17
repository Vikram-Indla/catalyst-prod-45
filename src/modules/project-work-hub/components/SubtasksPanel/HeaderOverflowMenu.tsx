import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  MoreHorizontal, Check, Edit3, Search, ArrowUp, ArrowDown, ChevronRight, ArrowUpDown,
} from 'lucide-react';
import { SORT_FIELDS, type SortField, type SortState } from './sort';

interface HeaderOverflowMenuProps {
  hideDone: boolean;
  onToggleHideDone: () => void;
  bulkEditMode: boolean;
  onEnterBulkEdit: () => void;
  onViewInSearch: () => void;
  sort: SortState;
  onCycleSort: (field: SortField) => void;
}

export function HeaderOverflowMenu({
  hideDone,
  onToggleHideDone,
  bulkEditMode,
  onEnterBulkEdit,
  onViewInSearch,
  sort,
  onCycleSort,
}: HeaderOverflowMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);

  // Close the sort submenu when the parent menu closes.
  React.useEffect(() => {
    if (!open) setSortOpen(false);
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="sp-icon-btn"
          aria-label="Subtasks actions"
        >
          <MoreHorizontal size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        className="sp-pop sp-pop--menu"
        style={{ width: 220, padding: 6 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Filter / view group */}
        <button
          type="button"
          className="sp-pop-row"
          onClick={() => onToggleHideDone()}
        >
          <span className={`sp-check ${hideDone ? 'sp-check--on' : ''}`}>
            {hideDone && <Check size={10} color="#fff" strokeWidth={3} />}
          </span>
          <span className="sp-pop-label">Hide done</span>
        </button>

        {/* Sort — nested popover anchored to this row */}
        <Popover open={sortOpen} onOpenChange={setSortOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="sp-pop-row">
              <ArrowUpDown size={14} color="#44546F" />
              <span className="sp-pop-label">Sort</span>
              <ChevronRight size={14} color="#6B778C" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            sideOffset={8}
            className="sp-pop"
            style={{ width: 220, padding: 6 }}
            onClick={(e) => e.stopPropagation()}
          >
            {SORT_FIELDS.map(({ field, label }) => {
              const active = sort.field === field;
              const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown;
              return (
                <button
                  key={field}
                  type="button"
                  className="sp-pop-row"
                  onClick={() => onCycleSort(field)}
                >
                  <span className="sp-pop-label">{label}</span>
                  {active && <Arrow size={14} color="#0052CC" style={{ marginLeft: 'auto' }} />}
                </button>
              );
            })}
            {sort.field && (
              <>
                <div className="sp-pop-divider" />
                <div className="sp-pop-hint">Click again to flip direction or clear.</div>
              </>
            )}
          </PopoverContent>
        </Popover>

        <div className="sp-pop-divider" />

        {/* Action group */}
        <button
          type="button"
          className="sp-pop-row"
          disabled={bulkEditMode}
          style={{ opacity: bulkEditMode ? 0.5 : 1, cursor: bulkEditMode ? 'not-allowed' : 'pointer' }}
          onClick={() => { setOpen(false); onEnterBulkEdit(); }}
        >
          <Edit3 size={14} color="#44546F" />
          <span className="sp-pop-label">Bulk edit</span>
        </button>

        <button
          type="button"
          className="sp-pop-row"
          onClick={() => { setOpen(false); onViewInSearch(); }}
        >
          <Search size={14} color="#44546F" />
          <span className="sp-pop-label">View in search</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
