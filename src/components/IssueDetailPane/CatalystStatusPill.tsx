/**
 * CatalystStatusPill — Status pill with dropdown (F2.4)
 */
import React, { memo, useState } from 'react';

export const CatalystStatusPill = memo(function CatalystStatusPill({ status, onStatusChange }: { status: string; onStatusChange: (status: string) => void }) {
  const [open, setOpen] = useState(false);
  const statuses = ['To Do', 'In Progress', 'Done'];

  const handleChange = (newStatus: string) => {
    onStatusChange(newStatus);
    setOpen(false);
  };

  return (
    <div>
      <button data-testid="status-pill" onClick={() => setOpen(!open)}>
        {status}
      </button>
      {open && (
        <ul role="listbox">
          {statuses.map((s) => (
            <li key={s} role="option" onClick={() => handleChange(s)}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
});
