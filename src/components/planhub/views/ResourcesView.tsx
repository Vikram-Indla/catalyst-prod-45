import React from 'react';
import { Users } from 'lucide-react';

interface Props {
  planId?: string | null;
}

export default function ResourcesView({ planId }: Props) {
  return (
    <div className="ph-page-body">
      <div className="ph-empty">
        <Users className="ph-empty-icon" />
        <h2 className="ph-empty-title">Resources View</h2>
        <p className="ph-empty-text">Coming in Prompt D.6</p>
      </div>
    </div>
  );
}
