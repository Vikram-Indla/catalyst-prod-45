import React from 'react';
import { GitCompare } from 'lucide-react';

export default function ScenarioCompare() {
  return (
    <div className="ph-page-body">
      <div className="ph-empty">
        <GitCompare className="ph-empty-icon" />
        <h2 className="ph-empty-title">Scenario Compare</h2>
        <p className="ph-empty-text">Compare multiple plan scenarios side by side</p>
        <button className="ph-btn ph-btn-primary">Create Scenario</button>
      </div>
    </div>
  );
}
