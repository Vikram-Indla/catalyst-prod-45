/**
 * CatalystFixVersionsField — Fix versions field (F3.8)
 */
import React, { memo, useState } from 'react';

export const CatalystFixVersionsField = memo(function CatalystFixVersionsField({
  fixVersions = [],
  onFixVersionsChange,
}: {
  fixVersions: string[];
  onFixVersionsChange: (versions: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const available = ['v1.0', 'v1.1', 'v2.0', 'v2.1'];

  return (
    <div>
      <label>Fix Versions</label>
      <button data-testid="versions-button" onClick={() => setOpen(!open)}>
        {fixVersions.length ? fixVersions.join(', ') : 'None selected'}
      </button>
      {open && (
        <div data-testid="versions-picker">
          {available.map((version) => (
            <label key={version}>
              <input
                type="checkbox"
                checked={fixVersions.includes(version)}
                onChange={(e) => {
                  const newVersions = e.target.checked
                    ? [...fixVersions, version]
                    : fixVersions.filter((v) => v !== version);
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
