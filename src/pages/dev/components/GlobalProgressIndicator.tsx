/**
 * Global Progress Indicator
 *
 * Shows progress in top navigation while Evidence-to-Execution is processing.
 * Displays job details on hover.
 */

import React, { useState } from 'react';
import Tooltip from '@atlaskit/tooltip';

interface GlobalProgressIndicatorProps {
  progress: number;
  currentStep?: string;
  itemKey: string;
}

export function GlobalProgressIndicator({
  progress,
  currentStep,
  itemKey,
}: GlobalProgressIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const content = (
    <div style={{ fontSize: 'var(--ds-font-size-200)', maxWidth: 300, padding: 8 }}>
      <div style={{ marginBottom: 8 }}>
        <strong>Preparing Evidence Pack</strong>
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>{itemKey}</strong> — Industrial License Renewal Enhancement
      </div>
      <div style={{ marginBottom: 4 }}>
        <strong>Owner:</strong> Vikram Indla
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Current step:</strong> {currentStep}
      </div>
      <div style={{ marginBottom: 4, color: 'var(--ds-icon-subtle)' }}>
        <strong>Files processed:</strong> 3 PDF
      </div>
      <div style={{ marginBottom: 4, color: 'var(--ds-icon-subtle)' }}>
        <strong>Pages indexed:</strong> 47
      </div>
      <div style={{ marginBottom: 4, color: 'var(--ds-icon-subtle)' }}>
        <strong>Images analyzed:</strong> 1 screenshot
      </div>
      <div style={{ marginBottom: 4, color: 'var(--ds-icon-subtle)' }}>
        <strong>Comments indexed:</strong> 8
      </div>
      <div style={{ marginBottom: 4, color: 'var(--ds-icon-subtle)' }}>
        <strong>Linked items scanned:</strong> 3 (Epic, Feature, Story)
      </div>
      <div style={{ marginBottom: 4, color: 'var(--ds-icon-subtle)' }}>
        <strong>Arabic OCR status:</strong> Complete
      </div>
      <div style={{ marginBottom: 8, color: 'var(--ds-icon-subtle)' }}>
        <strong>Estimated time remaining:</strong> 15 seconds
      </div>
      <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-icon-subtle)' }}>
        <strong>Destination:</strong> Evidence Pack
      </div>
    </div>
  );

  return (
    <div
      style={{
        backgroundColor: 'var(--ds-background-success)',
        borderBottom: '1px solid var(--ds-background-success-bold)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Tooltip content={content} hideTooltipOnClick={false}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            flex: 1,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: 'var(--ds-background-success-bold)',
              animation: 'spin 2s linear infinite',
            }}
          />
          <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-success)', fontWeight: 500 }}>
            Preparing Evidence: {itemKey}
          </span>
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle)' }}>
            {progress}%
          </span>
        </div>
      </Tooltip>

      <div
        style={{
          width: 120,
          height: 4,
          backgroundColor: 'var(--ds-background-information)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            backgroundColor: 'var(--ds-link)',
            width: `${progress}%`,
            transition: 'width 0.3s ease-in-out',
          }}
        />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
