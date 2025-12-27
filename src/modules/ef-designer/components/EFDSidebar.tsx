import React from 'react';
import { EFDSession } from '../types/efd.types';
import { useEFDAtoms, useEFDEpics, useEFDFeatures, useEFDDocuments } from '../hooks/useEFDSession';
import { FileText, Atom, Layers, Box } from 'lucide-react';

interface EFDSidebarProps {
  session: EFDSession;
}

export const EFDSidebar: React.FC<EFDSidebarProps> = ({ session }) => {
  const { data: documents = [] } = useEFDDocuments(session.id);
  const { data: atoms = [] } = useEFDAtoms(session.id);
  const { data: epics = [] } = useEFDEpics(session.id);
  const { data: features = [] } = useEFDFeatures(session.id);

  const stats = [
    { icon: FileText, label: 'Documents', value: documents.length, color: 'text-blue-500' },
    { icon: Atom, label: 'Requirements', value: atoms.length, color: 'text-purple-500' },
    { icon: Layers, label: 'Epics', value: epics.length, color: 'text-violet-500' },
    { icon: Box, label: 'Features', value: features.length, color: 'text-teal-500' },
  ];

  const mappedAtoms = atoms.filter(a => a.status === 'mapped').length;
  const selectedEpics = epics.filter(e => e.is_selected_for_features).length;

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Session Summary</h3>
        <div className="space-y-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between p-2 rounded-lg bg-background">
              <div className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-sm">{stat.label}</span>
              </div>
              <span className="font-medium">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {atoms.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Mapping Progress</h4>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all"
              style={{ width: `${atoms.length > 0 ? (mappedAtoms / atoms.length) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {mappedAtoms} of {atoms.length} mapped
          </p>
        </div>
      )}

      {epics.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Selected Epics</h4>
          <p className="text-sm text-muted-foreground">
            {selectedEpics} of {epics.length} selected for feature generation
          </p>
        </div>
      )}

      {session.theme_id && (
        <div>
          <h4 className="text-sm font-medium mb-2">Linked Theme</h4>
          <div className="p-2 rounded-lg bg-violet-50 border border-violet-200">
            <p className="text-sm text-violet-700">Theme linked</p>
          </div>
        </div>
      )}
    </div>
  );
};
