/**
 * Card Grid View Component
 * Displays releases as cards in a responsive grid
 */

import React from 'react';
import { Release } from '../types';
import { ReleaseCard } from './ReleaseCard';

interface CardGridViewProps {
  releases: Release[];
  onReleaseClick?: (release: Release) => void;
}

export function CardGridView({ releases, onReleaseClick }: CardGridViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {releases.map((release) => (
        <ReleaseCard
          key={release.id}
          release={release}
          onClick={() => onReleaseClick?.(release)}
        />
      ))}
    </div>
  );
}
