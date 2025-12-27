import React from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDEpics, useEFDFeatures, useEFDAtoms, useEFDDocuments } from '../../hooks/useEFDSession';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileText, Layers, Box, Atom } from 'lucide-react';

export const PublishStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: docs = [] } = useEFDDocuments(session.id);
  const { data: atoms = [] } = useEFDAtoms(session.id);
  const { data: epics = [] } = useEFDEpics(session.id);
  const { data: features = [] } = useEFDFeatures(session.id);

  const stats = [
    { icon: FileText, label: 'Documents', value: docs.length },
    { icon: Atom, label: 'Atoms', value: atoms.length },
    { icon: Layers, label: 'Epics', value: epics.length },
    { icon: Box, label: 'Features', value: features.length },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-xl font-semibold">Publish</h2>
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="border rounded-lg p-4 text-center bg-card">
            <s.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-xl p-6 text-center bg-card">
          <h3 className="font-semibold mb-2">Download Excel/CSV</h3>
          <p className="text-sm text-muted-foreground mb-4">Export all data locally</p>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Download</Button>
        </div>
        <div className="border rounded-xl p-6 text-center bg-card">
          <h3 className="font-semibold mb-2">Push to Catalyst</h3>
          <p className="text-sm text-muted-foreground mb-4">Create items in Catalyst</p>
          <Button><Upload className="h-4 w-4 mr-2" />Push to Catalyst</Button>
        </div>
      </div>
    </div>
  );
};
