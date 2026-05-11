/**
 * CatalystLabelsField — Labels field (F3.7)
 */
import React, { memo, useState } from 'react';

export const CatalystLabelsField = memo(function CatalystLabelsField({
  labels = [],
  onLabelsChange,
}: {
  labels: string[];
  onLabelsChange: (labels: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const available = ['backend', 'frontend', 'design', 'qa'];

  return (
    <div>
      <label>Labels</label>
      <div>
        <button data-testid="labels-button" onClick={() => setOpen(!open)}>
          {labels.length ? labels.join(', ') : ''}
        </button>
        {!labels.length && <span>No labels</span>}
      </div>
      {open && (
        <div data-testid="labels-picker">
          {available.map((label) => (
            <label key={label}>
              <input
                type="checkbox"
                checked={labels.includes(label)}
                onChange={(e) => {
                  const newLabels = e.target.checked
                    ? [...labels, label]
                    : labels.filter((l) => l !== label);
                  onLabelsChange(newLabels);
                  setOpen(false);
                }}
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
});
