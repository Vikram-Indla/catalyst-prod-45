import React from 'react';
import { FolderOpen } from 'lucide-react';

interface Props {
  onPlanSelect: (planId: string) => void;
}

export default function PlanLibrary({ onPlanSelect }: Props) {
  return (
    <div className="ph-page-body">
      <div className="ph-empty">
        <FolderOpen className="ph-empty-icon" />
        <h2 className="ph-empty-title">Plan Library</h2>
        <p className="ph-empty-text">Coming in Prompt D.1</p>
      </div>
    </div>
  );
}
