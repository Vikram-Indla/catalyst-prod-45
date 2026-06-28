/**
 * CreateForm — New issue form with type-specific fields (F1.9)
 *
 * Renders form fields based on issue type.
 * Currently supports common fields: Summary, Description.
 */
import React, { memo, useState } from 'react';

export interface CreateFormData {
  summary: string;
  description: string;
}

export interface CreateFormProps {
  issueType: string;
  onChange?: (data: CreateFormData) => void;
  onSubmit: (data: CreateFormData) => void;
}

export const CreateForm = memo(function CreateForm({
  issueType,
  onChange,
  onSubmit,
}: CreateFormProps) {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');

  const handleSummaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSummary(e.target.value);
    onChange?.({ summary: e.target.value, description });
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setDescription(e.target.value);
    onChange?.({ summary, description: e.target.value });
  };

  const handleSubmit = () => {
    if (!summary.trim()) return;
    onSubmit({ summary, description });
  };

  return (
    <form
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <input
        type="text"
        placeholder="Summary"
        value={summary}
        onChange={handleSummaryChange}
        style={{
          padding: '8px 12px',
          border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))',
          borderRadius: '3px',
          fontSize: '14px',
          fontFamily: 'inherit',
        }}
      />
      <textarea
        placeholder="Description"
        value={description}
        onChange={handleDescriptionChange}
        style={{
          padding: '8px 12px',
          border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))',
          borderRadius: '3px',
          fontSize: '14px',
          minHeight: '100px',
          fontFamily: 'inherit',
          resize: 'vertical',
        }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        style={{
          padding: '8px 12px',
          backgroundColor: 'var(--ds-link, #0C66E4)',
          color: 'var(--ds-text-inverse, #FFFFFF)',
          border: 'none',
          borderRadius: '3px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background-color 150ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--ds-background-brand-bold, #0044A3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--ds-link, #0C66E4)';
        }}
      >
        Create
      </button>
    </form>
  );
});
