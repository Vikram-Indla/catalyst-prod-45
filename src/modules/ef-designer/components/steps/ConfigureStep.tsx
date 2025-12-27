import React from 'react';
import { EFDSession } from '../../types/efd.types';

export const ConfigureStep: React.FC<{ session: EFDSession }> = ({ session }) => (
  <div className="max-w-4xl space-y-6">
    <h2 className="text-xl font-semibold">Configure</h2>
    <p className="text-muted-foreground">Link to Strategic Theme and Business Request</p>
    <div className="grid md:grid-cols-2 gap-6">
      <div className="border rounded-xl p-6 bg-card">
        <h3 className="font-semibold mb-4">Strategic Theme (Required)</h3>
        <select className="w-full p-2 border rounded-lg"><option>Select a theme...</option></select>
      </div>
      <div className="border rounded-xl p-6 bg-card">
        <h3 className="font-semibold mb-4">Business Request (Optional)</h3>
        <select className="w-full p-2 border rounded-lg"><option>— No Business Request —</option></select>
      </div>
    </div>
  </div>
);
