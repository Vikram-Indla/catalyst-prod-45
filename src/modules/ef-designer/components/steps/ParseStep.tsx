import React from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDAtoms } from '../../hooks/useEFDSession';
import { Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ParseStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: atoms = [], isLoading } = useEFDAtoms(session.id);

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-xl font-semibold">Parse Requirements</h2>
      
      {atoms.length === 0 ? (
        <div className="border rounded-xl p-8 text-center bg-card">
          <Bot className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="font-semibold mb-2">Ready to Parse</h3>
          <p className="text-muted-foreground mb-4">Extract requirement atoms using AI</p>
          <Button><Bot className="h-4 w-4 mr-2" />Extract Requirements</Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Text</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {atoms.map((atom: any) => (
                <tr key={atom.id} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-2 text-sm font-mono">{atom.atom_key}</td>
                  <td className="px-4 py-2 text-sm truncate max-w-md">{atom.text}</td>
                  <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{atom.type}</span></td>
                  <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">{atom.priority}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
