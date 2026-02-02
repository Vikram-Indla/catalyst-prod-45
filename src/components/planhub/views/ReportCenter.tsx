import React from 'react';
import { FileBarChart } from 'lucide-react';

interface Props {
  planId?: string | null;
}

export default function ReportCenter({ planId }: Props) {
  return (
    <div className="ph-page-body">
      <div className="ph-empty">
        <FileBarChart className="ph-empty-icon" />
        <h2 className="ph-empty-title">Report Center</h2>
        <p className="ph-empty-text">Coming in Prompt D.7</p>
      </div>
    </div>
  );
}
