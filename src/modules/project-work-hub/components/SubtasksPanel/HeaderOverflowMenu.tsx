import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MoreHorizontal, ChevronsDownUp, ChevronsUpDown, Eraser } from 'lucide-react';

interface HeaderOverflowMenuProps {
  expanded: boolean;
  onToggleExpand: () => void;
  doneCount: number;
  onClearDone: () => void;
}

export function HeaderOverflowMenu({ expanded, onToggleExpand, doneCount, onClearDone }: HeaderOverflowMenuProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="sp-icon-btn" aria-label="Subtasks actions">
          <MoreHorizontal size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        className="sp-pop"
        style={{ width: 220, padding: 4 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="sp-pop-row"
          onClick={() => { setOpen(false); onToggleExpand(); }}
        >
          {expanded ? <ChevronsDownUp size={14} color="#6B778C" /> : <ChevronsUpDown size={14} color="#6B778C" />}
          <span style={{ fontSize: 13, color: '#172B4D' }}>
            {expanded ? 'Collapse panel' : 'Expand panel'}
          </span>
        </button>
        <div className="sp-pop-divider" />
        <button
          type="button"
          className="sp-pop-row"
          disabled={doneCount === 0}
          style={{ opacity: doneCount === 0 ? 0.5 : 1, cursor: doneCount === 0 ? 'not-allowed' : 'pointer' }}
          onClick={() => {
            if (doneCount === 0) return;
            setOpen(false);
            onClearDone();
          }}
        >
          <Eraser size={14} color="#6B778C" />
          <span style={{ fontSize: 13, color: '#172B4D' }}>
            Clear completed {doneCount > 0 ? `(${doneCount})` : ''}
          </span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
