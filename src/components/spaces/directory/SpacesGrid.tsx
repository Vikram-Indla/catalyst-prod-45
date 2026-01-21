// ════════════════════════════════════════════════════════════════════════════
// SPACES GRID VIEW
// ════════════════════════════════════════════════════════════════════════════

import { SpaceCard } from './SpaceCard';
import type { SpaceWithStats } from '@/types/spaces';

interface SpacesGridProps {
  spaces: SpaceWithStats[];
}

export function SpacesGrid({ spaces }: SpacesGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {spaces.map((space) => (
        <SpaceCard key={space.id} space={space} />
      ))}
    </div>
  );
}
