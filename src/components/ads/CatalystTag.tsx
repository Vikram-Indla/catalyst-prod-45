/**
 * CatalystTag — ADS-canonical tag/label component.
 * Replaces hand-rolled label pills in sidebar details + table cells.
 * Uses @atlaskit/tag with Catalyst-specific color presets.
 */
import Tag from '@atlaskit/tag';

export type CatalystTagColor = 'standard' | 'blue' | 'green' | 'teal' | 'purple' | 'red' | 'yellow' | 'grey';

interface CatalystTagProps {
  text: string;
  color?: CatalystTagColor;
  onRemove?: () => void;
  href?: string;
}

export function CatalystTag({ text, color = 'standard', onRemove, href }: CatalystTagProps) {
  return (
    <Tag
      text={text}
      color={color}
      removeButtonLabel={onRemove ? `Remove ${text}` : undefined}
      onAfterRemoveAction={onRemove}
      href={href}
    />
  );
}

interface CatalystTagGroupProps {
  labels: string[];
  color?: CatalystTagColor;
  onRemove?: (label: string) => void;
}

export function CatalystTagGroup({ labels, color = 'standard', onRemove }: CatalystTagGroupProps) {
  return (
    <div role="list" aria-label="Labels" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {labels.map((label) => (
        <CatalystTag
          key={label}
          text={label}
          color={color}
          onRemove={onRemove ? () => onRemove(label) : undefined}
        />
      ))}
    </div>
  );
}
