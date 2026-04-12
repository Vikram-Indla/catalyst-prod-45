/**
 * CANONICAL — Description section for all CatalystView* components.
 * Change here → updates all work item types that use it.
 */
import React from 'react';
import type { PhIssue } from '../types';

interface CatalystDescriptionSectionProps {
  issue: PhIssue | null;
  /** Override the section heading (default: "Description") */
  label?: string;
}

export function CatalystDescriptionSection({ issue, label = 'Description' }: CatalystDescriptionSectionProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#172B4D', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 60 }}>
        {issue?.description_text || (
          <span style={{ color: '#97A0AF', fontStyle: 'italic' }}>Add a description…</span>
        )}
      </div>
    </div>
  );
}
