// @ts-nocheck
import React from 'react';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button';
import CheckMarkCircleIcon from '@atlaskit/icon/core/check-circle';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import Spinner from '@atlaskit/spinner';
import type { DescriptionMention } from './description.types';

interface DescriptionEditModeProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  charCount: number;
  isNearLimit: boolean;
  error?: string;
  isLoading: boolean;
  mentions: DescriptionMention[];
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export function DescriptionEditMode({
  value,
  onChange,
  placeholder,
  maxLength,
  charCount,
  isNearLimit,
  error,
  isLoading,
  mentions,
  onSave,
  onCancel,
}: DescriptionEditModeProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Textarea using Atlaskit */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={isLoading}
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '12px',
          fontSize: '13px',
          lineHeight: 1.5,
          backgroundColor: 'var(--ds-surface, #FFFFFF)',
          border: error ? '2px solid var(--ds-text-danger, #AE2A19)' : isNearLimit ? '2px solid var(--ds-text-warning, #974F0C)' : '2px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))',
          borderRadius: '4px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
          resize: 'vertical',
          outline: 'none',
          transition: 'border-color 0.15s ease',
          cursor: isLoading ? 'not-allowed' : 'text',
          opacity: isLoading ? 0.6 : 1,
        }}
        aria-label="Description"
        aria-invalid={!!error}
        aria-describedby={error ? 'description-error' : undefined}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--cp-primary-60, #0052CC)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--ds-text-danger, #AE2A19)' : isNearLimit ? 'var(--ds-text-warning, #974F0C)' : 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))';
        }}
      />

      {/* Error Message */}
      {error && (
        <div
          id="description-error"
          style={{
            fontSize: '12px',
            color: 'var(--ds-text-danger, #AE2A19)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          role="alert"
        >
          ⚠️ {error}
        </div>
      )}

      {/* Character Counter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--ds-icon-subtle, #626F86)' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span>
            {charCount} / {maxLength} characters
          </span>
          {isNearLimit && <span style={{ color: 'var(--ds-text-warning, #974F0C)' }}>⚠️ Limit approaching</span>}
          {mentions.length > 0 && <span>• {mentions.length} mention(s) detected</span>}
        </div>
      </div>

      {/* Markdown Hint */}
      <div style={{ fontSize: '12px', color: 'var(--ds-icon-subtle, #626F86)' }}>
        <strong>Formatting:</strong> <code style={{ backgroundColor: 'var(--ds-background-neutral, #F1F2F4)', padding: '2px 4px', borderRadius: '3px' }}>**bold**</code>{' '}
        <code style={{ backgroundColor: 'var(--ds-background-neutral, #F1F2F4)', padding: '2px 4px', borderRadius: '3px' }}>_italic_</code>{' '}
        <code style={{ backgroundColor: 'var(--ds-background-neutral, #F1F2F4)', padding: '2px 4px', borderRadius: '3px' }}>`code`</code> • @mention users and
        paste links
      </div>

      {/* Action Buttons - Atlaskit Buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button
          onClick={onCancel}
          isDisabled={isLoading}
          appearance="subtle"
          size="compact"
        >
          Cancel
        </Button>
        <Button
          onClick={onSave}
          isDisabled={isLoading}
          appearance="primary"
          size="compact"
          iconBefore={isLoading ? <Spinner size="small" /> : <CheckMarkCircleIcon label="Save" />}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
