/**
 * CatalystFixVersionsField — Fix versions field (F3.8)
 */
import React, { memo, useState, useEffect } from 'react';

export const CatalystFixVersionsField = memo(function CatalystFixVersionsField({
  fixVersions = [],
  onFixVersionsChange,
}: {
  fixVersions: string[];
  onFixVersionsChange: (versions: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(fixVersions);
  const available = ['v1.0', 'v1.1', 'v2.0', 'v2.1'];

  useEffect(() => {
    setSelected(fixVersions);
  }, [fixVersions]);

  return (
    <div>
      <label>Fix Versions</label>
      <button data-testid="versions-button" onClick={() => setOpen(!open)}>
        {selected.length ? selected.join(', ') : 'None selected'}
      </button>
      {open && (
        <div data-testid="versions-picker">
          {available.map((version) => (
            <label key={version}>
              <input
                type="checkbox"
                checked={selected.includes(version)}
                onChange={(e) => {
                  const newVersions = e.target.checked
                    ? [...selected, version]
                    : selected.filter((v) => v !== version);
                  setSelected(newVersions);
                  onFixVersionsChange(newVersions);
                }}
              />
              {version}
            </label>
          ))}
        </div>
      )}
    </div>
  );
});
