/**
 * Card Grid View — Enhanced with selection support
 * Responsive auto-fill grid (min 380px columns)
 */

import { Release } from '../types';
import { ReleaseCard } from './ReleaseCard';

interface CardGridViewProps {
  releases: Release[];
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  onReleaseClick?: (release: Release) => void;
}

export function CardGridView({ releases, selectedIds, onSelect, onReleaseClick }: CardGridViewProps) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}
    >
      {releases.map((release) => (
        <ReleaseCard
          key={release.id}
          release={release}
          isSelected={selectedIds?.has(release.id) ?? false}
          onSelect={onSelect}
          onClick={() => onReleaseClick?.(release)}
        />
      ))}
    </div>
  );
}
