/**
 * PriorityPopover — @atlaskit/popup wrapping a 4-level priority picker.
 * Uses the canonical PriorityIndicator (bars + label) — Atlaskit does not
 * ship a priority-level primitive.
 */
import React from 'react';
import Popup from '@atlaskit/popup';
import { PriorityIndicator, normalisePriority } from '@/components/shared/PriorityIndicator';
import { Check } from 'lucide-react';

interface PriorityPopoverProps {
  priority: string;
  onChange: (priority: 'Critical' | 'High' | 'Medium' | 'Low') => void;
  children: React.ReactNode;
  /** When false, no "current value" check mark is rendered — use in bulk-edit contexts. */
  showActive?: boolean;
}

const OPTIONS: Array<{ value: 'Critical' | 'High' | 'Medium' | 'Low' }> = [
  { value: 'Critical' },
  { value: 'High' },
  { value: 'Medium' },
  { value: 'Low' },
];

export function PriorityPopover({ priority, onChange, children, showActive = true }: PriorityPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const current = normalisePriority(priority);

  return (
    <Popup
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="bottom-start"
      content={() => (
        <div className="sp-pop" style={{ width: 180, padding: 4 }} onClick={(e) => e.stopPropagation()}>
          {OPTIONS.map(({ value }) => {
            const active = showActive && normalisePriority(value) === current;
            return (
              <button
                key={value}
                type="button"
                className="sp-pop-row"
                onClick={() => {
                  onChange(value);
                  setIsOpen(false);
                }}
              >
                <PriorityIndicator priority={value} showLabel fontSize={13} />
                {active && <Check size={14} color="#0052CC" style={{ marginLeft: 'auto' }} />}
              </button>
            );
          })}
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
