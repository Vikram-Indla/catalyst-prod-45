import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MoreHorizontal, ExternalLink, Pencil, Trash2 } from 'lucide-react';

interface RowActionsMenuProps {
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function RowActionsMenu({ onOpen, onRename, onDelete }: RowActionsMenuProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="sp-row-actions-btn"
          onClick={(e) => e.stopPropagation()}
          aria-label="Row actions"
        >
          <MoreHorizontal size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        className="sp-pop"
        style={{ width: 180, padding: 4 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="sp-pop-row"
          onClick={() => { setOpen(false); onOpen(); }}
        >
          <ExternalLink size={14} color="#6B778C" />
          <span style={{ fontSize: 13, color: '#172B4D' }}>Open subtask</span>
        </button>
        <button
          type="button"
          className="sp-pop-row"
          onClick={() => { setOpen(false); onRename(); }}
        >
          <Pencil size={14} color="#6B778C" />
          <span style={{ fontSize: 13, color: '#172B4D' }}>Rename</span>
        </button>
        <div className="sp-pop-divider" />
        <button
          type="button"
          className="sp-pop-row sp-pop-row--danger"
          onClick={() => { setOpen(false); onDelete(); }}
        >
          <Trash2 size={14} color="#BF2600" />
          <span style={{ fontSize: 13, color: '#BF2600' }}>Delete</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
