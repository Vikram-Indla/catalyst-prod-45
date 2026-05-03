import React from 'react';
import Button from '@atlaskit/button';
import { EditIcon, AddIcon } from '@atlaskit/icon';
import type { DescriptionMention } from './description.types';

interface DescriptionViewModeProps {
  value: string;
  mentions: DescriptionMention[];
  onEdit?: () => void;
}

export function DescriptionViewMode({
  value,
  mentions,
  onEdit,
}: DescriptionViewModeProps) {
  if (!value) {
    return (
      <div style={{ padding: '12px 16px', backgroundColor: '#F7F8F9', borderRadius: '4px', border: '1px solid #DFE1E6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: '#626F86' }}>No description provided.</span>
          {onEdit && (
            <Button
              onClick={onEdit}
              iconBefore={<AddIcon label="Add description" />}
              appearance="subtle"
              size="small"
            >
              Add
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px', backgroundColor: '#FFFFFF', borderRadius: '4px', border: '1px solid #DFE1E6' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.5, color: '#161A1D' }}>
          {renderMarkdown(value, mentions)}
        </div>
        {onEdit && (
          <Button
            onClick={onEdit}
            iconBefore={<EditIcon label="Edit description" />}
            appearance="subtle"
            size="small"
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

function renderMarkdown(
  text: string,
  mentions: DescriptionMention[]
): React.ReactNode {
  // Basic markdown rendering: **bold**, _italic_, `code`
  let rendered = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background-color: #F1F2F4; padding: 2px 4px; border-radius: 3px; font-size: 12px;">$1</code>');

  // Render mentions as links/highlights
  mentions.forEach((mention) => {
    if (mention.type === 'url') {
      rendered = rendered.replace(
        mention.reference,
        `<a href="${mention.reference}" target="_blank" rel="noopener noreferrer" style="color: #0052CC; text-decoration: none;">${mention.display}</a>`
      );
    } else if (mention.type === 'user') {
      rendered = rendered.replace(
        mention.display,
        `<span style="color: #0052CC; font-weight: 500;">${mention.display}</span>`
      );
    }
  });

  return <div dangerouslySetInnerHTML={{ __html: rendered }} />;
}
