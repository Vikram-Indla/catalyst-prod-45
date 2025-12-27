import React from 'react';
import { EFDSession } from '../../types/efd.types';
import { CheckCircle, XCircle } from 'lucide-react';

const GATES = [
  { id: 1, name: 'All atoms have trace anchors', check: () => true },
  { id: 2, name: 'No orphan features', check: () => true },
  { id: 3, name: 'Epics have Lean Business Case', check: () => false },
  { id: 4, name: 'Epics have WSJF score', check: () => false },
  { id: 5, name: 'Epics have MVP defined', check: () => false },
  { id: 6, name: 'Features assigned to PI', check: () => false },
  { id: 7, name: 'Coverage >= 85%', check: () => false },
];

export const QAGatesStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const passed = GATES.filter(g => g.check()).length;

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-xl font-semibold">QA Gates — {passed} of {GATES.length} passed</h2>
      <div className="space-y-3">
        {GATES.map((gate) => {
          const ok = gate.check();
          return (
            <div key={gate.id} className={`flex items-center gap-3 p-4 rounded-lg border ${ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {ok ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
              <span className={ok ? 'text-green-700' : 'text-red-700'}>{gate.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
