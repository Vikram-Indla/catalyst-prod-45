import React from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDEpics } from '../../hooks/useEFDSession';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const GenerateEpicsStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: epics = [] } = useEFDEpics(session.id);

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-xl font-semibold">Generate Epics</h2>
      {epics.length === 0 ? (
        <div className="border rounded-xl p-8 text-center bg-card">
          <Bot className="h-12 w-12 mx-auto text-primary mb-4" />
          <p className="text-muted-foreground mb-4">Generate SAFe-compliant epics with Lean Business Cases</p>
          <Button><Bot className="h-4 w-4 mr-2" />Generate Epics</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {epics.map((epic: any) => (
            <div key={epic.id} className="border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-violet-100 text-violet-700">{epic.epic_key}</span>
                <h3 className="font-semibold">{epic.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground truncate">{epic.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
