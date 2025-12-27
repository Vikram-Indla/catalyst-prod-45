import React from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDEpics, useEFDFeatures, useEFDAtoms } from '../../hooks/useEFDSession';

export const RTMStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: epics = [] } = useEFDEpics(session.id);
  const { data: features = [] } = useEFDFeatures(session.id);
  const { data: atoms = [] } = useEFDAtoms(session.id);
  const mapped = atoms.filter((a: any) => a.status === 'mapped').length;
  const coverage = atoms.length > 0 ? Math.round((mapped / atoms.length) * 100) : 0;

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-xl font-semibold">Requirements Traceability Matrix</h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 text-center"><div className="text-2xl font-bold">{coverage}%</div><div className="text-sm text-muted-foreground">Coverage</div></div>
        <div className="border rounded-lg p-4 text-center"><div className="text-2xl font-bold">{epics.length}</div><div className="text-sm text-muted-foreground">Epics</div></div>
        <div className="border rounded-lg p-4 text-center"><div className="text-2xl font-bold">{features.length}</div><div className="text-sm text-muted-foreground">Features</div></div>
        <div className="border rounded-lg p-4 text-center"><div className="text-2xl font-bold">{atoms.length}</div><div className="text-sm text-muted-foreground">Atoms</div></div>
      </div>
      <div className="border rounded-xl p-4 bg-card">
        <p className="text-muted-foreground">Hierarchical trace view: Theme → Epic → Feature → Atoms</p>
      </div>
    </div>
  );
};
