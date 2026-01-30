// ============================================================================
// MOLECULE: AddLinkForm — Form to add new links
// ============================================================================

import React, { useState } from 'react';
import { COLORS } from '../colors';
import { Label } from '../atoms';

interface AddLinkFormProps {
  onAdd: (url: string, title: string) => void;
}

export const AddLinkForm: React.FC<AddLinkFormProps> = ({ onAdd }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  const handleAdd = () => {
    if (!url.trim()) return;
    onAdd(url.trim(), title.trim() || url.trim());
    setUrl('');
    setTitle('');
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-end',
        marginBottom: '24px'
      }}
    >
      {/* URL FIELD */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Label size="md">URL</Label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          style={{
            padding: '12px 14px',
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '10px',
            fontSize: '14px',
            color: COLORS.textPrimary,
            backgroundColor: COLORS.surfaceCard,
            fontFamily: 'inherit',
            outline: 'none'
          }}
        />
      </div>

      {/* TITLE FIELD */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Label size="md">Title (optional)</Label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Link title"
          style={{
            padding: '12px 14px',
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '10px',
            fontSize: '14px',
            color: COLORS.textPrimary,
            backgroundColor: COLORS.surfaceCard,
            fontFamily: 'inherit',
            outline: 'none'
          }}
        />
      </div>

      {/* ADD BUTTON */}
      <button
        onClick={handleAdd}
        style={{
          padding: '12px 20px',
          backgroundColor: COLORS.accent,
          color: '#ffffff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontFamily: 'inherit'
        }}
      >
        Add Link
      </button>
    </div>
  );
};

export default AddLinkForm;
