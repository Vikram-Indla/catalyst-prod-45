/**
 * CatalystTag — ADS-canonical tag/label component.
 * Replaces hand-rolled label pills in sidebar details + table cells.
 * Uses @atlaskit/tag with Catalyst-specific color presets.
 */
import Tag, { SimpleTag } from '@atlaskit/tag';

export type CatalystTagColor = 'standard' | 'blue' | 'green' | 'teal' | 'purple' | 'red' | 'yellow' | 'grey';

interface CatalystTagProps {
  text: string;
  color?: CatalystTagColor;
  onRemove?: () => void;
  href?: string;
}

export function CatalystTag({ text, color = 'standard', onRemove, href }: CatalystTagProps) {
  // Atlaskit's removable Tag always renders the × affordance — a read-only
  // label must use SimpleTag or it advertises a remove that does nothing (H5).
  if (!onRemove) {
    return <SimpleTag text={text} color={color} href={href} />;
  }
  return (
    <Tag
      text={text}
      color={color}
      removeButtonLabel={`Remove ${text}`}
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
