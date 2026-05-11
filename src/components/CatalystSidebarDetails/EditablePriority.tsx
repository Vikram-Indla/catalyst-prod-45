/**
 * EditablePriority — Priority field (F3.4)
 */
import React, { memo, useState } from 'react';

export const EditablePriority = memo(function EditablePriority({
  priority,
  onPriorityChange,
}: {
  priority: string;
  onPriorityChange: (priority: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const priorities = ['Lowest', 'Low', 'Medium', 'High', 'Highest'];

  return (
    <div>
      <label>Priority</label>
      <button data-testid="priority-button" onClick={() => setOpen(!open)}>
        {priority}
      </button>
      {open && (
        <ul role="listbox" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {priorities.map((p, i) => (
            <li
              key={p}
              role="option"
              aria-label={`p${i + 1} ${p}`}
              onClick={() => {
                onPriorityChange(p);
                setOpen(false);
              }}
            >
              {p}
            </li>
          ))}
        </ul>
      )}
      <div data-testid="priority-bar" style={{ height: '2px', background: '#999' }} />
    </div>
  );
});
