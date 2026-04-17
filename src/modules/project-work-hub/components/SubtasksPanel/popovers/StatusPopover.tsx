/**
 * StatusPopover — Atlaskit @atlaskit/popup wrapping our grouped-by-category
 * status picker. Three groups (To Do / In Progress / Done) match the Jira
 * Cloud status menu exactly.
 *
 * Items keep the 3-colour guardrail (CLAUDE.md §5) — each row renders an
 * inline Atlaskit Lozenge with one of three appearances (default, inprogress,
 * success). No destructive / new / moved lozenges are ever emitted.
 */
import React from 'react';
import Popup from '@atlaskit/popup';
import Lozenge from '@atlaskit/lozenge';
import { Check } from 'lucide-react';
import { STATUS_OPTION_GROUPS } from '../../dialogs/story-detail-modules/constants';

interface StatusPopoverProps {
  status: string;
  statusCategory: string;
  onChange: (status: string, category: 'todo' | 'in_progress' | 'done') => void;
  children: React.ReactNode;
  /** When false, no "current value" check mark is rendered — use in bulk-edit contexts. */
  showActive?: boolean;
}

const CATEGORY_TO_APPEARANCE: Record<string, 'default' | 'inprogress' | 'success'> = {
  todo: 'default',
  in_progress: 'inprogress',
  done: 'success',
};

export function StatusPopover({ status, onChange, children, showActive = true }: StatusPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popup
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="bottom-start"
      content={() => (
        <div className="sp-pop sp-pop--status" style={{ width: 260, padding: 0 }} onClick={(e) => e.stopPropagation()}>
          {STATUS_OPTION_GROUPS.map((group) => (
            <div key={group.category} className="sp-pop-group">
              <div className="sp-pop-group-label">{group.groupLabel}</div>
              {group.statuses.map((s) => {
                const active = showActive && s === status;
                const appearance = CATEGORY_TO_APPEARANCE[group.category] ?? 'default';
                return (
                  <button
                    key={s}
                    type="button"
                    className="sp-pop-row"
                    onClick={() => {
                      onChange(s, group.category as 'todo' | 'in_progress' | 'done');
                      setIsOpen(false);
                    }}
                  >
                    <Lozenge appearance={appearance} isBold>{s}</Lozenge>
                    {active && <Check size={14} color="#0052CC" style={{ marginLeft: 'auto' }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
      trigger={(triggerProps) => (
        <span
          {...triggerProps}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((o) => !o);
          }}
          style={{ display: 'inline-flex' }}
        >
          {children}
        </span>
      )}
    />
  );
}
