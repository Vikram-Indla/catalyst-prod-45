import React from 'react';
import { Pencil, Plus } from 'lucide-react';
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
      <div className="p-4 bg-neutral-50 rounded-md border border-neutral-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            No description provided.
          </p>
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
              aria-label="Add description"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-md border border-neutral-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 prose prose-sm max-w-none">
          {renderMarkdown(value, mentions)}
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded transition-colors flex-shrink-0"
            aria-label="Edit description"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
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
    .replace(/`([^`]+)`/g, '<code class="bg-neutral-100 px-1 rounded text-sm">$1</code>');

  // Render mentions as links/highlights
  mentions.forEach((mention) => {
    if (mention.type === 'url') {
      rendered = rendered.replace(
        mention.reference,
        `<a href="${mention.reference}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${mention.display}</a>`
      );
    } else if (mention.type === 'user') {
      rendered = rendered.replace(
        mention.display,
        `<span class="text-blue-600 font-medium">${mention.display}</span>`
      );
    }
  });

  return <div dangerouslySetInnerHTML={{ __html: rendered }} />;
}
