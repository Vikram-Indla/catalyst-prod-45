import React from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDEpics } from '../../hooks/useEFDSession';

export const SelectEpicsStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: epics = [] } = useEFDEpics(session.id);
  const selected = epics.filter((e: any) => e.is_selected_for_features).length;

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-xl font-semibold">Select Epics for Features</h2>
      <p className="text-muted-foreground">Only selected epics will have features generated</p>
      <p className="text-sm">{selected} of {epics.length} selected</p>
      <div className="space-y-3">
        {epics.map((epic: any) => (
          <div key={epic.id} className={`border rounded-xl p-4 cursor-pointer transition-all ${epic.is_selected_for_features ? 'border-primary bg-primary/5' : 'bg-card'}`}>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={epic.is_selected_for_features} readOnly className="h-4 w-4" />
              <span className="font-mono text-sm text-violet-600">{epic.epic_key}</span>
              <span className="font-medium">{epic.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
