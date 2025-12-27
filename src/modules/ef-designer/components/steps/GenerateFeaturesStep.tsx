import React from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDFeatures, useEFDEpics } from '../../hooks/useEFDSession';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const GenerateFeaturesStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: features = [] } = useEFDFeatures(session.id);
  const { data: epics = [] } = useEFDEpics(session.id);

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-xl font-semibold">Generate Features</h2>
      {features.length === 0 ? (
        <div className="border rounded-xl p-8 text-center bg-card">
          <Bot className="h-12 w-12 mx-auto text-primary mb-4" />
          <Button><Bot className="h-4 w-4 mr-2" />Generate Features</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {features.map((f: any) => (
            <div key={f.id} className="border rounded-lg p-3 bg-card">
              <span className="font-mono text-sm text-teal-600">{f.feature_key}</span>
              <span className="ml-2">{f.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
