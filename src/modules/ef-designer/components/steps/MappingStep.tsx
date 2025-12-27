import React from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDAtoms } from '../../hooks/useEFDSession';

export const MappingStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: atoms = [] } = useEFDAtoms(session.id);
  const unmapped = atoms.filter((a: any) => a.status === 'unmapped').length;

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-xl font-semibold">Map Atoms to Features</h2>
      {unmapped > 0 && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">{unmapped} atoms still unmapped</div>}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted"><tr><th className="px-4 py-2 text-left text-sm">ID</th><th className="px-4 py-2 text-left text-sm">Text</th><th className="px-4 py-2 text-left text-sm">Feature</th></tr></thead>
          <tbody>
            {atoms.map((a: any) => (
              <tr key={a.id} className="border-t hover:bg-muted/50">
                <td className="px-4 py-2 font-mono text-sm">{a.atom_key}</td>
                <td className="px-4 py-2 text-sm truncate max-w-md">{a.text}</td>
                <td className="px-4 py-2"><span className="text-muted-foreground text-sm">{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
