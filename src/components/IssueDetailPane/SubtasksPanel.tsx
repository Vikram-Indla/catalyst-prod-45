/**
 * SubtasksPanel — Subtasks list (F2.8)
 */
import React, { memo, useState } from 'react';

export const SubtasksPanel = memo(function SubtasksPanel({ issueKey, subtasks = [], onCreateSubtask }: any) {
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <h2>Subtasks</h2>
      {!subtasks.length && !creating && <div>No subtasks</div>}
      {subtasks.map((s: any) => (
        <div key={s.key}>
          <a href={`/issue/${s.key}`}>{s.key}</a>: {s.summary}
        </div>
      ))}
      {creating && <div data-testid="inline-create-row">Create subtask input</div>}
      <button onClick={() => setCreating(!creating)}>Create sub-task</button>
    </div>
  );
});
