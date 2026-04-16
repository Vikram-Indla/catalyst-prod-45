import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MoreHorizontal, Check, Edit3, Search } from 'lucide-react';

interface HeaderOverflowMenuProps {
  hideDone: boolean;
  onToggleHideDone: () => void;
  bulkEditMode: boolean;
  onEnterBulkEdit: () => void;
  onViewInSearch: () => void;
}

export function HeaderOverflowMenu({
  hideDone,
  onToggleHideDone,
  bulkEditMode,
  onEnterBulkEdit,
  onViewInSearch,
}: HeaderOverflowMenuProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="sp-icon-btn"
          aria-label="Subtasks actions"
          data-sp-active={open ? 'true' : undefined}
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
        <button
          type="button"
          className="sp-pop-row"
          onClick={() => { onToggleHideDone(); }}
        >
          <span className={`sp-check ${hideDone ? 'sp-check--on' : ''}`}>
            {hideDone && <Check size={10} color="#fff" strokeWidth={3} />}
          </span>
          <span className="sp-pop-label">Hide done</span>
        </button>

        <div className="sp-pop-divider" />

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
