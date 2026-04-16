import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { STATUS_OPTION_GROUPS } from '../../dialogs/story-detail-modules/constants';
import { Check } from 'lucide-react';

interface StatusPopoverProps {
  status: string;
  statusCategory: string;
  onChange: (status: string, category: 'todo' | 'in_progress' | 'done') => void;
  children: React.ReactNode;
  /** When false, no "current value" check mark is rendered — use in bulk-edit contexts. */
  showActive?: boolean;
}

const CATEGORY_TO_CHIP: Record<string, string> = {
  todo: 'sp-status-btn--todo',
  in_progress: 'sp-status-btn--inprogress',
  done: 'sp-status-btn--done',
};

export function StatusPopover({ status, onChange, children, showActive = true }: StatusPopoverProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="sp-pop"
        style={{ width: 260, padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {STATUS_OPTION_GROUPS.map((group) => (
          <div key={group.category} className="sp-pop-group">
            <div className="sp-pop-group-label">{group.groupLabel}</div>
            {group.statuses.map((s) => {
              const active = showActive && s === status;
              return (
                <button
                  key={s}
                  type="button"
                  className="sp-pop-row"
                  onClick={() => {
                    onChange(s, group.category as 'todo' | 'in_progress' | 'done');
                    setOpen(false);
                  }}
                >
                  <span className={`sp-status-btn ${CATEGORY_TO_CHIP[group.category]}`} style={{ cursor: 'default' }}>
                    {s}
                  </span>
                  {active && <Check size={14} color="#0052CC" style={{ marginLeft: 'auto' }} />}
                </button>
              );
            })}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
