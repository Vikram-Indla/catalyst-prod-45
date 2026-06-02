/**
 * CatalystSprintReleaseField — Sprint/Release field (F3.8)
 */
import React, { memo, useState, useEffect } from 'react';

export const CatalystSprintReleaseField = memo(function CatalystSprintReleaseField({
  sprintRelease = [],
  onSprintReleaseChange,
}: {
  sprintRelease: string[];
  onSprintReleaseChange: (versions: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(sprintRelease);
  const available = ['v1.0', 'v1.1', 'v2.0', 'v2.1'];

  useEffect(() => {
    setSelected(sprintRelease);
  }, [sprintRelease]);

  return (
    <div>
      <label>Sprint/Release</label>
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
                  onSprintReleaseChange(newVersions);
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
