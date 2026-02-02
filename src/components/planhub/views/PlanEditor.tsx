import React from 'react';
import { FileEdit } from 'lucide-react';
import type { FeatureSettings } from '@/types/planhub.types';

interface Props {
  planId: string;
  onBack: () => void;
  features?: FeatureSettings | null;
}

export default function PlanEditor({ planId, onBack, features }: Props) {
  return (
    <div className="ph-page-body">
      <div className="ph-empty">
        <FileEdit className="ph-empty-icon" />
        <h2 className="ph-empty-title">Plan Editor</h2>
        <p className="ph-empty-text">Coming in Prompt D.2</p>
        <button onClick={onBack} className="ph-btn ph-btn-secondary">
          Back to Library
        </button>
      </div>
    </div>
  );
}
