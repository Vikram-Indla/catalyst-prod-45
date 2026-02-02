import React from 'react';
import { Layers } from 'lucide-react';

export default function MasterPlan() {
  return (
    <div className="ph-page-body">
      <div className="ph-empty">
        <Layers className="ph-empty-icon" />
        <h2 className="ph-empty-title">Master Plan View</h2>
        <p className="ph-empty-text">Aggregate view of all active plans</p>
        <button className="ph-btn ph-btn-primary">Generate Master View</button>
      </div>
    </div>
  );
}
