import Tag, { type TagColor } from '@atlaskit/tag';
import TagGroup from '@atlaskit/tag-group';
import { token } from '@atlaskit/tokens';

interface TagsCellProps {
  tags: string[];
  maxVisible?: number;
  onTagClick?: (tag: string) => void;
  onAddTag?: () => void;
}

const tagColors: Record<string, TagColor> = {
  'urgent': 'redLight',
  'priority': 'yellowLight',
  'approved': 'greenLight',
  'pending': 'blueLight',
  'review': 'purpleLight',
  'blocked': 'red',
  'in-progress': 'blue',
  'done': 'green',
};

export function TagsCell({ tags, maxVisible = 3, onTagClick, onAddTag }: TagsCellProps) {
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  if (tags.length === 0) {
    return (
      <button
        onClick={onAddTag}
        style={{
          background: 'none',
          border: `1px dashed ${token('color.border', '#DFE1E6')}`,
          borderRadius: '3px',
          padding: `${token('space.025', '2px')} ${token('space.100', '8px')}`,
          fontSize: '12px',
          color: token('color.text.subtle', '#6B778C'),
          cursor: 'pointer',
        }}
      >
        + Add tag
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px') }}>
      <TagGroup>
        {visibleTags.map((tag) => (
          <Tag
            key={tag}
            text={tag}
            color={tagColors[tag.toLowerCase()] || 'standard'}
          />
        ))}
      </TagGroup>
      
      {hiddenCount > 0 && (
        <span style={{
          fontSize: '11px',
          color: token('color.text.subtle', '#6B778C'),
          padding: `${token('space.025', '2px')} ${token('space.050', '4px')}`,
          background: token('color.background.neutral', '#DFE1E6'),
          borderRadius: '3px',
        }}>
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

export default TagsCell;
